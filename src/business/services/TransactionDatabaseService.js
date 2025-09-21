/**
 * 取引履歴データベース管理サービス
 * @description 全取引データの統合・フィルタリング・検索機能を提供
 */
class TransactionDatabaseService {
    constructor(dataStoreManager) {
        this.dataStoreManager = dataStoreManager;
        this.transactionCache = new Map();
        this.cacheTimestamp = null;
        this.cacheExpiration = 5 * 60 * 1000; // 5分間キャッシュ
    }

    /**
     * 全取引データを統合取得
     * @returns {Array<Object>} 統合された取引データ
     * @example
     * // 返却データ形式
     * [
     *   {
     *     id: "unique_id",
     *     date: "2025-09-01",
     *     name: "Apple Inc.",
     *     type: "stock",
     *     quantity: 100,
     *     unitPrice: 150.25,
     *     amount: 15025,
     *     region: "US",
     *     currency: "USD"
     *   }
     * ]
     */
    getAllTransactions() {
        try {
            // キャッシュチェック
            if (this.isCacheValid()) {
                return Array.from(this.transactionCache.values());
            }

            // v3: canonical transactions をDataStoreから直接読み込み
            const rows = this.dataStoreManager.load('investment-transactions') || [];
            const transactions = rows.map((e) => this.mapEntityToLegacyDto(e));

            // 日付順にソート（最新が先頭）
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            // キャッシュに保存
            this.updateCache(transactions);

            return transactions;

        } catch (error) {
            console.error('[TransactionDatabaseService.js] getAllTransactions エラー:', error?.message || error);
            return [];
        }
    }

    /**
     * v3エンティティ → 旧テーブルDTOへ射影
     */
    mapEntityToLegacyDto(e) {
        const typeMap = (sub) => {
            if (sub === 'jp_equity' || sub === 'us_equity') return 'stock';
            if (sub === 'mutual_fund') return 'mutualFund';
            return 'other';
        };
        const regionFromSubtype = (sub) => {
            if (sub === 'jp_equity') return 'JP';
            if (sub === 'us_equity') return 'US';
            if (sub === 'mutual_fund') return 'JP';
            return 'OTHER';
        };
        const upper = (s) => (s || '').toString().toUpperCase();
        const normNumber = (v) => {
            const n = typeof v === 'number' ? v : parseFloat(v || 0);
            return Number.isNaN(n) ? 0 : n;
        };
        const marketFromSubtype = (sub) => {
            if (sub === 'jp_equity') return 'JP';
            if (sub === 'us_equity') return 'US';
            if (sub === 'mutual_fund') return 'FUND';
            return 'OTHER';
        };
        return {
            id: e.fingerprint || `${e.source}-${e.tradeDate}-${e.name}`,
            date: this.formatDate(e.tradeDate || e.settleDate || new Date().toISOString()),
            name: (e.name || e.symbol || '-'),
            ticker: upper(e.symbol || ''),
            type: typeMap(e.subtype),
            quantity: normNumber(e.quantity),
            unitPrice: normNumber(e.price),
            amount: Math.abs(normNumber(e.settledAmount)),
            region: regionFromSubtype(e.subtype),
            currency: upper(e.settledCurrency || e.currency || 'JPY'),
            account: e.accountType || '',
            sector: e.sector || '',
            market: marketFromSubtype(e.subtype),
            side: (e.tradeType || '').toLowerCase(),
            source: e.source || 'rakuten'
        };
    }

    /**
     * フィルタリング処理
     * @param {Array} transactions - 元の取引データ
     * @param {Object} filters - フィルター条件
     * @param {string} searchKeyword - 検索キーワード
     * @returns {Array} フィルタリング済みデータ
     * @example
     * // フィルター例
     * const filtered = service.applyFilters(transactions, {
     *   type: 'stock',
     *   region: 'US',
     *   currency: 'USD'
     * }, 'Apple');
     */
    applyFilters(transactions, filters = {}, searchKeyword = '') {
        if (!Array.isArray(transactions)) {
            return [];
        }

        let filtered = [...transactions];

        try {
            // 種別フィルター
            if (filters.type && filters.type !== '') {
                filtered = filtered.filter(t => t.type === filters.type);
            }

            // 地域フィルター
            if (filters.region && filters.region !== '') {
                filtered = filtered.filter(t => t.region === filters.region);
            }

            // 通貨フィルター
            if (filters.currency && filters.currency !== '') {
                filtered = filtered.filter(t => t.currency === filters.currency);
            }

            // キーワード検索（銘柄名・ティッカー・セクター）
            if (searchKeyword && searchKeyword.trim() !== '') {
                const keyword = searchKeyword.toLowerCase();
                filtered = filtered.filter(t => {
                    const nameMatch = t.name && t.name.toLowerCase().includes(keyword);
                    const tickerMatch = t.ticker && t.ticker.toLowerCase().includes(keyword);
                    const sectorMatch = t.sector && t.sector.toLowerCase().includes(keyword);
                    
                    return nameMatch || tickerMatch || sectorMatch;
                });
            }

            return filtered;

        } catch (error) {
            console.error('Failed to apply filters:', error);
            return transactions; // フィルタリングに失敗した場合は元データを返す
        }
    }

    /**
     * 表示制限（最新N件）
     * @param {Array} transactions - 取引データ
     * @param {number} limit - 表示件数制限
     * @returns {Array} 表示用に制限されたデータ
     */
    limitForDisplay(transactions, limit = 50) {
        if (!Array.isArray(transactions)) {
            return [];
        }

        return transactions.slice(0, limit);
    }

    /**
     * 取引データの統計情報を取得
     * @param {Array} transactions - 取引データ
     * @returns {Object} 統計情報
     */
    getTransactionStats(transactions) {
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return {
                total: 0,
                byType: {},
                byRegion: {},
                byCurrency: {},
                totalAmount: 0
            };
        }

        const stats = {
            total: transactions.length,
            byType: {},
            byRegion: {},
            byCurrency: {},
            totalAmount: 0
        };

        transactions.forEach(transaction => {
            // 種別別集計
            stats.byType[transaction.type] = (stats.byType[transaction.type] || 0) + 1;
            
            // 地域別集計
            stats.byRegion[transaction.region] = (stats.byRegion[transaction.region] || 0) + 1;
            
            // 通貨別集計
            stats.byCurrency[transaction.currency] = (stats.byCurrency[transaction.currency] || 0) + 1;
            
            // 総金額（円換算で概算）
            if (transaction.amount) {
                let amountInJPY = transaction.amount;
                if (transaction.currency === 'USD') {
                    amountInJPY = transaction.amount * 150; // 簡易USD→JPY換算
                }
                stats.totalAmount += amountInJPY;
            }
        });

        return stats;
    }

    /**
     * 特定IDの取引詳細を取得
     * @param {string} transactionId - 取引ID
     * @returns {Object|null} 取引詳細データ
     */
    getTransactionById(transactionId) {
        try {
            const transactions = this.getAllTransactions();
            return transactions.find(t => t.id === transactionId) || null;
        } catch (error) {
            console.error('Failed to get transaction by ID:', error);
            return null;
        }
    }

    /**
     * 日付範囲でフィルタリング
     * @param {Array} transactions - 取引データ
     * @param {string} startDate - 開始日（YYYY-MM-DD）
     * @param {string} endDate - 終了日（YYYY-MM-DD）
     * @returns {Array} 日付範囲内の取引データ
     */
    filterByDateRange(transactions, startDate, endDate) {
        if (!Array.isArray(transactions)) {
            return [];
        }

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return transactions.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= start && transactionDate <= end;
            });

        } catch (error) {
            console.error('Failed to filter by date range:', error);
            return transactions;
        }
    }

    /**
     * CSV形式でエクスポート
     * @param {Array} transactions - 取引データ
     * @returns {string} CSV形式の文字列
     */
    exportToCsv(transactions) {
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return '';
        }

        try {
            // CSVヘッダー
            const headers = [
                '日付',
                '銘柄名',
                'ティッカー',
                '種別',
                '数量',
                '単価',
                '金額',
                '地域',
                '通貨',
                'セクター',
                '口座',
                'ソース'
            ];

            // CSVデータ行
            const rows = transactions.map(t => [
                t.date,
                `"${t.name}"`,
                t.ticker || '',
                t.type,
                t.quantity || '',
                t.unitPrice || '',
                t.amount,
                t.region,
                t.currency,
                t.sector || '',
                t.account || '',
                t.source || ''
            ]);

            // CSV文字列として結合
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            return csvContent;

        } catch (error) {
            console.error('Failed to export to CSV:', error);
            return '';
        }
    }

    /**
     * 日付フォーマット
     * @param {string} dateString - 日付文字列
     * @returns {string} フォーマットされた日付
     * @private
     */
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD形式
        } catch (error) {
            console.error('Failed to format date:', error);
            return new Date().toISOString().split('T')[0];
        }
    }

    /**
     * キャッシュの有効性をチェック
     * @returns {boolean} キャッシュが有効かどうか
     * @private
     */
    isCacheValid() {
        if (!this.cacheTimestamp || this.transactionCache.size === 0) {
            return false;
        }

        const now = Date.now();
        return (now - this.cacheTimestamp) < this.cacheExpiration;
    }

    /**
     * キャッシュを更新
     * @param {Array} transactions - 取引データ
     * @private
     */
    updateCache(transactions) {
        this.transactionCache.clear();
        
        transactions.forEach(transaction => {
            this.transactionCache.set(transaction.id, transaction);
        });
        
        this.cacheTimestamp = Date.now();
    }

    /**
     * キャッシュをクリア
     * @public
     */
    clearCache() {
        this.transactionCache.clear();
        this.cacheTimestamp = null;
        console.log('Transaction cache cleared');
    }

    /**
     * サービスの状態情報を取得
     * @returns {Object} サービス状態
     */
    getServiceStatus() {
        const transactions = this.getAllTransactions();
        const stats = this.getTransactionStats(transactions);
        
        return {
            isInitialized: true,
            cacheSize: this.transactionCache.size,
            cacheExpiration: this.cacheExpiration,
            lastCacheUpdate: this.cacheTimestamp ? new Date(this.cacheTimestamp).toISOString() : null,
            transactionCount: stats.total,
            statistics: stats
        };
    }
}

// グローバルエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionDatabaseService;
} else if (typeof window !== 'undefined') {
    window.TransactionDatabaseService = TransactionDatabaseService;
}
