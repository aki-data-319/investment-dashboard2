/**
 * SectorService - Business Layer (services)
 * セクター付与/集計ロジック。マスタデータ（銘柄/キーワード→セクター）を基に分類する。
 * 注意: IOは持たない（マスタロードは呼び出し側で実施 or fetchを別途使用）。
 */

export class SectorService {
  /**
   * @param {Object} sectorMaster - { symbols?: { [symbol]: sector }, keywords?: { [keyword]: sector } }
   */
  constructor(sectorMaster = {}) {
    this.master = {
      symbols: sectorMaster.symbols || {},
      keywords: sectorMaster.keywords || {},
      defaultSector: sectorMaster.defaultSector || 'その他',
    };
  }

  /**
   * 資産（AssetEntity相当）にセクターを付与（nameやsymbol等の情報で推定）
   * @param {Object} asset - { name, sector?, symbol?, type? }
   * @returns {Object} asset（同インスタンスを返す）
   */
  assignSector(asset) {
    if (!asset) return asset;
    if (asset.sector) return asset; // 既に設定済みなら維持

    // symbol優先
    if (asset.symbol && this.master.symbols[asset.symbol]) {
      asset.sector = this.master.symbols[asset.symbol];
      return asset;
    }

    // nameのキーワードマッチ
    const name = (asset.name || '').toString().toLowerCase();
    let matched = null;
    Object.entries(this.master.keywords).some(([kw, sector]) => {
      if (kw && name.includes(kw.toLowerCase())) {
        matched = sector; return true;
      }
      return false;
    });
    asset.sector = matched || this.master.defaultSector;
    return asset;
  }

  /**
   * セクター別集計（現在価値ベース）
   * @param {Array<Object>} assets - { currentValue, sector }
   * @returns {Object} { [sector]: { count, totalValue } }
   */
  aggregateBySector(assets = []) {
    const agg = {};
    assets.forEach((a) => {
      const key = a.sector || this.master.defaultSector;
      if (!agg[key]) agg[key] = { count: 0, totalValue: 0 };
      agg[key].count += 1;
      agg[key].totalValue += Number(a.currentValue || 0);
    });
    return agg;
  }
}

export default SectorService;

