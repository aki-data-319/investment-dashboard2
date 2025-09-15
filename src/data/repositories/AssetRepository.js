/**
 * AssetRepository - Data Layer
 * 資産データアクセスの抽象化とCRUD操作
 * 資産データを管理するためのメソッドが格納されたクラス。資産の取得、追加削除ができる。
 */

import { AssetEntity } from '../../business/models/AssetEntity.js';

export class AssetRepository {
    /**
     * AssetRepositoryのコンストラクタ
     * @param {Object} storageAdapter - ストレージアダプター（LocalStorageAdapterなど）
     * @param {Function} storageAdapter.load - データを読み込むメソッド
     * @param {Function} storageAdapter.save - データを保存するメソッド
     */
    constructor(storageAdapter) {
        this.storage = storageAdapter;
        this.storageKey = 'investment-assets';
        this.indexKey = 'investment-assets-index';
        this.debugMode = true;
    }

    /**
     * デバッグログを出力
     * @param {string} message - ログメッセージ
     * @param {*} [data=null] - 追加で出力するデータ
     * @returns {void}
     */
    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[AssetRepository] ${message}`, data || '');
        }
    }

    /**
     * 全資産データを取得
     * @returns {Promise<Asset[]>} 全ての資産データの配列
     * @throws {Error} データの取得に失敗した場合
     */
    async getAllAssets() {
        try {
            const assetsData = this.storage.load(this.storageKey);
            if (!assetsData) {
                this.debugLog('資産データが存在しません - 空配列を返します');
                return [];
            }

            const assets = assetsData.map(data => AssetEntity.fromJSON(data));
            this.debugLog(`全資産データ取得完了: ${assets.length}件`);
            return assets;
        } catch (error) {
            this.debugLog('全資産データ取得エラー:', error);
            throw new Error(`資産データの取得に失敗しました: ${error.message}`);
        }
    }

    /**
     * アクティブな資産のみを取得
     * @returns {Promise<Asset[]>} アクティブな資産データの配列
     * @throws {Error} データの取得に失敗した場合
     */
    async getActiveAssets() {
        try {
            const allAssets = await this.getAllAssets();
            const activeAssets = allAssets.filter(asset => asset.isActive);
            this.debugLog(`アクティブ資産取得完了: ${activeAssets.length}件`);
            return activeAssets;
        } catch (error) {
            this.debugLog('アクティブ資産取得エラー:', error);
            throw new Error(`アクティブ資産の取得に失敗しました: ${error.message}`);
        }
    }

    /**
     * IDで資産を取得
     * @param {string} id - 資産のID
     * @returns {Promise<Asset|null>} 指定されたIDの資産データ、見つからない場合はnull
     * @throws {Error} データの取得に失敗した場合
     */
    async getAssetById(id) {
        try {
            const allAssets = await this.getAllAssets();
            const asset = allAssets.find(asset => asset.id === id);
            
            if (!asset) {
                this.debugLog(`資産が見つかりません: ${id}`);
                return null;
            }

            this.debugLog(`資産取得完了: ${id}`);
            return asset;
        } catch (error) {
            this.debugLog(`資産取得エラー: ${id}`, error);
            throw new Error(`資産の取得に失敗しました: ${error.message}`);
        }
    }

    /**
     * 新しい資産を追加
     * @param {Object} assetData - 資産データのオブジェクト
     * @param {string} assetData.name - 資産名
     * @param {string} assetData.type - 資産タイプ（stock, bond, mutualFund等）
     * @param {string} assetData.region - 地域（JP, US, OTHER等）
     * @param {string} assetData.currency - 通貨（JPY, USD等）
     * @param {number} assetData.totalInvestment - 投資総額
     * @param {number} assetData.currentValue - 現在価値
     * @param {string} [assetData.sector] - セクター
     * @param {string} [assetData.description] - 説明
     * @returns {Promise<Asset>} 作成された資産データ
     * @throws {Error} 資産の追加に失敗した場合、または同名の資産が既に存在する場合
     */
    async addAsset(assetData) {
        try {
            // AssetEntityインスタンスを作成（バリデーション付き）
            const asset = new AssetEntity(assetData);
            
            // 既存データを取得
            const allAssets = await this.getAllAssets();
            
            // 重複チェック（名前ベース）
            const existingAsset = allAssets.find(existing => 
                existing.name === asset.name && existing.type === asset.type
            );
            
            if (existingAsset) {
                throw new Error(`同名の資産が既に存在します: ${asset.name}`);
            }

            // データを追加
            allAssets.push(asset);
            
            // 保存
            if (!this.storage.save(this.storageKey, allAssets.map(a => a.toJSON()))) {
                throw new Error('データの保存に失敗しました');
            }

            // インデックス更新
            await this.updateIndex();

            this.debugLog(`資産追加完了: ${asset.name} (ID: ${asset.id})`);
            return asset;
        } catch (error) {
            this.debugLog('資産追加エラー:', error);
            throw new Error(`資産の追加に失敗しました: ${error.message}`);
        }
    }

    /**
     * 資産データを更新
     * @param {string} id - 更新する資産のID
     * @param {Object} updateData - 更新するデータのオブジェクト
     * @param {string} [updateData.name] - 資産名
     * @param {string} [updateData.type] - 資産タイプ
     * @param {string} [updateData.region] - 地域
     * @param {string} [updateData.currency] - 通貨
     * @param {number} [updateData.totalInvestment] - 投資総額
     * @param {number} [updateData.currentValue] - 現在価値
     * @param {string} [updateData.sector] - セクター
     * @param {string} [updateData.description] - 説明
     * @param {boolean} [updateData.isActive] - アクティブフラグ
     * @returns {Promise<Asset>} 更新された資産データ
     * @throws {Error} 更新対象の資産が見つからない場合、またはデータの更新に失敗した場合
     */
    async updateAsset(id, updateData) {
        try {
            const allAssets = await this.getAllAssets();
            const assetIndex = allAssets.findIndex(asset => asset.id === id);
            
            if (assetIndex === -1) {
                throw new Error(`更新対象の資産が見つかりません: ${id}`);
            }

            // 既存データに更新データをマージ
            const currentAsset = allAssets[assetIndex];
            const mergedData = {
                ...currentAsset.toJSON(),
                ...updateData,
                id: id, // IDは変更不可
                updatedAt: new Date().toISOString()
            };

            // 新しいAssetEntityインスタンスを作成（バリデーション付き）
            const updatedAsset = new AssetEntity(mergedData);
            
            // 配列を更新
            allAssets[assetIndex] = updatedAsset;
            
            // 保存
            if (!this.storage.save(this.storageKey, allAssets.map(a => a.toJSON()))) {
                throw new Error('データの保存に失敗しました');
            }

            this.debugLog(`資産更新完了: ${updatedAsset.name} (ID: ${id})`);
            return updatedAsset;
        } catch (error) {
            this.debugLog(`資産更新エラー: ${id}`, error);
            throw new Error(`資産の更新に失敗しました: ${error.message}`);
        }
    }

    /**
     * 資産を削除（論理削除）
     * isActiveフラグをfalseに設定することで論理削除を行う
     * @param {string} id - 削除する資産のID
     * @returns {Promise<Asset>} 削除された資産データ（isActive=false）
     * @throws {Error} 削除対象の資産が見つからない場合、またはデータの更新に失敗した場合
     */
    async deleteAsset(id) {
        try {
            const updatedAsset = await this.updateAsset(id, { isActive: false });
            this.debugLog(`資産削除完了: ${id}`);
            return updatedAsset;
        } catch (error) {
            this.debugLog(`資産削除エラー: ${id}`, error);
            throw new Error(`資産の削除に失敗しました: ${error.message}`);
        }
    }

    /**
     * 資産を物理削除
     * データから完全に削除する（復元不可能）
     * @param {string} id - 削除する資産のID
     * @returns {Promise<boolean>} 削除が成功した場合はtrue
     * @throws {Error} 削除対象の資産が見つからない場合、またはデータの削除に失敗した場合
     */
    async permanentDeleteAsset(id) {
        try {
            const allAssets = await this.getAllAssets();
            const filteredAssets = allAssets.filter(asset => asset.id !== id);
            
            if (allAssets.length === filteredAssets.length) {
                throw new Error(`削除対象の資産が見つかりません: ${id}`);
            }

            // 保存
            if (!this.storage.save(this.storageKey, filteredAssets.map(a => a.toJSON()))) {
                throw new Error('データの保存に失敗しました');
            }

            // インデックス更新
            await this.updateIndex();

            this.debugLog(`資産物理削除完了: ${id}`);
            return true;
        } catch (error) {
            this.debugLog(`資産物理削除エラー: ${id}`, error);
            throw new Error(`資産の物理削除に失敗しました: ${error.message}`);
        }
    }

    /**
     * 条件に基づいて資産を検索
     * @param {Object} criteria - 検索条件
     * @param {string} [criteria.type] - 資産タイプで絞り込み
     * @param {string} [criteria.region] - 地域で絞り込み
     * @param {string} [criteria.name] - 名前で部分一致検索
     * @param {boolean} [criteria.isActive] - アクティブ状態で絞り込み
     * @param {string} [criteria.sector] - セクターで絞り込み
     * @returns {Promise<Asset[]>} 検索条件に一致する資産データの配列
     * @throws {Error} 検索に失敗した場合
     */
    async searchAssets(criteria) {
        try {
            const allAssets = await this.getAllAssets();
            let filteredAssets = allAssets;

            // タイプフィルター
            if (criteria.type) {
                filteredAssets = filteredAssets.filter(asset => asset.type === criteria.type);
            }

            // 地域フィルター
            if (criteria.region) {
                filteredAssets = filteredAssets.filter(asset => asset.region === criteria.region);
            }

            // 名前フィルター（部分一致）
            if (criteria.name) {
                const searchTerm = criteria.name.toLowerCase();
                filteredAssets = filteredAssets.filter(asset => 
                    asset.name.toLowerCase().includes(searchTerm)
                );
            }

            // アクティブフィルター
            if (criteria.isActive !== undefined) {
                filteredAssets = filteredAssets.filter(asset => asset.isActive === criteria.isActive);
            }

            // セクターフィルター
            if (criteria.sector) {
                filteredAssets = filteredAssets.filter(asset => asset.sector === criteria.sector);
            }

            this.debugLog(`資産検索完了: ${filteredAssets.length}件 (条件: ${JSON.stringify(criteria)})`);
            return filteredAssets;
        } catch (error) {
            this.debugLog('資産検索エラー:', error);
            throw new Error(`資産の検索に失敗しました: ${error.message}`);
        }
    }

    /**
     * ポートフォリオサマリーを取得
     * アクティブな資産の統計情報とパフォーマンス分析を提供
     * @returns {Promise<Object>} ポートフォリオサマリー
     * @returns {number} returns.totalAssets - 資産の総数
     * @returns {number} returns.totalInvestment - 投資総額
     * @returns {number} returns.totalCurrentValue - 現在価値の総額
     * @returns {number} returns.totalUnrealizedGainLoss - 未実現損益の総額
     * @returns {number} returns.averageReturnPercentage - 平均利益率（%）
     * @returns {Object} returns.assetTypeBreakdown - 資産タイプ別の内訳
     * @returns {Object} returns.regionBreakdown - 地域別の内訳
     * @returns {Object[]} returns.topPerformers - トップパフォーマー（上位5件）
     * @returns {Object[]} returns.bottomPerformers - ボトムパフォーマー（下位5件）
     * @throws {Error} データの取得に失敗した場合
     */
    async getPortfolioSummary() {
        try {
            const activeAssets = await this.getActiveAssets();
            
            const summary = {
                totalAssets: activeAssets.length,
                totalInvestment: 0,
                totalCurrentValue: 0,
                totalUnrealizedGainLoss: 0,
                averageReturnPercentage: 0,
                assetTypeBreakdown: {},
                regionBreakdown: {},
                topPerformers: [],
                bottomPerformers: []
            };

            // 基本統計を計算
            activeAssets.forEach(asset => {
                summary.totalInvestment += asset.totalInvestment;
                summary.totalCurrentValue += asset.currentValue;
                summary.totalUnrealizedGainLoss += asset.getUnrealizedGainLoss();

                // タイプ別集計
                if (!summary.assetTypeBreakdown[asset.type]) {
                    summary.assetTypeBreakdown[asset.type] = {
                        count: 0,
                        totalValue: 0
                    };
                }
                summary.assetTypeBreakdown[asset.type].count++;
                summary.assetTypeBreakdown[asset.type].totalValue += asset.currentValue;

                // 地域別集計
                if (!summary.regionBreakdown[asset.region]) {
                    summary.regionBreakdown[asset.region] = {
                        count: 0,
                        totalValue: 0
                    };
                }
                summary.regionBreakdown[asset.region].count++;
                summary.regionBreakdown[asset.region].totalValue += asset.currentValue;
            });

            // 平均利益率
            if (summary.totalInvestment > 0) {
                summary.averageReturnPercentage = 
                    (summary.totalUnrealizedGainLoss / summary.totalInvestment) * 100;
            }

            // トップ・ボトムパフォーマー
            const sortedByReturn = activeAssets
                .map(asset => ({
                    ...asset.getSummary(),
                    returnPercentage: asset.getReturnPercentage()
                }))
                .sort((a, b) => b.returnPercentage - a.returnPercentage);

            summary.topPerformers = sortedByReturn.slice(0, 5);
            summary.bottomPerformers = sortedByReturn.slice(-5).reverse();

            this.debugLog('ポートフォリオサマリー取得完了:', {
                totalAssets: summary.totalAssets,
                totalValue: summary.totalCurrentValue
            });

            return summary;
        } catch (error) {
            this.debugLog('ポートフォリオサマリー取得エラー:', error);
            throw new Error(`ポートフォリオサマリーの取得に失敗しました: ${error.message}`);
        }
    }

    /**
     * インデックスを更新（検索パフォーマンス向上用）
     * 資産をタイプ、地域、セクター別にインデックス化して検索性能を向上
     * @returns {Promise<void>}
     * @throws {Error} インデックスの更新に失敗した場合（ログのみ、エラーは投げない）
     */
    async updateIndex() {
        try {
            const allAssets = await this.getAllAssets();
            const index = {
                byType: {},
                byRegion: {},
                bySector: {},
                lastUpdated: new Date().toISOString()
            };

            allAssets.forEach(asset => {
                // タイプ別インデックス
                if (!index.byType[asset.type]) {
                    index.byType[asset.type] = [];
                }
                index.byType[asset.type].push(asset.id);

                // 地域別インデックス
                if (!index.byRegion[asset.region]) {
                    index.byRegion[asset.region] = [];
                }
                index.byRegion[asset.region].push(asset.id);

                // セクター別インデックス
                if (asset.sector) {
                    if (!index.bySector[asset.sector]) {
                        index.bySector[asset.sector] = [];
                    }
                    index.bySector[asset.sector].push(asset.id);
                }
            });

            this.storage.save(this.indexKey, index);
            this.debugLog('インデックス更新完了');
        } catch (error) {
            this.debugLog('インデックス更新エラー:', error);
        }
    }

    /**
     * データベースの初期化
     * 既存データがない場合はサンプルデータを作成
     * @returns {Promise<void>}
     * @throws {Error} データベースの初期化に失敗した場合
     */
    async initializeDatabase() {
        try {
            const existingData = this.storage.load(this.storageKey);
            if (!existingData) {
                // サンプルデータを作成
                const sampleAssets = this.createSampleAssets();
                this.storage.save(this.storageKey, sampleAssets.map(a => a.toJSON()));
                await this.updateIndex();
                this.debugLog('データベース初期化完了（サンプルデータあり）');
            } else {
                this.debugLog('既存データベース確認完了');
            }
        } catch (error) {
            this.debugLog('データベース初期化エラー:', error);
            throw new Error(`データベースの初期化に失敗しました: ${error.message}`);
        }
    }

    /**
     * サンプル資産データを作成
     * デモンストレーション用の投資信託データを3件作成
     * @returns {Asset[]} サンプル資産データの配列
     */
    createSampleAssets() {
        return [
            new AssetEntity({
                name: '楽天・全米株式インデックスファンド',
                type: 'mutualFund',
                region: 'US',
                currency: 'JPY',
                totalInvestment: 150000,
                currentValue: 165000,
                sector: 'インデックス',
                description: '米国株式市場全体に分散投資'
            }),
            new AssetEntity({
                name: 'eMAXIS Slim 全世界株式（オール・カントリー）',
                type: 'mutualFund',
                region: 'OTHER',
                currency: 'JPY',
                totalInvestment: 200000,
                currentValue: 220000,
                sector: 'インデックス',
                description: '世界中の株式市場に分散投資'
            }),
            new AssetEntity({
                name: 'iFreeNEXT NASDAQ100インデックス',
                type: 'mutualFund',
                region: 'US',
                currency: 'JPY',
                totalInvestment: 100000,
                currentValue: 115000,
                sector: 'テクノロジー',
                description: 'NASDAQ100指数に連動'
            })
        ];
    }

    /**
     * デバッグモードの切り替え
     * @param {boolean} enabled - デバッグモードを有効にするかどうか
     * @returns {void}
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.debugLog('デバッグモード変更:', enabled ? 'ON' : 'OFF');
    }
}

export default AssetRepository;