import { RakutenCsvParser } from '../infrastructure/parsers/RakutenCsvParser.js';
import { PortfolioAggregator } from '../business/analysis/PortfolioAggregator.js';
import { SectorService } from '../business/services/SectorService.js';
import { AssetEntity } from '../domain/entities/AssetEntity.js';
import { TransactionRepository } from '../data/repositories/TransactionRepository.js';
import { TransactionEntity } from '../domain/entities/TransactionEntity.js';

/**
 * CsvImportService - CSV取り込みサービス
 * @description CSV取込のユースケースを編成：パース→検証/正規化→集約→セクター付与→保存
 * @author Investment Dashboard v2 Team
 * @version 2.0.0
 * @updated 2025-09-21 - RakutenCsvParser v2統合対応
 * 
 * 責務: CSV→トランザクション変換、ポートフォリオ集約、データベース保存
 * 配置: src/services/ (Application Layer)
 */
export class CsvImportService {
  /**
   * CsvImportServiceコンストラクタ
   * @description CSV取り込み処理に必要な依存関係を初期化
   * @param {Object} deps - 依存関係オブジェクト
   * @param {import('../data/repositories/AssetRepository.js').AssetRepository} deps.assetRepository - 資産リポジトリ
   * @param {SectorService} [deps.sectorService] - セクターサービス（オプション）
   * @throws {Error} assetRepositoryが未指定の場合
   * @example
   * const service = new CsvImportService({ 
   *   assetRepository: repository,
   *   sectorService: sectorService 
   * });
   */
  constructor({ assetRepository, sectorService, transactionRepository } = {}) {
    if (!assetRepository) throw new Error('assetRepository is required');
    this.assetRepository = assetRepository;
    this.parser = new RakutenCsvParser(); // 新版は引数なし
    this.sectorService = sectorService || new SectorService();
    this.transactionRepository = transactionRepository || null;
    
    // デフォルトCSV形式設定（ユーザー選択も可能）
    this.defaultCsvType = 'JP';
  }

  /**
   * CSVファイル解析プレビュー（v2対応版）
   * @description 楽天証券CSVファイルを解析してプレビューデータを生成
   * @param {File} file - 解析対象CSVファイル
   * @param {string} [csvType='JP'] - CSV形式（'JP'|'US'|'INVST'）
   * @param {function} [progressCallback=null] - 進捗コールバック
   * @returns {Promise<Object>} プレビュー結果
   * @throws {Error} ファイル読み込み失敗、解析エラー
   * @example
   * const preview = await service.parseAndPreview(file, 'JP', 
   *   (progress, message) => console.log(`${progress}%: ${message}`)
   * );
   * // { success: true, data: [...], csvType: 'JP', ... }
   */
  async parseAndPreview(file, csvType = null, progressCallback = null) {
    try {
      console.log('🔄 CSV解析開始:', { fileName: file.name, csvType });
      
      // ファイル検証
      if (!file || typeof file.name !== 'string') {
        throw new Error('有効なファイルが指定されていません');
      }
      
      // CSV形式を決定（引数 > デフォルト）
      const selectedCsvType = csvType || this.defaultCsvType;
      
      // 新しいRakutenCsvParserでファイル解析
      let parseResult;
      try {
        parseResult = await this.parser.parseCsvFile(
          file,
          selectedCsvType,
          progressCallback
        );
      } catch (e) {
        console.error('[CsvImportService.js] parseCsvFile 呼び出しでエラー:', e?.message || e);
        throw e;
      }
      
      if (!parseResult.success) {
        throw new Error(`CSV解析エラー: ${parseResult.error}`);
      }
      
      console.log('✅ CSV解析成功:', {
        csvType: parseResult.csvType,
        originalRows: parseResult.originalRows,
        convertedRows: parseResult.convertedRows
      });
      
      // v2形式のデータを旧API形式に変換（互換性のため）
      const compatibleResult = {
        transactions: parseResult.data || [],
        warnings: parseResult.debugInfo?.encodingSuccess ? [] : ['encoding-issues'],
        format: this.mapCsvTypeToFormat(parseResult.csvType),
        // 新しい情報も追加
        csvType: parseResult.csvType,
        originalFileName: parseResult.fileName,
        parseMetadata: {
          originalRows: parseResult.originalRows,
          convertedRows: parseResult.convertedRows,
          parseDate: parseResult.parseDate,
          headers: parseResult.headers
        }
      };
      
      // v3エンティティをプレビュー用に射影
      const entities = parseResult.entities || [];
      const projected = this.previewProjection(entities, selectedCsvType);
      return {
        transactions: projected,
        warnings: compatibleResult.warnings || [],
        format: compatibleResult.format,
        csvType: parseResult.csvType,
        originalFileName: parseResult.fileName,
        parseMetadata: compatibleResult.parseMetadata,
      };
      
    } catch (error) {
      console.error('[CsvImportService.js] parseAndPreview エラー:', error?.message || error);
      return {
        transactions: [],
        warnings: ['parse-error'],
        format: 'ERROR',
        error: error.message
      };
    }
  }

  /**
   * 旧API互換性のためのフォーマットマッピング
   * @description 新しいcsvTypeを旧formatに変換
   * @param {string} csvType - 新しいCSV形式（'JP'|'US'|'INVST'）
   * @returns {string} 旧形式（'JP_STOCK'|'US_STOCK'|'FUND'）
   * @private
   */
  mapCsvTypeToFormat(csvType) {
    const mapping = {
      'JP': 'JP_STOCK',
      'US': 'US_STOCK',
      'INVST': 'FUND'
    };
    return mapping[csvType] || 'UNKNOWN';
  }

  /**
   * CSV形式設定
   * @description デフォルトCSV形式を設定
   * @param {string} csvType - CSV形式（'JP'|'US'|'INVST'）
   * @returns {void}
   * @example
   * service.setCsvType('US'); // 米国株式形式に設定
   */
  setCsvType(csvType) {
    if (!['JP', 'US', 'INVST'].includes(csvType)) {
      throw new Error(`サポートされていないCSV形式: ${csvType}`);
    }
    this.defaultCsvType = csvType;
    console.log('📋 デフォルトCSV形式設定:', csvType);
  }

  /**
   * サポート済みCSV形式一覧取得
   * @description 利用可能なCSV形式の一覧を取得
   * @returns {Array<Object>} CSV形式情報配列
   * @static
   * @example
   * const formats = CsvImportService.getSupportedFormats();
   * // [{ key: 'JP', description: '日本株式取引履歴' }, ...]
   */
  static getSupportedFormats() {
    return RakutenCsvParser.getSupportedFormats();
  }

  /**
   * v3: TransactionEntity[] を台帳に保存
   * @param {Array<object>} entities - TransactionEntity[] or plain objects
   * @param {{ source: string; subtype: string; fileHash?: string; parserVersion?: string; }} batchMeta
   * @returns {Promise<{ inserted: number; skipped: number; updated: number; total: number }>}
   */
  async importTransactionsV3(entities = [], batchMeta = { source: 'rakuten', subtype: 'unknown' }) {
    if (!this.transactionRepository) {
      // 簡易デフォルト（LocalStorageAdapter不在でもDataStoreManagerのフォールバックで保存）
      this.transactionRepository = new TransactionRepository();
    }
    try {
      const version = (typeof this.parser.constructor.getVersion === 'function')
        ? this.parser.constructor.getVersion()?.version
        : 'unknown';
      const meta = { ...batchMeta, parserVersion: version };
      return await this.transactionRepository.upsertBatch(meta, entities, { dedupeBy: 'fingerprint' });
    } catch (e) {
      console.error('[CsvImportService.js] importTransactionsV3 エラー:', e?.message || e);
      throw e;
    }
  }

  /**
   * v3: CSV→parse→TransactionEntity保存の一括ユースケース
   */
  async parseAndImport(file, csvType = null, progressCallback = null, options = {}) {
    const selectedCsvType = csvType || this.defaultCsvType;
    let result;
    try {
      result = await this.parser.parseCsvFile(file, selectedCsvType, progressCallback);
    } catch (e) {
      console.error('[CsvImportService.js] parseAndImport/parseCsvFile エラー:', e?.message || e);
      throw e;
    }
    if (!result.success) throw new Error(result.error || 'parse failed');
    const entities = result.entities || [];
    const batchMeta = { source: 'rakuten', subtype: selectedCsvType === 'JP' ? 'jp_equity' : (selectedCsvType === 'US' ? 'us_equity' : 'mutual_fund') };
    let upsert;
    try {
      if (options?.dryRun) {
        upsert = { inserted: entities.length, skipped: 0, updated: 0, total: (this.transactionRepository ? (await this.transactionRepository.getAll()).length : 0) };
      } else {
        upsert = await this.importTransactionsV3(entities, batchMeta);
      }
    } catch (e) {
      console.error('[CsvImportService.js] parseAndImport/upsert エラー:', e?.message || e);
      throw e;
    }

    // 受け入れチェック（簡易）
    try {
      const acceptance = this.checkImportAcceptance(entities, upsert);
      console.info('[CsvImportService.js] 受け入れチェック: 符号規約', `不一致 ${acceptance.sign.mismatch}/${acceptance.sign.total} (${(acceptance.sign.rate*100).toFixed(2)}%)`);
      console.info('[CsvImportService.js] 受け入れチェック: デデュープ', `inserted=${acceptance.dedupe.inserted}, skipped=${acceptance.dedupe.skipped}, updated=${acceptance.dedupe.updated}`);
      console.info('[CsvImportService.js] 受け入れチェック: 円キャッシュフロー', `流入=¥${Math.round(acceptance.cashflow.inflowJpy).toLocaleString()}, 流出=¥${Math.round(acceptance.cashflow.outflowJpy).toLocaleString()}, ネット=¥${Math.round(acceptance.cashflow.netJpy).toLocaleString()}, 換算不可=${acceptance.cashflow.unknownFx}件`);
    } catch (e) {
      console.warn('[CsvImportService.js] 受け入れチェックの実行に失敗:', e?.message || e);
    }
    return { parse: result, upsert };
  }

  // 旧名称の互換ラッパー（後で削除可）
  async parseImportV3(file, csvType = null, progressCallback = null) {
    return this.parseAndImport(file, csvType, progressCallback);
  }

  /**
   * TransactionEntity[] を UIプレビュー用に射影
   * @param {Array<object>} entities
   * @param {'JP'|'US'|'INVST'} csvType
   * @returns {Array<object>} PreviewRow[]
   */
  previewProjection(entities = [], csvType) {
    const marketFromSubtype = (sub) => {
      if (sub === 'jp_equity') return 'JP';
      if (sub === 'us_equity') return 'US';
      if (sub === 'mutual_fund') return 'FUND';
      return sub || (csvType || '');
    };
    return entities.slice(0, 1000).map((e) => ({
      executedAt: e.tradeDate,
      market: e.market || marketFromSubtype(e.subtype),
      symbol: e.symbol || e.name,
      side: e.tradeType,
      quantity: e.quantity,
      price: e.price,
      amount: e.settledAmount,
      currency: e.settledCurrency,
    }));
  }

  /**
   * 受け入れチェック（簡易）
   * Application Layer: 取込ユースケース完了時点のサマリー検証
   * @param {Array<object>} entities - TransactionEntity[] or plain
   * @param {{ inserted:number, skipped:number, updated:number }} upsert
   */
  checkImportAcceptance(entities = [], upsert = { inserted: 0, skipped: 0, updated: 0 }) {
    const total = Array.isArray(entities) ? entities.length : 0;
    let mismatch = 0;
    let inflowJpy = 0;
    let outflowJpy = 0;
    let unknownFx = 0;

    const expectedSign = (tradeType) => TransactionEntity.expectedSignByTradeType(tradeType || '');
    const toJpy = (e) => {
      const amt = Number(e.settledAmount || 0);
      const cur = (e.settledCurrency || e.currency || '').toUpperCase();
      if (cur === 'JPY') return amt;
      const fx = Number(e.fxRate || 0);
      if (!fx || Number.isNaN(fx)) { unknownFx += 1; return 0; }
      return amt * fx;
    };

    for (const e of (entities || [])) {
      const amt = Number(e?.settledAmount || 0);
      const exp = expectedSign(e?.tradeType);
      if (exp === 'positive' && !(amt >= 0)) mismatch += 1;
      else if (exp === 'negative' && !(amt <= 0)) mismatch += 1;
      // any は不問

      const jpy = toJpy(e);
      if (jpy >= 0) inflowJpy += jpy; else outflowJpy += jpy; // outflow は負のはず
    }

    const netJpy = inflowJpy + outflowJpy;
    const rate = total > 0 ? mismatch / total : 0;

    return {
      sign: { mismatch, total, rate },
      dedupe: { inserted: upsert.inserted || 0, skipped: upsert.skipped || 0, updated: upsert.updated || 0 },
      cashflow: { inflowJpy, outflowJpy, netJpy, unknownFx },
    };
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

        const dto = /** @type {import('../domain/entities/AssetEntity.js').AssetEntity} */ ({
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
