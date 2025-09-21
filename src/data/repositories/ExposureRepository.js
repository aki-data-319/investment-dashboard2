import { DataStoreManager } from '../managers/DataStoreManager.js';

/**
 * ExposureRepository - 最小実装版
 * 責務: 銘柄/ファンドのセクター・地域エクスポージャー（重み）を提供
 * 備考: 当面は手動設定+簡易デフォルト（equity=1.0、fund=Unclassified）
 */
export class ExposureRepository {
  constructor(storageAdapter, options = {}) {
    this.store = new DataStoreManager(storageAdapter, {
      namespacePrefix: options.namespacePrefix || 'investment-',
      versionKey: options.versionKey || 'investment-version',
      currentVersion: options.currentVersion || 1,
      debug: options.debug === true,
    });
    this.SECTOR_KEY = options.sectorKey || 'investment-exposure-sectors';
    this.REGION_KEY = options.regionKey || 'investment-exposure-regions';
  }

  /**
   * 手動設定 追加/置換
   * @param {string} instrumentKey e.g. 'JP:7203' or 'US:AAPL' or 'FUND:emaxis-all'
   * @param {Array<{ sectorId: string, weight: number }>} exposures
   */
  setSectorExposure(instrumentKey, exposures = []) {
    try {
      const map = this.store.load(this.SECTOR_KEY) || {};
      map[instrumentKey] = exposures;
      this.store.save(this.SECTOR_KEY, map);
    } catch (e) {
      console.error('[ExposureRepository.js] setSectorExposure エラー:', e?.message || e);
    }
  }

  setRegionExposure(instrumentKey, exposures = []) {
    try {
      const map = this.store.load(this.REGION_KEY) || {};
      map[instrumentKey] = exposures;
      this.store.save(this.REGION_KEY, map);
    } catch (e) {
      console.error('[ExposureRepository.js] setRegionExposure エラー:', e?.message || e);
    }
  }

  /**
   * 取得（なければデフォルト）
   */
  getSectorExposure(instrumentKey /*, asOf */) {
    try {
      const map = this.store.load(this.SECTOR_KEY) || {};
      if (map[instrumentKey]) return map[instrumentKey];
    } catch (e) {
      console.error('[ExposureRepository.js] getSectorExposure エラー:', e?.message || e);
    }
    // デフォルト: Unclassified 100%
    return [{ sectorId: 'Unclassified', weight: 1 }];
  }

  getRegionExposure(instrumentKey /*, asOf */) {
    try {
      const map = this.store.load(this.REGION_KEY) || {};
      if (map[instrumentKey]) return map[instrumentKey];
    } catch (e) {
      console.error('[ExposureRepository.js] getRegionExposure エラー:', e?.message || e);
    }
    // デフォルト: instrumentKeyのプレフィックスから推測
    if (instrumentKey.startsWith('JP:')) return [{ regionId: 'JP', weight: 1 }];
    if (instrumentKey.startsWith('US:')) return [{ regionId: 'US', weight: 1 }];
    if (instrumentKey.startsWith('FUND:')) return [{ regionId: 'Unclassified', weight: 1 }];
    return [{ regionId: 'OTHER', weight: 1 }];
  }
}

export default ExposureRepository;
