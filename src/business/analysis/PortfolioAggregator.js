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
}

export default PortfolioAggregator;

