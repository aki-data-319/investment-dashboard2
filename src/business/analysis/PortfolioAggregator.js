/**
 * PortfolioAggregator - Business Layer (analysis)
 * 取引履歴(TransactionDTO[])を銘柄別の保有ポジションへ集約する純関数群。
 * 責務: 数量・原価の加重平均計算、売買相殺、実保有抽出。
 */

export class PortfolioAggregator {
  /**
   * 取引履歴を銘柄別に集約
   * @param {Array<object>} transactions - TransactionDTO[]
   * @returns {Array<object>} AggregatedPosition[]
   */
  static aggregateTransactions(transactions = []) {
    const map = new Map(); // key: symbol|market|currency

    transactions.forEach((tx) => {
      if (!tx || !tx.symbol) return;
      const key = `${tx.symbol}|${tx.market || ''}|${(tx.currency || '').toUpperCase()}`;
      const node = map.get(key) || {
        symbol: tx.symbol,
        market: tx.market || 'OTHER',
        currency: (tx.currency || 'JPY').toUpperCase(),
        quantityNet: 0,
        totalCost: 0,
        avgPrice: 0,
      };

      const side = (tx.side || 'buy').toLowerCase();
      const qty = Number(tx.quantity || 0);
      const amount = Number(tx.amount || (qty * Number(tx.price || 0)) || 0);

      if (side === 'buy') {
        // 買付: 数量と原価を増やす
        node.totalCost += amount;
        node.quantityNet += qty;
      } else if (side === 'sell') {
        // 売却: 平均原価で原価を減算し、数量を減らす（単純法）
        const currentQty = node.quantityNet;
        const currentAvg = currentQty > 0 ? node.totalCost / currentQty : 0;
        const reduceCost = currentAvg * qty;
        node.totalCost = Math.max(0, node.totalCost - reduceCost);
        node.quantityNet -= qty;
      }

      node.avgPrice = node.quantityNet > 0 ? node.totalCost / node.quantityNet : 0;
      map.set(key, node);
    });

    return Array.from(map.values());
  }

  /**
   * 実保有（数量>0）のみ返す
   * @param {Array<object>} positions
   * @returns {Array<object>}
   */
  static filterActivePositions(positions = []) {
    return positions.filter((p) => (p.quantityNet || 0) > 0);
  }

  /**
   * v3: TransactionEntity[] → positions へ集約
   * @param {Array<object>} entities - TransactionEntity[]
   * @returns {Array<object>} positions [{ symbol,name,market,currency,quantityNet,totalCost,avgPrice }]
   */
  static fromEntitiesToPositions(entities = []) {
    try {
      const map = new Map(); // key: instrument|market|currency

    const getMarketFromSubtype = (sub) => {
      if (sub === 'jp_equity') return 'JP';
      if (sub === 'us_equity') return 'US';
      if (sub === 'mutual_fund') return 'FUND';
      return 'OTHER';
    };

    for (const e of entities) {
      if (!e) continue;
      const market = e.market || getMarketFromSubtype(e.subtype);
      const symbol = e.symbol || '';
      const name = e.name || symbol || '';
      const currency = e.settledCurrency || e.currency || 'JPY';
      const key = `${symbol || name}|${market}|${currency}`;

      const node = map.get(key) || {
        symbol: symbol || null,
        name,
        market,
        currency,
        quantityNet: 0,
        totalCost: 0,
        avgPrice: 0,
      };

      const side = (e.tradeType || '').toLowerCase();
      const qty = Number(e.quantity || 0);
      const settledAbs = Math.abs(Number(e.settledAmount || 0));

      if (side === 'buy') {
        node.totalCost += settledAbs;
        node.quantityNet += qty;
      } else if (side === 'sell') {
        const currentQty = node.quantityNet;
        const currentAvg = currentQty > 0 ? node.totalCost / currentQty : 0;
        const reduceCost = currentAvg * qty;
        node.totalCost = Math.max(0, node.totalCost - reduceCost);
        node.quantityNet -= qty;
      } else {
        // dividend/interest/fee/transfer は数量に影響なし（コストにも反映しない）
      }

      node.avgPrice = node.quantityNet > 0 ? node.totalCost / node.quantityNet : 0;
      map.set(key, node);
    }

      return Array.from(map.values());
    } catch (e) {
      console.error('[PortfolioAggregator.js] fromEntitiesToPositions エラー:', e?.message || e);
      return [];
    }
  }

  /**
   * v3: positions × exposure → 配分集計（セクター/地域）
   * @param {Array<object>} positions
   * @param {{ getSectorExposure:Function, getRegionExposure:Function }} exposureRepo
   * @returns {{
   *   sector: Array<{ key: string, value: number, percentage: number }>,
   *   region: Array<{ key: string, value: number, percentage: number }>,
   *   totalValue: number
   * }}
   */
  static aggregateExposure(positions = [], exposureRepo) {
    try {
      const sectorAgg = new Map();
      const regionAgg = new Map();

      const totalValue = positions.reduce((s, p) => s + (Number(p.totalCost) || 0), 0);

    const keyOf = (p) => `${p.market}:${p.symbol || p.name}`;

    for (const p of positions) {
      const value = Number(p.totalCost) || 0;
      if (value <= 0) continue;

      const instKey = keyOf(p);
      const sectors = (exposureRepo?.getSectorExposure(instKey, new Date().toISOString()) || [{ sectorId: 'Unclassified', weight: 1 }]);
      const regions = (exposureRepo?.getRegionExposure(instKey, new Date().toISOString()) || [{ regionId: p.market || 'OTHER', weight: 1 }]);

      sectors.forEach(({ sectorId, weight }) => {
        const wv = value * (Number(weight) || 0);
        sectorAgg.set(sectorId, (sectorAgg.get(sectorId) || 0) + wv);
      });
      regions.forEach(({ regionId, weight }) => {
        const wv = value * (Number(weight) || 0);
        regionAgg.set(regionId, (regionAgg.get(regionId) || 0) + wv);
      });
    }

    const toArray = (m) => {
      const arr = Array.from(m.entries()).map(([key, value]) => ({ key, value }));
      arr.sort((a, b) => b.value - a.value);
      return arr.map((x) => ({ ...x, percentage: totalValue > 0 ? Number(((x.value / totalValue) * 100).toFixed(2)) : 0 }));
    };

      return {
        sector: toArray(sectorAgg),
        region: toArray(regionAgg),
        totalValue,
      };
    } catch (e) {
      console.error('[PortfolioAggregator.js] aggregateExposure エラー:', e?.message || e);
      return { sector: [], region: [], totalValue: 0 };
    }
  }
}

export default PortfolioAggregator;
