/**
 * セクター管理サービス
 * 株式銘柄にセクター情報を付与し、セクター分析機能を提供
 */

class SectorManager {
    constructor() {
        this.debugMode = true;
        
        // セクター分類マスターデータ
        this.sectorMaster = {
            // 日本株セクター（東証33業種分類ベース）
            JP: {
                '1332': { sector: '水産・農林業', subSector: '水産・農林業' },
                '1333': { sector: '鉱業', subSector: '鉱業' },
                '2269': { sector: '食品', subSector: '食品' },
                '3191': { sector: '繊維製品', subSector: '繊維製品' },
                '3405': { sector: 'パルプ・紙', subSector: 'パルプ・紙' },
                '4005': { sector: '化学', subSector: '化学' },
                '4502': { sector: '医薬品', subSector: '医薬品' },
                '4901': { sector: '石油・石炭製品', subSector: '石油・石炭製品' },
                '5108': { sector: 'ゴム製品', subSector: 'ゴム製品' },
                '5201': { sector: 'ガラス・土石製品', subSector: 'ガラス・土石製品' },
                '5401': { sector: '鉄鋼', subSector: '鉄鋼' },
                '5714': { sector: '非鉄金属', subSector: '非鉄金属' },
                '6301': { sector: '金属製品', subSector: '金属製品' },
                '6501': { sector: '機械', subSector: '機械' },
                '6701': { sector: '電気機器', subSector: '電気機器' },
                '7003': { sector: '輸送用機器', subSector: '輸送用機器' },
                '7201': { sector: '自動車', subSector: '自動車' },
                '7202': { sector: 'トヨタ自動車', subSector: '自動車' },
                '7267': { sector: 'ホンダ', subSector: '自動車' },
                '7751': { sector: 'キヤノン', subSector: '精密機器' },
                '8001': { sector: '卸売業', subSector: '商社・卸売' },
                '8031': { sector: '三井物産', subSector: '商社・卸売' },
                '8058': { sector: '三菱商事', subSector: '商社・卸売' },
                '9001': { sector: '運輸・物流', subSector: '陸運業' },
                '9020': { sector: 'JR東日本', subSector: '陸運業' },
                '9434': { sector: '通信', subSector: '情報・通信業' },
                '9984': { sector: 'ソフトバンクグループ', subSector: '情報・通信業' },
                '6758': { sector: 'ソニーグループ', subSector: '電気機器' },
                '6861': { sector: 'キーエンス', subSector: '電気機器' }
            },
            
            // 米国株セクター（GICS分類ベース）
            US: {
                'AAPL': { sector: 'Technology', subSector: 'Technology Hardware & Equipment' },
                'MSFT': { sector: 'Technology', subSector: 'Software & Services' },
                'GOOGL': { sector: 'Communication Services', subSector: 'Internet & Direct Marketing Retail' },
                'AMZN': { sector: 'Consumer Discretionary', subSector: 'Internet & Direct Marketing Retail' },
                'TSLA': { sector: 'Consumer Discretionary', subSector: 'Automobiles' },
                'META': { sector: 'Communication Services', subSector: 'Internet & Direct Marketing Retail' },
                'NVDA': { sector: 'Technology', subSector: 'Semiconductors' },
                'BRK-B': { sector: 'Financials', subSector: 'Insurance' },
                'BRK.B': { sector: 'Financials', subSector: 'Insurance' },
                'JPM': { sector: 'Financials', subSector: 'Banks' },
                'JNJ': { sector: 'Health Care', subSector: 'Pharmaceuticals' },
                'V': { sector: 'Technology', subSector: 'Data Processing & Outsourced Services' },
                'PG': { sector: 'Consumer Staples', subSector: 'Household Products' },
                'UNH': { sector: 'Health Care', subSector: 'Health Care Equipment & Services' },
                'HD': { sector: 'Consumer Discretionary', subSector: 'Home Improvement Retail' },
                'MA': { sector: 'Technology', subSector: 'Data Processing & Outsourced Services' },
                'DIS': { sector: 'Communication Services', subSector: 'Media & Entertainment' },
                'ADBE': { sector: 'Technology', subSector: 'Software & Services' },
                'NFLX': { sector: 'Communication Services', subSector: 'Media & Entertainment' },
                'CRM': { sector: 'Technology', subSector: 'Software & Services' },
                'VTI': { sector: 'ETF', subSector: 'Total Stock Market ETF' },
                'VOO': { sector: 'ETF', subSector: 'S&P 500 ETF' },
                'VYM': { sector: 'ETF', subSector: 'High Dividend Yield ETF' },
                'QQQ': { sector: 'ETF', subSector: 'Technology ETF' },
                'SPY': { sector: 'ETF', subSector: 'S&P 500 ETF' }
            }
        };

        // カスタムセクター設定（ユーザー定義）
        this.customSectorMappings = this.loadCustomMappings();
    }

    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[SectorManager] ${message}`, data || '');
        }
    }

    /**
     * 株式にセクター情報を付与
     * @param {Object} stock - 株式データ
     * @returns {Object} セクター情報付き株式データ
     */
    assignSectorToStock(stock) {
        try {
            const region = stock.region || 'JP';
            const identifier = stock.ticker || stock.code || '';
            
            // カスタム設定を優先
            const customMapping = this.customSectorMappings[`${region}_${identifier}`];
            if (customMapping) {
                return {
                    ...stock,
                    sector: customMapping.sector,
                    subSector: customMapping.subSector,
                    sectorSource: 'custom'
                };
            }

            // マスターデータから検索
            const masterData = this.sectorMaster[region];
            if (masterData && masterData[identifier]) {
                return {
                    ...stock,
                    sector: masterData[identifier].sector,
                    subSector: masterData[identifier].subSector,
                    sectorSource: 'master'
                };
            }

            // セクター情報が見つからない場合
            return {
                ...stock,
                sector: 'その他',
                subSector: '未分類',
                sectorSource: 'default'
            };

        } catch (error) {
            this.debugLog(`セクター付与エラー（${stock.name}）:`, error);
            return {
                ...stock,
                sector: 'その他',
                subSector: 'エラー',
                sectorSource: 'error'
            };
        }
    }

    /**
     * ポートフォリオ全体にセクター情報を付与
     * @param {Array} holdings - 保有銘柄一覧
     * @returns {Array} セクター情報付き保有銘柄一覧
     */
    assignSectorsToPortfolio(holdings) {
        this.debugLog('=== ポートフォリオセクター付与開始 ===');
        this.debugLog('対象銘柄数:', holdings.length);

        const result = holdings.map(holding => this.assignSectorToStock(holding));
        
        const stats = this.calculateSectorStats(result);
        this.debugLog('セクター付与完了:', stats);

        return result;
    }

    /**
     * セクター統計を計算
     * @param {Array} sectorsAssignedHoldings - セクター情報付き保有銘柄
     * @returns {Object} セクター統計
     */
    calculateSectorStats(sectorsAssignedHoldings) {
        const stats = {
            totalHoldings: sectorsAssignedHoldings.length,
            sectorsFound: 0,
            sectorsNotFound: 0,
            customMapped: 0,
            sectorBreakdown: {},
            valueBySource: {
                master: 0,
                custom: 0,
                default: 0,
                error: 0
            }
        };

        for (const holding of sectorsAssignedHoldings) {
            // ソース別統計
            if (holding.sectorSource === 'custom') stats.customMapped++;
            if (holding.sectorSource === 'master') stats.sectorsFound++;
            if (holding.sectorSource === 'default' || holding.sectorSource === 'error') {
                stats.sectorsNotFound++;
            }

            // セクター別統計
            const sector = holding.sector || 'その他';
            if (!stats.sectorBreakdown[sector]) {
                stats.sectorBreakdown[sector] = {
                    count: 0,
                    totalValue: 0,
                    holdings: []
                };
            }
            
            stats.sectorBreakdown[sector].count++;
            stats.sectorBreakdown[sector].totalValue += holding.currentValue || 0;
            stats.sectorBreakdown[sector].holdings.push({
                name: holding.name,
                ticker: holding.ticker || holding.code,
                value: holding.currentValue || 0
            });

            // ソース別価値統計
            stats.valueBySource[holding.sectorSource] += holding.currentValue || 0;
        }

        return stats;
    }

    /**
     * セクター分析結果を生成
     * @param {Array} sectorsAssignedHoldings - セクター情報付き保有銘柄
     * @returns {Object} セクター分析結果
     */
    generateSectorAnalysis(sectorsAssignedHoldings) {
        this.debugLog('=== セクター分析開始 ===');
        
        const stats = this.calculateSectorStats(sectorsAssignedHoldings);
        const totalPortfolioValue = sectorsAssignedHoldings.reduce(
            (sum, holding) => sum + (holding.currentValue || 0), 0
        );

        // セクター割合計算
        const sectorAllocation = Object.keys(stats.sectorBreakdown).map(sector => {
            const sectorData = stats.sectorBreakdown[sector];
            return {
                sector,
                count: sectorData.count,
                value: sectorData.totalValue,
                percentage: totalPortfolioValue > 0 ? (sectorData.totalValue / totalPortfolioValue) * 100 : 0,
                holdings: sectorData.holdings
            };
        }).sort((a, b) => b.value - a.value);

        // 上位セクター
        const topSectors = sectorAllocation.slice(0, 5);

        // 地域×セクターマトリックス
        const regionSectorMatrix = this.generateRegionSectorMatrix(sectorsAssignedHoldings);

        const analysis = {
            success: true,
            timestamp: new Date().toISOString(),
            portfolio: {
                totalValue: totalPortfolioValue,
                totalHoldings: stats.totalHoldings
            },
            sectors: {
                allocation: sectorAllocation,
                topSectors,
                diversification: {
                    sectorCount: Object.keys(stats.sectorBreakdown).length,
                    concentrationRisk: this.calculateConcentrationRisk(sectorAllocation)
                }
            },
            regionSectorMatrix,
            dataQuality: {
                sectorsFound: stats.sectorsFound,
                sectorsNotFound: stats.sectorsNotFound,
                customMapped: stats.customMapped,
                coverage: stats.sectorsFound + stats.customMapped,
                coveragePercentage: ((stats.sectorsFound + stats.customMapped) / stats.totalHoldings) * 100
            }
        };

        this.debugLog('✅ セクター分析完了');
        return analysis;
    }

    /**
     * 地域×セクターマトリックス生成
     * @param {Array} sectorsAssignedHoldings - セクター情報付き保有銘柄
     * @returns {Object} 地域×セクターマトリックス
     */
    generateRegionSectorMatrix(sectorsAssignedHoldings) {
        const matrix = {};

        for (const holding of sectorsAssignedHoldings) {
            const region = holding.region || 'OTHER';
            const sector = holding.sector || 'その他';

            if (!matrix[region]) {
                matrix[region] = {};
            }
            if (!matrix[region][sector]) {
                matrix[region][sector] = {
                    count: 0,
                    value: 0,
                    holdings: []
                };
            }

            matrix[region][sector].count++;
            matrix[region][sector].value += holding.currentValue || 0;
            matrix[region][sector].holdings.push({
                name: holding.name,
                ticker: holding.ticker || holding.code,
                value: holding.currentValue || 0
            });
        }

        return matrix;
    }

    /**
     * 集中リスク計算（HHI指数）
     * @param {Array} sectorAllocation - セクター配分
     * @returns {Object} 集中リスク指標
     */
    calculateConcentrationRisk(sectorAllocation) {
        // HHI（ハーフィンダール・ハーシュマン指数）計算
        const hhi = sectorAllocation.reduce((sum, sector) => {
            return sum + Math.pow(sector.percentage, 2);
        }, 0);

        let riskLevel = '低';
        if (hhi > 2500) riskLevel = '高';
        else if (hhi > 1500) riskLevel = '中';

        return {
            hhi,
            riskLevel,
            interpretation: hhi > 2500 ? 'セクター集中度が高いです' : 
                           hhi > 1500 ? '適度に分散されています' : 
                           '良好な分散投資です'
        };
    }

    /**
     * カスタムセクター設定を更新
     * @param {string} region - 地域（JP/US）
     * @param {string} identifier - 銘柄コード/ティッカー
     * @param {string} sector - セクター名
     * @param {string} subSector - サブセクター名
     */
    updateSectorMapping(region, identifier, sector, subSector) {
        const key = `${region}_${identifier}`;
        
        this.customSectorMappings[key] = {
            sector,
            subSector,
            updatedAt: new Date().toISOString()
        };

        this.saveCustomMappings();
        this.debugLog(`カスタムセクター更新: ${key}`, { sector, subSector });
    }

    /**
     * カスタムセクター設定を削除
     * @param {string} region - 地域
     * @param {string} identifier - 銘柄コード/ティッカー
     */
    removeSectorMapping(region, identifier) {
        const key = `${region}_${identifier}`;
        delete this.customSectorMappings[key];
        this.saveCustomMappings();
        this.debugLog(`カスタムセクター削除: ${key}`);
    }

    /**
     * カスタム設定をLocalStorageから読み込み
     */
    loadCustomMappings() {
        try {
            const saved = localStorage.getItem('investment_custom_sectors');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            this.debugLog('カスタムセクター読み込みエラー:', error);
            return {};
        }
    }

    /**
     * カスタム設定をLocalStorageに保存
     */
    saveCustomMappings() {
        try {
            localStorage.setItem('investment_custom_sectors', 
                JSON.stringify(this.customSectorMappings));
        } catch (error) {
            this.debugLog('カスタムセクター保存エラー:', error);
        }
    }

    /**
     * 利用可能なセクター一覧を取得
     * @param {string} region - 地域
     * @returns {Array} セクター一覧
     */
    getAvailableSectors(region = 'JP') {
        const masterSectors = region === 'JP' ? [
            '水産・農林業', '鉱業', '建設業', '食品', '繊維製品', 'パルプ・紙',
            '化学', '医薬品', '石油・石炭製品', 'ゴム製品', 'ガラス・土石製品',
            '鉄鋼', '非鉄金属', '金属製品', '機械', '電気機器', '輸送用機器',
            'その他製品', '電気・ガス業', '陸運業', '海運業', '空運業',
            '倉庫・運輸関連業', '情報・通信業', '卸売業', '小売業',
            '銀行業', '証券・商品先物取引業', '保険業', 'その他金融業',
            '不動産業', 'サービス業'
        ] : [
            'Technology', 'Health Care', 'Financials', 'Consumer Discretionary',
            'Communication Services', 'Industrials', 'Consumer Staples',
            'Energy', 'Utilities', 'Real Estate', 'Materials', 'ETF'
        ];

        const customSectors = Array.from(new Set(
            Object.values(this.customSectorMappings).map(mapping => mapping.sector)
        ));

        return [...new Set([...masterSectors, ...customSectors])].sort();
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
const sectorManager = new SectorManager();

// windowオブジェクトにも追加
if (typeof window !== 'undefined') {
    window.sectorManager = sectorManager;
    console.log('✅ セクター管理サービスが利用可能です');
}