import { DataStoreManager } from '../managers/DataStoreManager.js';
import { TransactionEntity } from '../../domain/entities/TransactionEntity.js';

/**
 * TransactionRepository - Canonical transactions append-only store
 * 責務: TransactionEntityの保存・重複排除・期間取得
 */
export class TransactionRepository {
  constructor(storageAdapter, options = {}) {
    this.store = new DataStoreManager(storageAdapter, {
      namespacePrefix: options.namespacePrefix || 'investment-',
      versionKey: options.versionKey || 'investment-version',
      currentVersion: options.currentVersion || 1,
      debug: options.debug === true,
    });
    this.STORAGE_KEY = options.storageKey || 'investment-transactions';
    this.debugMode = options.debug === true;
  }

  debugLog(message, data = null) {
    if (this.debugMode) {
      console.log(`[TransactionRepository] ${message}`, data ?? '');
    }
  }

  /**
   * バッチ保存（append-only、指紋デデュープ）
   * @param {{ source: string; subtype: string; fileHash?: string; parserVersion?: string; }} batchMeta
   * @param {Array<TransactionEntity|Object>} txns
   * @param {{ dedupeBy?: 'fingerprint' }} [opts]
   * @returns {Promise<{ inserted: number; skipped: number; updated: number; total: number }>}
   */
  async upsertBatch(batchMeta, txns = [], opts = {}) {
    try {
      const dedupeBy = opts.dedupeBy || 'fingerprint';
      const existing = this.store.load(this.STORAGE_KEY) || [];

      // 既存の指紋セット
      const existingSet = new Set(existing.map((t) => (t.fingerprint)));

      let inserted = 0; let skipped = 0; let updated = 0;
      const toAppend = [];

      for (const t of txns) {
        try {
          const entity = t instanceof TransactionEntity ? t : new TransactionEntity(t);
          const json = entity.toJSON();

          const key = dedupeBy === 'fingerprint' ? json.fingerprint : json.fingerprint;
          if (existingSet.has(key)) {
            skipped += 1; continue;
          }

          // append-only: 新規のみ追加
          toAppend.push({ ...json, _batch: batchMeta });
          existingSet.add(key);
          inserted += 1;
        } catch (e) {
          console.error('[TransactionRepository.js] upsertBatch 内でエラー:', e?.message || e);
        }
      }

      const all = existing.concat(toAppend);
      const ok = this.store.save(this.STORAGE_KEY, all);
      if (!ok) throw new Error('transactionsの保存に失敗しました');

      this.debugLog('バッチ保存結果', { inserted, skipped, updated, total: all.length });
      return { inserted, skipped, updated, total: all.length };
    } catch (e) {
      console.error('[TransactionRepository.js] upsertBatch エラー:', e?.message || e);
      throw e;
    }
  }

  /**
   * 期間でリスト取得（inclusive）
   * @param {string} from - 'YYYY-MM-DD'
   * @param {string} to - 'YYYY-MM-DD'
   * @returns {Promise<Array<TransactionEntity>>}
   */
  async listByDateRange(from, to) {
    try {
      const rows = this.store.load(this.STORAGE_KEY) || [];
      const res = rows.filter((r) => {
        const d = r.tradeDate || r.trade_date; // フィールド名互換
        if (!d) return false;
        return (!from || d >= from) && (!to || d <= to);
      }).map((r) => new TransactionEntity(r));
      this.debugLog('期間取得', { from, to, count: res.length });
      return res;
    } catch (e) {
      console.error('[TransactionRepository.js] listByDateRange エラー:', e?.message || e);
      return [];
    }
  }

  /**
   * 全件取得
   * @returns {Promise<Array<TransactionEntity>>}
   */
  async getAll() {
    try {
      const rows = this.store.load(this.STORAGE_KEY) || [];
      return rows.map((r) => new TransactionEntity(r));
    } catch (e) {
      console.error('[TransactionRepository.js] getAll エラー:', e?.message || e);
      return [];
    }
  }
}

export default TransactionRepository;
