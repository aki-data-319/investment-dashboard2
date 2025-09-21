import { TransactionRepository } from '../data/repositories/TransactionRepository.js';
import { ExposureRepository } from '../data/repositories/ExposureRepository.js';
import { PortfolioAggregator } from '../business/analysis/PortfolioAggregator.js';

/**
 * PortfolioAnalysisService (v3)
 * 目的: canonical transactions → positions → exposure 集計のユースケースを提供
 */
export class PortfolioAnalysisService {
  /**
   * @param {Object} deps
   * @param {TransactionRepository} [deps.transactionRepository]
   * @param {ExposureRepository} [deps.exposureRepository]
   */
  constructor({ transactionRepository, exposureRepository } = {}) {
    this.transactionRepository = transactionRepository || new TransactionRepository();
    this.exposureRepository = exposureRepository || new ExposureRepository();
  }

  /**
   * ポートフォリオ分析（セクター/地域配分、positions含む）
   * @param {{ dateFrom?: string, dateTo?: string }} [opts]
   * @returns {Promise<{ positions: Array<object>, exposure: { sector: Array<object>, region: Array<object>, totalValue: number } }>} 
   */
  async analyze(opts = {}) {
    try {
      const { dateFrom, dateTo } = opts;
      const entities = (dateFrom || dateTo)
        ? await this.transactionRepository.listByDateRange(dateFrom || '0000-00-00', dateTo || '9999-12-31')
        : await this.transactionRepository.getAll();

      const positions = PortfolioAggregator.fromEntitiesToPositions(entities);

      const exposureRepoAdapter = {
        getSectorExposure: (instrumentKey, asOf) => this.exposureRepository.getSectorExposure(instrumentKey, asOf),
        getRegionExposure: (instrumentKey, asOf) => this.exposureRepository.getRegionExposure(instrumentKey, asOf),
      };

      const exposure = PortfolioAggregator.aggregateExposure(positions, exposureRepoAdapter);
      return { positions, exposure };
    } catch (e) {
      console.error('[PortfolioAnalysisService.js] analyze エラー:', e?.message || e);
      return { positions: [], exposure: { sector: [], region: [], totalValue: 0 } };
    }
  }
}

export default PortfolioAnalysisService;
