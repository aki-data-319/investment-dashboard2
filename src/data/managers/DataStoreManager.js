/**
 * DataStoreManager - Data Layer
 * 旧DataManagerの責務から「ストレージ抽象・バージョン管理・バックアップ/リストア・マイグレーション」を抽出。
 * 注意: ドメインの検証や集約などのビジネスロジックは持たない（Repository/Business/Servicesへ委譲）。
 */

// import { LocalStorageAdapter } from '../../infrastructure/LocalStorageAdapter.js';

export class DataStoreManager {
  /**
   * @param {Object} adapter - ストレージアダプタ（LocalStorageAdapter互換: save/load/remove/getKeys/exportData/importData/getStorageInfo）
   * @param {Object} [options]
   * @param {string} [options.namespacePrefix='investment-'] - キーの名前空間プレフィックス
   * @param {string} [options.versionKey='investment-version'] - スキーマバージョン保存キー
   * @param {number} [options.currentVersion=1] - 現行スキーマバージョン
   * @param {boolean} [options.debug=true] - デバッグログ有効化
   */
  constructor(adapter, options = {}) {
    if (!adapter || typeof adapter.save !== 'function' || typeof adapter.load !== 'function') {
      throw new Error('Valid storage adapter is required');
    }

    this.adapter = adapter;
    this.namespacePrefix = options.namespacePrefix ?? 'investment-';
    this.versionKey = options.versionKey ?? 'investment-version';
    this.currentVersion = options.currentVersion ?? 1;
    this.debugMode = options.debug ?? true;
  }

  // ----------------------------------------
  // 基本ユーティリティ
  // ----------------------------------------

  debugLog(message, data = null) {
    if (this.debugMode) {
      // eslint-disable-next-line no-console
      console.log(`[DataStoreManager] ${message}`, data ?? '');
    }
  }

  /**
   * 名前空間付きキーに正規化
   * @param {string} key
   * @returns {string}
   */
  ns(key) {
    if (!key) return this.namespacePrefix;
    return key.startsWith(this.namespacePrefix) ? key : `${this.namespacePrefix}${key}`;
  }

  // ----------------------------------------
  // CRUD（生データ）
  // ----------------------------------------

  /**
   * データ保存
   * @param {string} key - 論理キー（名前空間は自動付与）
   * @param {*} data - 保存するJSONシリアライズ可能なデータ
   * @returns {boolean}
   */
  save(key, data) {
    const k = this.ns(key);
    const ok = this.adapter.save(k, data);
    this.debugLog(`save: ${k} -> ${ok ? 'OK' : 'NG'}`);
    return ok;
  }

  /**
   * データ読込
   * @param {string} key
   * @param {*} [defaultValue=null]
   * @returns {*} 読み込んだデータ、存在しない場合はdefaultValue
   */
  load(key, defaultValue = null) {
    const k = this.ns(key);
    const value = this.adapter.load(k);
    if (value === null || value === undefined) {
      this.debugLog(`load: ${k} -> <default>`);
      return defaultValue;
    }
    this.debugLog(`load: ${k} -> OK`);
    return value;
  }

  /**
   * データ削除
   * @param {string} key
   * @returns {boolean}
   */
  remove(key) {
    const k = this.ns(key);
    const ok = typeof this.adapter.remove === 'function' ? this.adapter.remove(k) : false;
    this.debugLog(`remove: ${k} -> ${ok ? 'OK' : 'NG'}`);
    return ok;
  }

  /**
   * キー一覧
   * @param {string} [pattern] - 部分一致パターン（デフォルトは名前空間プレフィックス）
   * @returns {string[]}
   */
  listKeys(pattern = this.namespacePrefix) {
    if (typeof this.adapter.getKeys !== 'function') return [];
    const keys = this.adapter.getKeys(pattern);
    this.debugLog('listKeys', { pattern, count: keys.length });
    return keys;
  }

  // ----------------------------------------
  // バージョン管理 / マイグレーション
  // ----------------------------------------

  /**
   * 現在のスキーマバージョン情報を取得
   * @returns {{ schemaVersion: number, migratedAt?: string }}
   */
  getVersion() {
    const meta = this.adapter.load(this.versionKey);
    if (!meta || typeof meta.schemaVersion !== 'number') {
      return { schemaVersion: this.currentVersion };
    }
    return meta;
  }

  /**
   * スキーマバージョンを保存
   * @param {number} schemaVersion
   * @returns {boolean}
   */
  setVersion(schemaVersion) {
    const payload = { schemaVersion, migratedAt: new Date().toISOString() };
    const ok = this.adapter.save(this.versionKey, payload);
    this.debugLog(`setVersion -> v${schemaVersion} (${ok ? 'OK' : 'NG'})`);
    return ok;
  }

  /**
   * マイグレーション実行（汎用フレーム）
   * @param {Object} plan
   * @param {number} plan.fromVersion
   * @param {number} plan.toVersion
   * @param {Object<number,function(DataStoreManager):Promise<void>|void>} plan.steps - version→handler
   * @returns {Promise<{ applied:number[], from:number, to:number }>}
   */
  async migrate({ fromVersion, toVersion, steps = {} }) {
    const current = this.getVersion().schemaVersion ?? fromVersion;
    const start = Math.min(current, fromVersion);
    const target = toVersion;
    const applied = [];

    this.debugLog(`migrate start: current=${current}, plan=${fromVersion}->${toVersion}`);

    for (let v = start; v < target; v++) {
      const fn = steps[v + 1]; // 次バージョンへ上げる処理
      if (typeof fn === 'function') {
        // eslint-disable-next-line no-await-in-loop
        await fn(this);
        this.setVersion(v + 1);
        applied.push(v + 1);
        this.debugLog(`migrated to v${v + 1}`);
      } else {
        this.debugLog(`no step defined for v${v + 1}, skipping`);
        this.setVersion(v + 1);
        applied.push(v + 1);
      }
    }

    return { applied, from: start, to: target };
  }

  // ----------------------------------------
  // バックアップ / リストア
  // ----------------------------------------

  /**
   * バックアップ（名前空間配下を一括）
   * @param {string} [pattern]
   * @returns {Object} dump
   */
  backup(pattern = this.namespacePrefix) {
    if (typeof this.adapter.exportData === 'function') {
      const dump = this.adapter.exportData(pattern);
      this.debugLog('backup (adapter.exportData)', { keys: Object.keys(dump.data || {}).length });
      return dump;
    }

    // フォールバック: 自前で組み立て
    const keys = this.listKeys(pattern);
    const data = {};
    keys.forEach(k => { data[k] = this.adapter.load(k); });
    const dump = {
      timestamp: new Date().toISOString(),
      pattern,
      data,
      version: this.getVersion(),
      storageInfo: typeof this.adapter.getStorageInfo === 'function' ? this.adapter.getStorageInfo() : {}
    };
    this.debugLog('backup (manual)', { keys: keys.length });
    return dump;
  }

  /**
   * リストア
   * @param {Object} dump - backup()の戻り
   * @param {Object} [options]
   * @param {boolean} [options.overwrite=true]
   * @returns {{ success:number, failed:number }}
   */
  restore(dump, options = {}) {
    const overwrite = options.overwrite ?? true;
    if (!dump || !dump.data || typeof dump.data !== 'object') {
      throw new Error('Invalid dump format');
    }

    let success = 0; let failed = 0;
    Object.entries(dump.data).forEach(([key, value]) => {
      if (!overwrite) {
        const existing = this.adapter.load(key);
        if (existing !== null && existing !== undefined) return; // skip
      }
      const ok = this.adapter.save(key, value);
      ok ? success++ : failed++;
    });

    this.debugLog('restore', { success, failed });
    return { success, failed };
  }

  // ----------------------------------------
  // 高レベルAPI（ドメイン固有）
  // ----------------------------------------

  /**
   * 全資産データを取得（統合形式）
   * @description TransactionDatabaseServiceとAssetDatabaseService用の統合データ取得
   * @returns {Object} 資産タイプ別に分類されたデータ
   * @example
   * // 返却データ形式
   * {
   *   stocks: [{id, name, ticker, ...}],
   *   mutualFunds: [{id, name, fundCode, ...}],
   *   cryptoAssets: [{id, name, symbol, ...}]
   * }
   */
  getAllAssets() {
    try {
      // 基本データを取得
      const assetsData = this.load('assets', []);
      
      // タイプ別に分類
      const result = {
        stocks: [],
        mutualFunds: [],
        cryptoAssets: []
      };
      
      if (Array.isArray(assetsData)) {
        assetsData.forEach(asset => {
          if (!asset || !asset.type) return;
          
          switch (asset.type) {
            case 'stock':
            case 'individual-stock':
              result.stocks.push(asset);
              break;
            case 'mutual-fund':
            case 'investment-trust':
              result.mutualFunds.push(asset);
              break;
            case 'crypto':
            case 'cryptocurrency':
              result.cryptoAssets.push(asset);
              break;
            default:
              // 不明なタイプは投資信託として扱う（後方互換）
              result.mutualFunds.push(asset);
              break;
          }
        });
      }
      
      this.debugLog('getAllAssets', {
        stocks: result.stocks.length,
        mutualFunds: result.mutualFunds.length,
        cryptoAssets: result.cryptoAssets.length
      });
      
      return result;
      
    } catch (error) {
      console.error('Failed to get all assets:', error);
      return {
        stocks: [],
        mutualFunds: [],
        cryptoAssets: []
      };
    }
  }

  // ----------------------------------------
  // 参考: デフォルトキー（Repository側からも参照可能）
  // ----------------------------------------

  static get DEFAULT_KEYS() {
    return {
      ASSETS: 'investment-assets',
      INDEX: 'investment-assets-index'
    };
  }
}

export default DataStoreManager;

