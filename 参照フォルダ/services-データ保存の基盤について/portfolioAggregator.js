/**
 * ポートフォリオ集約サービス
 * 楽天証券CSV取引履歴を銘柄ごとに集約し、実際の保有状況を計算
 */

class PortfolioAggregator {
    constructor() {
        this.debugMode = true;
    }

    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[PortfolioAggregator] ${message}`, data || '');
        }
    }

    /**
     * 個別株データを銘柄ごとに集約
     * @param {Array} stocksData - dataManager.getStocks()から取得したデータ
     * @returns {Array} 集約された株式ポートフォリオ
     */
    aggregateStocksByTicker(stocksData) {
        this.debugLog('=== 株式データ集約開始 ===');
        this.debugLog('対象データ件数:', stocksData.length);

        const aggregatedStocks = new Map();

        for (const stock of stocksData) {
            const key = this.generateStockKey(stock);
            
            if (aggregatedStocks.has(key)) {
                // 既存データに追加
                const existing = aggregatedStocks.get(key);
                this.mergeStockData(existing, stock);
            } else {
                // 新規データとして追加
                aggregatedStocks.set(key, this.createAggregatedStock(stock));
            }
        }

        const result = Array.from(aggregatedStocks.values());
        this.debugLog('集約完了 - 銘柄数:', result.length);
        
        return result;
    }

    /**
     * 株式の識別キーを生成
     * @param {Object} stock - 株式データ
     * @returns {string} 識別キー
     */
    generateStockKey(stock) {
        if (stock.region === 'JP') {
            // 日本株：銘柄コード + 市場を使用
            return `JP_${stock.code}_${stock.market}`;
        } else if (stock.region === 'US') {
            // 米国株：ティッカーシンボルを使用
            return `US_${stock.ticker}`;
        } else {
            // その他：銘柄名を使用
            return `OTHER_${stock.name}`;
        }
    }

    /**
     * 集約用の株式データ構造を作成
     * @param {Object} stock - 元の株式データ
     * @returns {Object} 集約用データ構造
     */
    createAggregatedStock(stock) {
        const aggregated = {
            // 基本情報
            key: this.generateStockKey(stock),
            name: stock.name,
            code: stock.code || '',
            ticker: stock.ticker || '',
            market: stock.market || '',
            region: stock.region,
            currency: stock.currency,
            
            // 集約データ
            totalQuantity: 0,
            totalInvestment: 0,     // 総投資額（売買相殺後）
            currentValue: 0,        // 現在価値（最新単価×保有量）※将来の外部API用
            investmentValue: 0,     // 投資価格（平均取得単価×保有量）※現在利用可能
            transactions: [],       // 取引履歴
            
            // メタデータ
            firstTradeDate: stock.date,
            lastTradeDate: stock.date,
            accountTypes: new Set(),
            
            // セクター情報（後で追加）
            sector: null,
            subSector: null,
            
            // 統計情報
            totalBuyQuantity: 0,
            totalSellQuantity: 0,
            totalBuyAmount: 0,
            totalSellAmount: 0,
            
            // 元データ参照
            originalIds: []
        };

        // 最初の取引データをマージ
        this.mergeStockData(aggregated, stock);
        
        return aggregated;
    }

    /**
     * 既存の集約データに新しい取引を追加
     * @param {Object} existing - 既存の集約データ
     * @param {Object} newStock - 新しい取引データ
     */
    mergeStockData(existing, newStock) {
        // 取引履歴に追加
        existing.transactions.push({
            id: newStock.id,
            date: newStock.date,
            tradeType: newStock.tradeType,
            quantity: newStock.quantity,
            unitPrice: newStock.unitPrice,
            amount: newStock.amount,
            account: newStock.account
        });

        // 売買区分による処理（デバッグログ付き）
        this.debugLog(`📊 取引処理: ${existing.name}`, {
            tradeType: newStock.tradeType,
            quantity: newStock.quantity,
            amount: newStock.amount,
            date: newStock.date
        });
        
        if (newStock.tradeType === 'buy') {
            existing.totalBuyQuantity += newStock.quantity;
            existing.totalBuyAmount += newStock.amount;
            this.debugLog(`✅ 買付処理完了: ${existing.name}`);
        } else if (newStock.tradeType === 'sell') {
            existing.totalSellQuantity += newStock.quantity;
            existing.totalSellAmount += newStock.amount;
            this.debugLog(`✅ 売却処理完了: ${existing.name}`);
        } else {
            this.debugLog(`⚠️ 不明な売買区分: ${existing.name} - ${newStock.tradeType}`);
        }

        // 純保有数量の計算
        existing.totalQuantity = existing.totalBuyQuantity - existing.totalSellQuantity;

        // 総投資額（売却分を除く）
        existing.totalInvestment = existing.totalBuyAmount - existing.totalSellAmount;

        // 価値計算（2つの方式）
        if (existing.totalQuantity > 0) {
            // 平均取得単価計算
            const averageAcquisitionCost = existing.totalBuyAmount > 0 ? 
                existing.totalBuyAmount / existing.totalBuyQuantity : 0;
            
            // 投資価格（現在利用可能）：平均取得単価 × 現在保有数量
            existing.investmentValue = averageAcquisitionCost * existing.totalQuantity;
            
            // 現在価値（将来の外部API用）：最新単価 × 現在保有数量
            // ※現在は最新単価取得API未実装のため、投資価格と同じ値を仮設定
            // TODO: 外部API実装時に修正予定
            const latestPrice = newStock.unitPrice || 0; // 最後の取引単価を仮使用
            existing.currentValue = latestPrice > 0 ? latestPrice * existing.totalQuantity : existing.investmentValue;
            
        } else {
            // 売却済みの場合は両方とも0
            existing.investmentValue = 0;
            existing.currentValue = 0;
        }

        // 日付範囲の更新
        if (newStock.date < existing.firstTradeDate) {
            existing.firstTradeDate = newStock.date;
        }
        if (newStock.date > existing.lastTradeDate) {
            existing.lastTradeDate = newStock.date;
        }

        // 口座区分の追加
        if (newStock.account) {
            existing.accountTypes.add(newStock.account);
        }

        // 元データIDの追加
        existing.originalIds.push(newStock.id);
    }

    /**
     * 実際の保有銘柄のみを抽出（売却済みを除外）
     * @param {Array} aggregatedStocks - 集約済み株式データ
     * @returns {Array} 実保有銘柄のみ
     */
    getActualHoldings(aggregatedStocks) {
        this.debugLog('=== 実保有銘柄抽出開始 ===');
        this.debugLog('集約済み銘柄数:', aggregatedStocks.length);
        
        const actualHoldings = aggregatedStocks.filter(stock => {
            const hasHoldings = stock.totalQuantity > 0;
            const hasInvestmentValue = stock.investmentValue > 0;
            
            // 詳細ログ出力
            this.debugLog(`🔍 ${stock.name}:`, {
                totalQuantity: stock.totalQuantity,
                currentValue: stock.currentValue,
                investmentValue: stock.investmentValue,
                totalBuyQuantity: stock.totalBuyQuantity,
                totalSellQuantity: stock.totalSellQuantity,
                totalBuyAmount: stock.totalBuyAmount,
                totalSellAmount: stock.totalSellAmount,
                totalInvestment: stock.totalInvestment,
                transactionCount: stock.transactions.length,
                hasHoldings: hasHoldings,
                hasInvestmentValue: hasInvestmentValue,
                willBeIncluded: hasHoldings && hasInvestmentValue
            });
            
            // 保有数量があり、投資価格がある銘柄を含める
            return hasHoldings && hasInvestmentValue;
        });

        this.debugLog('実保有銘柄数:', actualHoldings.length);
        return actualHoldings;
    }

    /**
     * ポートフォリオサマリーを生成
     * @param {Array} actualHoldings - 実保有銘柄データ
     * @returns {Object} ポートフォリオサマリー
     */
    generatePortfolioSummary(actualHoldings) {
        const summary = {
            totalHoldings: actualHoldings.length,
            totalValue: 0,              // 現在価値合計（将来の外部API用）
            totalInvestmentValue: 0,    // 投資価格合計（現在利用可能）
            totalInvestment: 0,         // 総投資額（売買相殺後）
            unrealizedGainLoss: 0,
            regions: {},
            currencies: {},
            accounts: {},
            topHoldings: []
        };

        for (const holding of actualHoldings) {
            // 総計算
            summary.totalValue += holding.currentValue;
            summary.totalInvestmentValue += holding.investmentValue;
            summary.totalInvestment += holding.totalInvestment;

            // 地域別集計（投資価格を使用）
            if (!summary.regions[holding.region]) {
                summary.regions[holding.region] = { count: 0, value: 0 };
            }
            summary.regions[holding.region].count++;
            summary.regions[holding.region].value += holding.investmentValue;

            // 通貨別集計（投資価格を使用）
            if (!summary.currencies[holding.currency]) {
                summary.currencies[holding.currency] = { count: 0, value: 0 };
            }
            summary.currencies[holding.currency].count++;
            summary.currencies[holding.currency].value += holding.investmentValue;

            // 口座別集計（投資価格を使用）
            for (const account of holding.accountTypes) {
                if (!summary.accounts[account]) {
                    summary.accounts[account] = { count: 0, value: 0 };
                }
                summary.accounts[account].count++;
                summary.accounts[account].value += holding.investmentValue;
            }
        }

        // 未実現損益（現在価値 - 投資価格）
        summary.unrealizedGainLoss = summary.totalValue - summary.totalInvestmentValue;

        // 上位保有銘柄（投資価格順）
        summary.topHoldings = actualHoldings
            .sort((a, b) => b.investmentValue - a.investmentValue)
            .slice(0, 10)
            .map(holding => ({
                name: holding.name,
                ticker: holding.ticker || holding.code,
                region: holding.region,
                currentValue: holding.currentValue,      // 現在価値（将来のAPI用）
                investmentValue: holding.investmentValue, // 投資価格（現在利用可能）
                percentage: (holding.investmentValue / summary.totalInvestmentValue) * 100
            }));

        this.debugLog('ポートフォリオサマリー生成完了:', summary);
        return summary;
    }

    /**
     * データマネージャーと連携してポートフォリオ分析を実行
     * @param {Object} dataManager - データマネージャーインスタンス
     * @returns {Object} 完全なポートフォリオ分析結果
     */
    async analyzePortfolio(dataManager) {
        try {
            this.debugLog('=== ポートフォリオ分析開始 ===');

            // 1. 個別株データ取得
            const stocksData = dataManager.getStocks();
            this.debugLog('個別株データ取得完了:', stocksData.length);

            // ★ ここで新形式かどうか確認
            if (stocksData.length > 0) {
                this.debugLog('サンプルデータ:', stocksData[0]);
                // 新形式チェック
                const hasTradeType = 'tradeType' in stocksData[0];
                const hasDate = 'date' in stocksData[0];
                this.debugLog(`新形式フィールド tradeType: ${hasTradeType}, date: ${hasDate}`);
            }

            // 2. 銘柄ごとに集約
            const aggregatedStocks = this.aggregateStocksByTicker(stocksData);

            // 3. 実保有銘柄抽出
            const actualHoldings = this.getActualHoldings(aggregatedStocks);

            // 4. サマリー生成
            const summary = this.generatePortfolioSummary(actualHoldings);

            const result = {
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    aggregatedStocks,
                    actualHoldings,
                    summary
                }
            };

            this.debugLog('✅ ポートフォリオ分析完了');
            return result;

        } catch (error) {
            this.debugLog('❌ ポートフォリオ分析エラー:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * デバッグモードの切り替え
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.debugLog('デバッグモード変更:', enabled ? 'ON' : 'OFF');
    }
}

// グローバルインスタンス作成
const portfolioAggregator = new PortfolioAggregator();

// windowオブジェクトにも追加
if (typeof window !== 'undefined') {
    window.portfolioAggregator = portfolioAggregator;
    console.log('✅ ポートフォリオ集約サービスが利用可能です');
}