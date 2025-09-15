/**
 * 銘柄情報データベース管理サービス
 * @description 銘柄別統合管理・セクター編集・パフォーマンス分析
 */
class AssetDatabaseService {
    constructor(dataStoreManager, sectorService = null) {
        this.dataStoreManager = dataStoreManager;
        this.sectorService = sectorService;
        this.summaryCache = new Map();
        this.cacheTimestamp = null;
        this.cacheExpiration = 10 * 60 * 1000; // 10分間キャッシュ
    }

    /**
     * 銘柄別統合サマリー生成
     * @returns {Array<Object>} 銘柄別統合データ
     * @example
     * // 返却データ形式
     * [
     *   {
     *     ticker: "AAPL",
     *     name: "Apple Inc.",
     *     totalQuantity: 300,
     *     averagePrice: 148.25,
     *     totalInvestment: 44475,
     *     currentValue: 52500,
     *     unrealizedGain: 8025,
     *     gainPercent: 18.05,
     *     sector: "テクノロジー",
     *     region: "US",
     *     transactions: 3,
     *     lastUpdated: "2025-09-15T10:30:00Z"
     *   }
     * ]
     */
    generateAssetSummaries() {
        try {
            // キャッシュチェック
            if (this.isCacheValid()) {
                return Array.from(this.summaryCache.values());
            }

            const summaries = [];
            const allAssets = this.dataStoreManager.getAllAssets();

            // 個別株の統合処理
            if (allAssets.stocks && allAssets.stocks.length > 0) {
                const stockGroups = this.groupStocksByTicker(allAssets.stocks);
                
                Object.entries(stockGroups).forEach(([ticker, stocks]) => {
                    const summary = this.calculateStockSummary(stocks);
                    if (summary) {
                        summaries.push(summary);
                    }
                });
            }

            // 投資信託の個別管理
            if (allAssets.mutualFunds && allAssets.mutualFunds.length > 0) {
                allAssets.mutualFunds.forEach(mf => {
                    const summary = this.calculateMutualFundSummary(mf);
                    if (summary) {
                        summaries.push(summary);
                    }
                });
            }

            // 仮想通貨の個別管理
            if (allAssets.cryptoAssets && allAssets.cryptoAssets.length > 0) {
                allAssets.cryptoAssets.forEach(crypto => {
                    const summary = this.calculateCryptoSummary(crypto);
                    if (summary) {
                        summaries.push(summary);
                    }
                });
            }

            // 総投資額順にソート
            summaries.sort((a, b) => b.totalInvestment - a.totalInvestment);

            // キャッシュに保存
            this.updateCache(summaries);

            return summaries;

        } catch (error) {
            console.error('Failed to generate asset summaries:', error);
            return [];
        }
    }

    /**
     * ティッカー別株式グループ化
     * @param {Array} stocks - 個別株データ
     * @returns {Object} ティッカー別グループ
     * @private
     */
    groupStocksByTicker(stocks) {
        const groups = {};
        
        stocks.forEach(stock => {
            const key = stock.ticker || stock.code || stock.name;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(stock);
        });
        
        return groups;
    }

    /**
     * 株式サマリー計算
     * @param {Array} stocks - 同一銘柄の株式データ
     * @returns {Object} 統合サマリー
     * @private
     */
    calculateStockSummary(stocks) {
        if (!Array.isArray(stocks) || stocks.length === 0) {
            return null;
        }

        try {
            let totalQuantity = 0;
            let totalInvestment = 0;
            let weightedPriceSum = 0;

            stocks.forEach(stock => {
                const quantity = parseFloat(stock.quantity) || 0;
                const unitPrice = parseFloat(stock.unitPrice) || 0;
                const amount = parseFloat(stock.amount) || 0;

                totalQuantity += quantity;
                totalInvestment += amount;
                weightedPriceSum += unitPrice * quantity;
            });

            const averagePrice = totalQuantity > 0 ? weightedPriceSum / totalQuantity : 0;
            const representative = stocks[0]; // 代表データ

            // 簡易的な評価額計算（実際は現在価格が必要）
            const currentValue = totalInvestment * (1 + (Math.random() - 0.5) * 0.2); // ±10%のランダム変動
            const unrealizedGain = currentValue - totalInvestment;
            const gainPercent = totalInvestment > 0 ? (unrealizedGain / totalInvestment) * 100 : 0;

            return {
                id: representative.id,
                ticker: representative.ticker || representative.code || representative.name,
                name: representative.name,
                type: 'stock',
                totalQuantity: totalQuantity,
                averagePrice: averagePrice,
                totalInvestment: totalInvestment,
                currentValue: currentValue,
                unrealizedGain: unrealizedGain,
                gainPercent: gainPercent,
                sector: representative.sector || 'その他',
                region: representative.region || 'JP',
                currency: representative.settlementCurrency || 'JPY',
                market: representative.market || '',
                account: representative.account || '',
                transactions: stocks.length,
                lastUpdated: representative.updatedAt || representative.createdAt || new Date().toISOString(),
                details: stocks, // 詳細データ保持
                customTags: this.extractCustomTags(stocks)
            };

        } catch (error) {
            console.error('Failed to calculate stock summary:', error);
            return null;
        }
    }

    /**
     * 投資信託サマリー計算
     * @param {Object} mutualFund - 投資信託データ
     * @returns {Object} 投資信託サマリー
     * @private
     */
    calculateMutualFundSummary(mutualFund) {
        try {
            const amount = parseFloat(mutualFund.amount) || 0;
            
            // 簡易的な評価額計算
            const currentValue = amount * (1 + (Math.random() - 0.4) * 0.15); // ±7.5%のランダム変動
            const unrealizedGain = currentValue - amount;
            const gainPercent = amount > 0 ? (unrealizedGain / amount) * 100 : 0;

            return {
                id: mutualFund.id,
                ticker: this.generateMutualFundTicker(mutualFund.name),
                name: mutualFund.name,
                type: 'mutualFund',
                totalQuantity: '-',
                averagePrice: '-',
                totalInvestment: amount,
                currentValue: currentValue,
                unrealizedGain: unrealizedGain,
                gainPercent: gainPercent,
                sector: '投資信託',
                region: 'JP',
                currency: 'JPY',
                market: '投信',
                account: '特定',
                transactions: 1,
                monthlyAmount: mutualFund.monthlyAmount || null,
                lastUpdated: mutualFund.updatedAt || mutualFund.createdAt || new Date().toISOString(),
                details: [mutualFund],
                customTags: mutualFund.customTags || []
            };

        } catch (error) {
            console.error('Failed to calculate mutual fund summary:', error);
            return null;
        }
    }

    /**
     * 仮想通貨サマリー計算
     * @param {Object} crypto - 仮想通貨データ
     * @returns {Object} 仮想通貨サマリー
     * @private
     */
    calculateCryptoSummary(crypto) {
        try {
            const amount = parseFloat(crypto.amount) || 0;
            
            // 簡易的な評価額計算（仮想通貨は変動が大きいため）
            const currentValue = amount * (1 + (Math.random() - 0.5) * 0.5); // ±25%のランダム変動
            const unrealizedGain = currentValue - amount;
            const gainPercent = amount > 0 ? (unrealizedGain / amount) * 100 : 0;

            return {
                id: crypto.id,
                ticker: crypto.symbol || crypto.name,
                name: crypto.name,
                type: 'crypto',
                totalQuantity: parseFloat(crypto.quantity) || 0,
                averagePrice: parseFloat(crypto.unitPrice) || 0,
                totalInvestment: amount,
                currentValue: currentValue,
                unrealizedGain: unrealizedGain,
                gainPercent: gainPercent,
                sector: '仮想通貨',
                region: 'Global',
                currency: 'JPY',
                market: 'Crypto',
                account: '',
                transactions: 1,
                lastUpdated: crypto.updatedAt || crypto.createdAt || new Date().toISOString(),
                details: [crypto],
                customTags: crypto.customTags || []
            };

        } catch (error) {
            console.error('Failed to calculate crypto summary:', error);
            return null;
        }
    }

    /**
     * セクター情報更新
     * @param {string} assetId - 資産ID
     * @param {string} newSector - 新しいセクター
     * @returns {boolean} 更新成功フラグ
     */
    updateAssetSector(assetId, newSector) {
        try {
            // 個別株のセクター更新
            const stocks = this.dataStoreManager.getStocks();
            const targetStock = stocks.find(s => s.id === assetId);
            
            if (targetStock) {
                const oldSector = targetStock.sector;
                targetStock.sector = newSector;
                targetStock.updatedAt = new Date().toISOString();
                
                this.dataStoreManager.saveStocks(stocks);
                this.clearCache(); // キャッシュをクリア
                
                console.log(`Sector updated: ${targetStock.name} ${oldSector} -> ${newSector}`);
                return true;
            }
            
            // 投資信託の場合（セクターは固定のため更新不可）
            console.warn('Mutual fund sector cannot be updated');
            return false;

        } catch (error) {
            console.error('Failed to update sector:', error);
            return false;
        }
    }

    /**
     * カスタムタグ追加
     * @param {string} assetId - 資産ID
     * @param {string} tag - 追加タグ
     * @returns {boolean} 追加成功フラグ
     */
    addCustomTag(assetId, tag) {
        try {
            // 個別株のタグ追加
            const stocks = this.dataStoreManager.getStocks();
            const targetStock = stocks.find(s => s.id === assetId);
            
            if (targetStock) {
                if (!targetStock.customTags) {
                    targetStock.customTags = [];
                }
                
                if (!targetStock.customTags.includes(tag)) {
                    targetStock.customTags.push(tag);
                    targetStock.updatedAt = new Date().toISOString();
                    
                    this.dataStoreManager.saveStocks(stocks);
                    this.clearCache();
                    
                    console.log(`Tag added: ${targetStock.name} +${tag}`);
                    return true;
                }
                
                return true; // 既に存在する場合は成功とみなす
            }
            
            // 投資信託のタグ追加
            const mutualFunds = this.dataStoreManager.getMutualFunds();
            const targetMF = mutualFunds.find(mf => mf.id === assetId);
            
            if (targetMF) {
                if (!targetMF.customTags) {
                    targetMF.customTags = [];
                }
                
                if (!targetMF.customTags.includes(tag)) {
                    targetMF.customTags.push(tag);
                    targetMF.updatedAt = new Date().toISOString();
                    
                    this.dataStoreManager.saveMutualFunds(mutualFunds);
                    this.clearCache();
                    
                    console.log(`Tag added: ${targetMF.name} +${tag}`);
                    return true;
                }
                
                return true;
            }

            return false;

        } catch (error) {
            console.error('Failed to add custom tag:', error);
            return false;
        }
    }

    /**
     * カスタムタグ削除
     * @param {string} assetId - 資産ID
     * @param {string} tag - 削除タグ
     * @returns {boolean} 削除成功フラグ
     */
    removeCustomTag(assetId, tag) {
        try {
            // 個別株のタグ削除
            const stocks = this.dataStoreManager.getStocks();
            const targetStock = stocks.find(s => s.id === assetId);
            
            if (targetStock && targetStock.customTags) {
                const index = targetStock.customTags.indexOf(tag);
                if (index > -1) {
                    targetStock.customTags.splice(index, 1);
                    targetStock.updatedAt = new Date().toISOString();
                    
                    this.dataStoreManager.saveStocks(stocks);
                    this.clearCache();
                    
                    console.log(`Tag removed: ${targetStock.name} -${tag}`);
                    return true;
                }
            }
            
            // 投資信託のタグ削除
            const mutualFunds = this.dataStoreManager.getMutualFunds();
            const targetMF = mutualFunds.find(mf => mf.id === assetId);
            
            if (targetMF && targetMF.customTags) {
                const index = targetMF.customTags.indexOf(tag);
                if (index > -1) {
                    targetMF.customTags.splice(index, 1);
                    targetMF.updatedAt = new Date().toISOString();
                    
                    this.dataStoreManager.saveMutualFunds(mutualFunds);
                    this.clearCache();
                    
                    console.log(`Tag removed: ${targetMF.name} -${tag}`);
                    return true;
                }
            }

            return false;

        } catch (error) {
            console.error('Failed to remove custom tag:', error);
            return false;
        }
    }

    /**
     * 銘柄パフォーマンス分析
     * @param {string} assetId - 資産ID
     * @returns {Object} パフォーマンス分析結果
     */
    analyzeAssetPerformance(assetId) {
        try {
            const summaries = this.generateAssetSummaries();
            const asset = summaries.find(s => s.id === assetId);
            
            if (!asset) {
                return null;
            }

            // 基本パフォーマンス指標
            const performance = {
                assetId: assetId,
                name: asset.name,
                ticker: asset.ticker,
                type: asset.type,
                
                // 収益性指標
                totalReturn: asset.unrealizedGain,
                totalReturnPercent: asset.gainPercent,
                annualizedReturn: this.calculateAnnualizedReturn(asset),
                
                // リスク指標（簡易版）
                volatility: this.estimateVolatility(asset),
                sharpeRatio: this.calculateSharpeRatio(asset),
                
                // 分散指標
                sectorWeight: this.calculateSectorWeight(asset),
                regionWeight: this.calculateRegionWeight(asset),
                
                // その他指標
                transactions: asset.transactions,
                avgTransactionSize: asset.totalInvestment / asset.transactions,
                lastUpdated: new Date().toISOString()
            };

            return performance;

        } catch (error) {
            console.error('Failed to analyze asset performance:', error);
            return null;
        }
    }

    /**
     * セクター配分取得
     * @returns {Object} セクター別配分
     */
    getSectorAllocation() {
        try {
            const summaries = this.generateAssetSummaries();
            const sectorAllocation = {};
            let totalInvestment = 0;

            summaries.forEach(asset => {
                const sector = asset.sector || 'その他';
                if (!sectorAllocation[sector]) {
                    sectorAllocation[sector] = {
                        amount: 0,
                        count: 0,
                        assets: []
                    };
                }
                
                sectorAllocation[sector].amount += asset.totalInvestment;
                sectorAllocation[sector].count += 1;
                sectorAllocation[sector].assets.push({
                    name: asset.name,
                    ticker: asset.ticker,
                    amount: asset.totalInvestment
                });
                
                totalInvestment += asset.totalInvestment;
            });

            // パーセンテージ計算
            Object.keys(sectorAllocation).forEach(sector => {
                sectorAllocation[sector].percentage = totalInvestment > 0 ? 
                    (sectorAllocation[sector].amount / totalInvestment) * 100 : 0;
            });

            return {
                sectors: sectorAllocation,
                totalInvestment: totalInvestment,
                sectorCount: Object.keys(sectorAllocation).length
            };

        } catch (error) {
            console.error('Failed to get sector allocation:', error);
            return { sectors: {}, totalInvestment: 0, sectorCount: 0 };
        }
    }

    /**
     * 重複銘柄検出
     * @returns {Array} 重複可能性のある銘柄リスト
     */
    detectDuplicateAssets() {
        try {
            const summaries = this.generateAssetSummaries();
            const duplicates = [];
            
            // 名前・ティッカーが類似している銘柄を検出
            summaries.forEach((asset, index) => {
                summaries.slice(index + 1).forEach(compareAsset => {
                    const similarity = this.calculateNameSimilarity(asset, compareAsset);
                    if (similarity > 0.8) {
                        duplicates.push({
                            assets: [asset, compareAsset],
                            similarity: similarity,
                            reason: '名前・ティッカーの類似性'
                        });
                    }
                });
            });

            return duplicates;

        } catch (error) {
            console.error('Failed to detect duplicate assets:', error);
            return [];
        }
    }

    /**
     * 投資信託ティッカー生成（簡易版）
     * @param {string} name - 投資信託名
     * @returns {string} 生成されたティッカー
     * @private
     */
    generateMutualFundTicker(name) {
        if (!name) return 'MF';
        
        // 簡易的にファンド名から略称を生成
        const words = name.split(/[\s・\-]/);
        let ticker = '';
        
        words.forEach(word => {
            if (word.length > 0) {
                ticker += word.charAt(0);
            }
        });
        
        return ticker.substring(0, 6).toUpperCase() || 'MF';
    }

    /**
     * カスタムタグ抽出
     * @param {Array} assets - 資産配列
     * @returns {Array} 統合されたカスタムタグ
     * @private
     */
    extractCustomTags(assets) {
        const allTags = new Set();
        
        assets.forEach(asset => {
            if (asset.customTags && Array.isArray(asset.customTags)) {
                asset.customTags.forEach(tag => allTags.add(tag));
            }
        });
        
        return Array.from(allTags);
    }

    /**
     * 年率換算リターン計算（簡易版）
     * @param {Object} asset - 資産データ
     * @returns {number} 年率換算リターン
     * @private
     */
    calculateAnnualizedReturn(asset) {
        // 簡易版：作成日からの経過日数で年率換算
        try {
            const createdDate = new Date(asset.lastUpdated);
            const now = new Date();
            const daysDiff = (now - createdDate) / (1000 * 60 * 60 * 24);
            const yearsDiff = daysDiff / 365;
            
            if (yearsDiff > 0) {
                return Math.pow(1 + (asset.gainPercent / 100), 1 / yearsDiff) - 1;
            }
            
            return asset.gainPercent / 100;
        } catch (error) {
            return 0;
        }
    }

    /**
     * ボラティリティ推定（簡易版）
     * @param {Object} asset - 資産データ
     * @returns {number} 推定ボラティリティ
     * @private
     */
    estimateVolatility(asset) {
        // 簡易版：資産タイプ別の標準的なボラティリティを返す
        switch (asset.type) {
            case 'stock':
                return asset.region === 'US' ? 0.20 : 0.25; // 20-25%
            case 'mutualFund':
                return 0.15; // 15%
            case 'crypto':
                return 0.60; // 60%
            default:
                return 0.20;
        }
    }

    /**
     * シャープレシオ計算（簡易版）
     * @param {Object} asset - 資産データ
     * @returns {number} シャープレシオ
     * @private
     */
    calculateSharpeRatio(asset) {
        const riskFreeRate = 0.02; // 2%のリスクフリーレート
        const excessReturn = (asset.gainPercent / 100) - riskFreeRate;
        const volatility = this.estimateVolatility(asset);
        
        return volatility > 0 ? excessReturn / volatility : 0;
    }

    /**
     * セクター比重計算
     * @param {Object} asset - 資産データ
     * @returns {number} セクター内比重
     * @private
     */
    calculateSectorWeight(asset) {
        const sectorAllocation = this.getSectorAllocation();
        const sectorData = sectorAllocation.sectors[asset.sector];
        
        if (sectorData && sectorData.amount > 0) {
            return (asset.totalInvestment / sectorData.amount) * 100;
        }
        
        return 0;
    }

    /**
     * 地域比重計算
     * @param {Object} asset - 資産データ
     * @returns {number} 地域内比重
     * @private
     */
    calculateRegionWeight(asset) {
        const summaries = this.generateAssetSummaries();
        const regionTotal = summaries
            .filter(s => s.region === asset.region)
            .reduce((sum, s) => sum + s.totalInvestment, 0);
        
        return regionTotal > 0 ? (asset.totalInvestment / regionTotal) * 100 : 0;
    }

    /**
     * 名前類似度計算（簡易版）
     * @param {Object} asset1 - 資産1
     * @param {Object} asset2 - 資産2
     * @returns {number} 類似度（0-1）
     * @private
     */
    calculateNameSimilarity(asset1, asset2) {
        if (asset1.ticker === asset2.ticker && asset1.ticker) {
            return 1.0; // ティッカーが同じ
        }
        
        if (asset1.name === asset2.name) {
            return 1.0; // 名前が同じ
        }
        
        // 簡易的な文字列類似度（レーベンシュタイン距離ベース）
        const distance = this.levenshteinDistance(
            asset1.name.toLowerCase(), 
            asset2.name.toLowerCase()
        );
        const maxLength = Math.max(asset1.name.length, asset2.name.length);
        
        return maxLength > 0 ? 1 - (distance / maxLength) : 0;
    }

    /**
     * レーベンシュタイン距離計算
     * @param {string} str1 - 文字列1
     * @param {string} str2 - 文字列2
     * @returns {number} レーベンシュタイン距離
     * @private
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * キャッシュの有効性をチェック
     * @returns {boolean} キャッシュが有効かどうか
     * @private
     */
    isCacheValid() {
        if (!this.cacheTimestamp || this.summaryCache.size === 0) {
            return false;
        }

        const now = Date.now();
        return (now - this.cacheTimestamp) < this.cacheExpiration;
    }

    /**
     * キャッシュを更新
     * @param {Array} summaries - サマリーデータ
     * @private
     */
    updateCache(summaries) {
        this.summaryCache.clear();
        
        summaries.forEach(summary => {
            this.summaryCache.set(summary.id, summary);
        });
        
        this.cacheTimestamp = Date.now();
    }

    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.summaryCache.clear();
        this.cacheTimestamp = null;
        console.log('Asset database cache cleared');
    }

    /**
     * サービスの状態情報を取得
     * @returns {Object} サービス状態
     */
    getServiceStatus() {
        const summaries = this.generateAssetSummaries();
        const sectorAllocation = this.getSectorAllocation();
        
        return {
            isInitialized: true,
            cacheSize: this.summaryCache.size,
            cacheExpiration: this.cacheExpiration,
            lastCacheUpdate: this.cacheTimestamp ? new Date(this.cacheTimestamp).toISOString() : null,
            assetCount: summaries.length,
            sectorCount: sectorAllocation.sectorCount,
            totalInvestment: sectorAllocation.totalInvestment,
            duplicatesDetected: this.detectDuplicateAssets().length
        };
    }
}

// グローバルエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetDatabaseService;
} else if (typeof window !== 'undefined') {
    window.AssetDatabaseService = AssetDatabaseService;
}