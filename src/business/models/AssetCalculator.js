import { AssetEntity } from '../../domain/entities/AssetEntity.js';

/**
 * AssetCalculator - 投資資産の計算・分析エンジン
 * @description AssetEntityを受け取り各種計算を実行する静的クラス
 * 責任: 損益計算、利益率計算、ポートフォリオ分析、パフォーマンス比較、リスク分析
 */
export class AssetCalculator {

    // ========================================
    // 基本計算メソッド
    // ========================================

    /**
     * 評価損益を計算
     * @description 現在価値と総投資額の差額を計算して評価損益を返します
     * @param {AssetEntity} assetEntity - 計算対象の資産エンティティ
     * @returns {number} 評価損益（正の値は利益、負の値は損失）
     * @static
     * @example
     * const assetEntity = new AssetEntity({ totalInvestment: 1000000, currentValue: 1100000 });
     * const gainLoss = AssetCalculator.getUnrealizedGainLoss(assetEntity); // 100000 (10万円の利益)
     */
    static getUnrealizedGainLoss(assetEntity) {
        if (!(assetEntity instanceof AssetEntity)) {
            throw new Error('AssetEntityインスタンスが必要です');
        }

        const gainLoss = assetEntity.currentValue - assetEntity.totalInvestment;
        console.log(`📊 計算: ${assetEntity.name} 評価損益 = ¥${gainLoss.toLocaleString()}`);
        return gainLoss;
    }

    /**
     * 利益率を計算（パーセンテージ）
     * @description 投資に対する利益率をパーセンテージで計算します
     * @param {AssetEntity} assetEntity - 計算対象の資産エンティティ
     * @returns {number} 利益率（パーセント単位、例：10.5は10.5%を意味）
     * @static
     * @example
     * const assetEntity = new AssetEntity({ totalInvestment: 1000000, currentValue: 1100000 });
     * const returnPct = AssetCalculator.getReturnPercentage(assetEntity); // 10.0 (10%の利益)
     * 
     * // 総投資額が0の場合
     * const zeroAsset = new AssetEntity({ totalInvestment: 0 });
     * const returnPct = AssetCalculator.getReturnPercentage(zeroAsset); // 0
     */
    static getReturnPercentage(assetEntity) {
        if (!(assetEntity instanceof AssetEntity)) {
            throw new Error('AssetEntityインスタンスが必要です');
        }

        if (assetEntity.totalInvestment === 0) {
            console.log(`⚠️ 計算: ${assetEntity.name} 総投資額が0のため利益率は0%`);
            return 0;
        }

        const returnPct = ((assetEntity.currentValue - assetEntity.totalInvestment) / assetEntity.totalInvestment) * 100;
        console.log(`📊 計算: ${assetEntity.name} 利益率 = ${returnPct.toFixed(2)}%`);
        return returnPct;
    }

    /**
     * 平均取得価格を計算
     * @description 総投資額と保有数量から平均取得価格を計算します
     * @param {AssetEntity} assetEntity - 計算対象の資産エンティティ
     * @returns {number} 平均取得価格（数量が0の場合は0を返す）
     * @static
     * @example
     * const assetEntity = new AssetEntity({ totalInvestment: 1000000, quantity: 500 });
     * const avgPrice = AssetCalculator.getAveragePrice(assetEntity); // 2000 (1口あたり2000円)
     */
    static getAveragePrice(assetEntity) {
        if (!(assetEntity instanceof AssetEntity)) {
            throw new Error('AssetEntityインスタンスが必要です');
        }

        if (assetEntity.quantity === 0) {
            console.log(`⚠️ 計算: ${assetEntity.name} 保有数量が0のため平均取得価格は0`);
            return 0;
        }

        const avgPrice = assetEntity.totalInvestment / assetEntity.quantity;
        console.log(`📊 計算: ${assetEntity.name} 平均取得価格 = ¥${avgPrice.toLocaleString()}`);
        return avgPrice;
    }

    /**
     * 資産の要約情報を生成（計算値込み）
     * @description 資産の主要情報と計算結果をまとめたサマリーオブジェクトを返します
     * @param {AssetEntity} assetEntity - 計算対象の資産エンティティ
     * @returns {Object} 資産要約オブジェクト
     * @returns {string} returns.id - 資産ID
     * @returns {string} returns.name - 資産名
     * @returns {string} returns.type - 資産タイプ
     * @returns {string} returns.region - 地域
     * @returns {number} returns.totalInvestment - 総投資額
     * @returns {number} returns.currentValue - 現在価値
     * @returns {number} returns.unrealizedGainLoss - 評価損益
     * @returns {number} returns.returnPercentage - 利益率（%）
     * @returns {boolean} returns.isProfit - 利益状態かどうか
     * @returns {number} returns.averagePrice - 平均取得価格
     * @returns {string|null} returns.sector - セクター
     * @returns {string} returns.createdAt - 作成日時
     * @returns {string} returns.updatedAt - 更新日時
     * @static
     * @example
     * const assetEntity = new AssetEntity({ name: 'テスト投信', totalInvestment: 100000, currentValue: 110000 });
     * const summary = AssetCalculator.getSummaryWithCalculations(assetEntity);
     * console.log(`${summary.name}: ${summary.isProfit ? '利益' : '損失'}`);
     */
    static getSummaryWithCalculations(assetEntity) {
        if (!(assetEntity instanceof AssetEntity)) {
            throw new Error('AssetEntityインスタンスが必要です');
        }

        const unrealizedGainLoss = this.getUnrealizedGainLoss(assetEntity);
        const returnPercentage = this.getReturnPercentage(assetEntity);
        const averagePrice = this.getAveragePrice(assetEntity);

        return {
            id: assetEntity.id,
            name: assetEntity.name,
            type: assetEntity.type,
            region: assetEntity.region,
            totalInvestment: assetEntity.totalInvestment,
            currentValue: assetEntity.currentValue,
            unrealizedGainLoss: unrealizedGainLoss,
            returnPercentage: returnPercentage,
            isProfit: unrealizedGainLoss >= 0,
            averagePrice: averagePrice,
            sector: assetEntity.sector,
            createdAt: assetEntity.createdAt,
            updatedAt: assetEntity.updatedAt
        };
    }

    // ========================================
    // ポートフォリオ計算メソッド
    // ========================================

    /**
     * ポートフォリオの総価値を計算
     * @description 複数資産の現在価値の合計を計算します
     * @param {Array<AssetEntity>} assetEntities - 資産エンティティの配列
     * @returns {number} ポートフォリオの総価値
     * @static
     * @example
     * const assets = [asset1, asset2, asset3];
     * const totalValue = AssetCalculator.getTotalValue(assets); // 3000000
     */
    static getTotalValue(assetEntities) {
        if (!Array.isArray(assetEntities)) {
            throw new Error('AssetEntityの配列が必要です');
        }

        const totalValue = assetEntities
            .filter(asset => asset instanceof AssetEntity)
            .reduce((sum, asset) => sum + asset.currentValue, 0);

        console.log(`📊 ポートフォリオ総価値: ¥${totalValue.toLocaleString()}`);
        return totalValue;
    }

    /**
     * ポートフォリオの総投資額を計算
     * @description 複数資産の総投資額の合計を計算します
     * @param {Array<AssetEntity>} assetEntities - 資産エンティティの配列
     * @returns {number} ポートフォリオの総投資額
     * @static
     */
    static getTotalInvestment(assetEntities) {
        if (!Array.isArray(assetEntities)) {
            throw new Error('AssetEntityの配列が必要です');
        }

        const totalInvestment = assetEntities
            .filter(asset => asset instanceof AssetEntity)
            .reduce((sum, asset) => sum + asset.totalInvestment, 0);

        console.log(`📊 ポートフォリオ総投資額: ¥${totalInvestment.toLocaleString()}`);
        return totalInvestment;
    }

    /**
     * ポートフォリオの資産配分を計算
     * @description 各資産がポートフォリオ全体に占める割合を計算します
     * @param {Array<AssetEntity>} assetEntities - 資産エンティティの配列
     * @returns {Array<Object>} 各資産の配分情報
     * @static
     * @example
     * const allocation = AssetCalculator.getPortfolioAllocation(assets);
     * // [{ name: 'Asset A', value: 1000000, percentage: 33.33 }, ...]
     */
    static getPortfolioAllocation(assetEntities) {
        if (!Array.isArray(assetEntities)) {
            throw new Error('AssetEntityの配列が必要です');
        }

        const validAssets = assetEntities.filter(asset => asset instanceof AssetEntity);
        const totalValue = this.getTotalValue(validAssets);

        if (totalValue === 0) {
            console.log('⚠️ ポートフォリオの総価値が0のため配分計算をスキップ');
            return validAssets.map(asset => ({
                id: asset.id,
                name: asset.name,
                value: asset.currentValue,
                percentage: 0
            }));
        }

        const allocation = validAssets.map(asset => {
            const percentage = (asset.currentValue / totalValue) * 100;
            return {
                id: asset.id,
                name: asset.name,
                value: asset.currentValue,
                percentage: parseFloat(percentage.toFixed(2))
            };
        });

        console.log('📊 ポートフォリオ配分計算完了');
        return allocation;
    }

    /**
     * ポートフォリオのパフォーマンスを計算
     * @description ポートフォリオ全体の損益と利益率を計算します
     * @param {Array<AssetEntity>} assetEntities - 資産エンティティの配列
     * @returns {Object} ポートフォリオパフォーマンス情報
     * @static
     */
    static getPortfolioPerformance(assetEntities) {
        if (!Array.isArray(assetEntities)) {
            throw new Error('AssetEntityの配列が必要です');
        }

        const validAssets = assetEntities.filter(asset => asset instanceof AssetEntity);
        const totalValue = this.getTotalValue(validAssets);
        const totalInvestment = this.getTotalInvestment(validAssets);
        const unrealizedGainLoss = totalValue - totalInvestment;
        const returnPercentage = totalInvestment > 0 ? ((totalValue - totalInvestment) / totalInvestment) * 100 : 0;

        const performance = {
            totalValue,
            totalInvestment,
            unrealizedGainLoss,
            returnPercentage: parseFloat(returnPercentage.toFixed(2)),
            isProfit: unrealizedGainLoss >= 0,
            assetCount: validAssets.length
        };

        console.log(`📊 ポートフォリオパフォーマンス: ${performance.isProfit ? '利益' : '損失'} ${performance.returnPercentage}%`);
        return performance;
    }

    // ========================================
    // 比較・ランキングメソッド
    // ========================================

    /**
     * 2つの資産のパフォーマンスを比較
     * @description 2つの資産の利益率を比較し、結果を返します
     * @param {AssetEntity} asset1 - 比較対象資産1
     * @param {AssetEntity} asset2 - 比較対象資産2
     * @returns {Object} 比較結果
     * @static
     */
    static comparePerformance(asset1, asset2) {
        if (!(asset1 instanceof AssetEntity) || !(asset2 instanceof AssetEntity)) {
            throw new Error('両方ともAssetEntityインスタンスが必要です');
        }

        const return1 = this.getReturnPercentage(asset1);
        const return2 = this.getReturnPercentage(asset2);

        let winner, loser, difference;
        
        if (return1 > return2) {
            winner = asset1;
            loser = asset2;
            difference = return1 - return2;
        } else if (return2 > return1) {
            winner = asset2;
            loser = asset1;
            difference = return2 - return1;
        } else {
            // 同じパフォーマンス
            winner = null;
            loser = null;
            difference = 0;
        }

        const comparison = {
            asset1: { name: asset1.name, returnPercentage: return1 },
            asset2: { name: asset2.name, returnPercentage: return2 },
            winner: winner ? winner.name : 'TIE',
            difference: parseFloat(difference.toFixed(2))
        };

        console.log(`📊 パフォーマンス比較: ${comparison.winner} が ${comparison.difference}% 優位`);
        return comparison;
    }

    /**
     * 資産をパフォーマンスでランキング
     * @description 資産配列を利益率順でソートしてランキングを作成します
     * @param {Array<AssetEntity>} assetEntities - 資産エンティティの配列
     * @param {string} [order='desc'] - ソート順序 ('desc' または 'asc')
     * @returns {Array<Object>} パフォーマンスランキング
     * @static
     */
    static rankAssetsByPerformance(assetEntities, order = 'desc') {
        if (!Array.isArray(assetEntities)) {
            throw new Error('AssetEntityの配列が必要です');
        }

        const validAssets = assetEntities.filter(asset => asset instanceof AssetEntity);

        const ranking = validAssets.map(asset => ({
            id: asset.id,
            name: asset.name,
            returnPercentage: this.getReturnPercentage(asset),
            unrealizedGainLoss: this.getUnrealizedGainLoss(asset),
            totalInvestment: asset.totalInvestment,
            currentValue: asset.currentValue
        }));

        // ソート実行
        ranking.sort((a, b) => {
            if (order === 'asc') {
                return a.returnPercentage - b.returnPercentage;
            }
            return b.returnPercentage - a.returnPercentage; // desc
        });

        // ランク番号追加
        ranking.forEach((item, index) => {
            item.rank = index + 1;
        });

        console.log(`📊 パフォーマンスランキング作成完了: ${validAssets.length}件`);
        return ranking;
    }

    /**
     * トップパフォーマーを取得
     * @description 指定された件数の上位パフォーマンス資産を取得します
     * @param {Array<AssetEntity>} assetEntities - 資産エンティティの配列
     * @param {number} [count=5] - 取得件数
     * @returns {Array<Object>} トップパフォーマー情報
     * @static
     */
    static getTopPerformers(assetEntities, count = 5) {
        const ranking = this.rankAssetsByPerformance(assetEntities, 'desc');
        const topPerformers = ranking.slice(0, count);

        console.log(`📊 トップパフォーマー取得: 上位${count}件`);
        return topPerformers;
    }

    // ========================================
    // リスク分析メソッド（将来拡張用）
    // ========================================

    /**
     * シャープレシオを計算（簡易版）
     * @description リスクフリーレートを用いてシャープレシオを計算します
     * @param {AssetEntity} assetEntity - 計算対象の資産エンティティ
     * @param {number} riskFreeRate - リスクフリーレート（年率%）
     * @returns {number} シャープレシオ（簡易計算）
     * @static
     * @example
     * const sharpeRatio = AssetCalculator.getSharpeRatio(assetEntity, 2.0); // リスクフリーレート2%
     */
    static getSharpeRatio(assetEntity, riskFreeRate = 0) {
        if (!(assetEntity instanceof AssetEntity)) {
            throw new Error('AssetEntityインスタンスが必要です');
        }

        const returnPercentage = this.getReturnPercentage(assetEntity);
        const excessReturn = returnPercentage - riskFreeRate;
        
        // 注意: 本来はボラティリティ（標準偏差）が必要だが、
        // 簡易版として固定値を使用（実装では価格履歴データが必要）
        const assumedVolatility = 15; // 仮定: 15%のボラティリティ
        
        const sharpeRatio = excessReturn / assumedVolatility;

        console.log(`📊 シャープレシオ（簡易版）: ${assetEntity.name} = ${sharpeRatio.toFixed(3)}`);
        return parseFloat(sharpeRatio.toFixed(3));
    }

    // ========================================
    // ユーティリティメソッド
    // ========================================

    /**
     * 投資効率性を評価
     * @description 投資額に対する効率性を評価します
     * @param {AssetEntity} assetEntity - 評価対象の資産エンティティ
     * @returns {Object} 効率性評価結果
     * @static
     */
    static evaluateInvestmentEfficiency(assetEntity) {
        if (!(assetEntity instanceof AssetEntity)) {
            throw new Error('AssetEntityインスタンスが必要です');
        }

        const returnPercentage = this.getReturnPercentage(assetEntity);
        const gainLoss = this.getUnrealizedGainLoss(assetEntity);
        
        let rating, comment;
        
        if (returnPercentage >= 10) {
            rating = 'EXCELLENT';
            comment = '優秀な投資パフォーマンス';
        } else if (returnPercentage >= 5) {
            rating = 'GOOD';
            comment = '良好な投資パフォーマンス';
        } else if (returnPercentage >= 0) {
            rating = 'FAIR';
            comment = 'まずまずの投資パフォーマンス';
        } else if (returnPercentage >= -5) {
            rating = 'POOR';
            comment = '投資パフォーマンスに改善が必要';
        } else {
            rating = 'VERY_POOR';
            comment = '投資パフォーマンスが大幅に悪化';
        }

        const evaluation = {
            name: assetEntity.name,
            returnPercentage: returnPercentage,
            gainLoss: gainLoss,
            rating: rating,
            comment: comment,
            evaluatedAt: new Date().toISOString()
        };

        console.log(`📊 投資効率評価: ${assetEntity.name} = ${rating} (${returnPercentage.toFixed(2)}%)`);
        return evaluation;
    }
}

export default AssetCalculator;
