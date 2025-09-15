import { AssetCalculator } from '../business/models/AssetCalculator.js';

/**
 * PortfolioService - Services Layer
 * ダッシュボード向けのサマリー/配分/ランキング取得を編成する。
 */
export class PortfolioService {
  /**
   * @param {Object} deps
   * @param {import('../data/repositories/AssetRepository.js').AssetRepository} deps.assetRepository
   */
  constructor({ assetRepository } = {}) {
    if (!assetRepository) throw new Error('assetRepository is required');
    this.assetRepository = assetRepository;
  }

  /**
   * ダッシュボード用サマリー（既存Repositoryの集約を流用）
   * 将来的に細粒度の計算分離（AssetCalculator利用）に移行可能。
   */
  async getDashboardSummary() {
    // まずは既存の集約結果を流用
    const summary = await this.assetRepository.getPortfolioSummary();
    return summary;
  }

  /**
   * 資産配分（現在価値ベース）を計算
   */
  async getAllocation() {
    const assets = await this.assetRepository.getActiveAssets();
    const total = assets.reduce((s, a) => s + (a.currentValue || 0), 0);
    return assets.map((a) => ({
      id: a.id,
      name: a.name,
      value: a.currentValue,
      percentage: total > 0 ? Number(((a.currentValue / total) * 100).toFixed(2)) : 0,
    }));
  }

  /**
   * ランキング（利益率降順）
   */
  async getRanking(limit = 5) {
    const assets = await this.assetRepository.getActiveAssets();
    const ranked = assets
      .map((a) => ({
        id: a.id,
        name: a.name,
        returnPercentage: AssetCalculator.getReturnPercentage(a),
      }))
      .sort((x, y) => y.returnPercentage - x.returnPercentage)
      .slice(0, limit);
    return ranked;
  }
}

export default PortfolioService;

