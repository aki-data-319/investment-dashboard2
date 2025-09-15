import { RakutenCsvParser } from '../infrastructure/parsers/RakutenCsvParser.js';
import { PortfolioAggregator } from '../business/analysis/PortfolioAggregator.js';
import { SectorService } from '../business/services/SectorService.js';
import { AssetEntity } from '../business/models/AssetEntity.js';

/**
 * CsvImportService - Services Layer
 * CSV取込のユースケースを編成：パース→検証/正規化→集約→セクター付与→保存。
 */
export class CsvImportService {
  /**
   * @param {Object} deps
   * @param {import('../data/repositories/AssetRepository.js').AssetRepository} deps.assetRepository
   * @param {SectorService} [deps.sectorService]
   */
  constructor({ assetRepository, sectorService } = {}) {
    if (!assetRepository) throw new Error('assetRepository is required');
    this.assetRepository = assetRepository;
    this.parser = new RakutenCsvParser({ debug: true });
    this.sectorService = sectorService || new SectorService();
  }

  /**
   * CSV文字列/ファイルをパースしてプレビューを返す
   * @param {File|string} fileOrText
   * @returns {Promise<{ transactions: Array<object>, warnings: string[], format: string }>}
   */
  async parseAndPreview(fileOrText) {
    if (typeof fileOrText === 'string') return this.parser.parseText(fileOrText);
    if (fileOrText && typeof fileOrText.text === 'function') return this.parser.parseFile(fileOrText);
    return { transactions: [], warnings: ['unsupported-input'], format: 'UNKNOWN' };
  }

  /**
   * 取引データを取り込み、（必要に応じて）保存
   * @param {Array<object>} transactions - TransactionDTO[]
   * @param {{ dedupe?: boolean, dryRun?: boolean }} [options]
   * @returns {Promise<{ imported: number, skipped: number, errors: Array<string> }>} 結果
   */
  async importTransactions(transactions = [], { dedupe = true, dryRun = false } = {}) {
    const positions = PortfolioAggregator.aggregateTransactions(transactions);
    const active = PortfolioAggregator.filterActivePositions(positions);
    let imported = 0; let skipped = 0; const errors = [];

    if (dryRun) {
      return { imported: active.length, skipped: 0, errors };
    }

    // 既存資産を取得して重複回避（name基準）
    const existing = await this.assetRepository.getAllAssets();
    const existingNames = new Set(existing.map((a) => (a.name || '').toLowerCase()));

    for (const pos of active) {
      try {
        const name = pos.symbol; // 初期はシンボル名をそのまま資産名に
        if (dedupe && existingNames.has((name || '').toLowerCase())) {
          skipped += 1; continue;
        }

        const dto = /** @type {import('../business/models/AssetEntity.js').AssetEntity} */ ({
          name,
          type: 'stock',
          region: pos.market === 'US' ? 'US' : (pos.market === 'JP' ? 'JP' : 'OTHER'),
          currency: pos.currency || 'JPY',
          totalInvestment: Math.round(pos.totalCost || 0),
          currentValue: Math.round(pos.totalCost || 0), // 初期は原価=現在価値
          quantity: pos.quantityNet || 0,
          averagePrice: pos.avgPrice || 0,
        });

        // セクター付与
        this.sectorService.assignSector(dto);

        // Entity経由で保存（Repositoryはプレーンを受け付ける）
        const entity = AssetEntity.createFromForm(dto);
        await this.assetRepository.addAsset(entity.toJSON());
        imported += 1;
        existingNames.add((name || '').toLowerCase());
      } catch (e) {
        errors.push(e?.message || 'unknown-error');
      }
    }

    return { imported, skipped, errors };
  }
}

export default CsvImportService;

