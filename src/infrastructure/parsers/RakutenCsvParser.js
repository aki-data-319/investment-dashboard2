/**
 * RakutenCsvParser - Infrastructure Layer
 * 楽天証券CSV（JP株/US株/投信）を標準化TransactionDTO[]へパースするアダプタ。
 * 責務: CSV→DTOの変換のみ。保存・集約・検証は担当しない。
 */

export class RakutenCsvParser {
  constructor({ debug = true } = {}) {
    this.debug = debug;
  }

  log(msg, data) {
    if (this.debug) console.log(`[RakutenCsvParser] ${msg}`, data ?? '');
  }

  /**
   * CSV文字列を解析してTransactionDTO[]を返す
   * @param {string} csvText - CSVテキスト（ヘッダーあり）
   * @returns {{ transactions: Array<object>, warnings: string[], format: string }}
   */
  parseText(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      return { transactions: [], warnings: ['empty-input'], format: 'UNKNOWN' };
    }

    if (typeof Papa === 'undefined' || !Papa.parse) {
      throw new Error('PapaParse is required. Please include papaparse CDN.');
    }

    const result = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
    const rows = Array.isArray(result.data) ? result.data : [];
    const headers = result.meta?.fields || Object.keys(rows[0] || {});
    const format = this.detectFormat(headers);
    const warnings = [];

    const transactions = rows
      .map((row) => this.mapRowToTransaction(row, format))
      .filter((tx) => !!tx);

    if (transactions.length === 0) warnings.push('no-valid-rows');
    return { transactions, warnings, format };
  }

  /**
   * File/Blobを解析
   * @param {File|Blob} file
   * @returns {Promise<{ transactions: Array<object>, warnings: string[], format: string }>}
   */
  async parseFile(file) {
    const text = await file.text();
    return this.parseText(text);
  }

  /**
   * ヘッダからフォーマットを推定
   */
  detectFormat(headers) {
    const h = headers.map((x) => (x || '').toString().trim());
    // 代表的なキーで推定（簡易）
    if (h.some((k) => /約定日|受渡日|銘柄コード|売買区分/.test(k))) return 'JP_STOCK';
    if (h.some((k) => /Symbol|Ticker|Settle|Action|Quantity|Price/i.test(k))) return 'US_STOCK';
    if (h.some((k) => /ファンド名|買付金額|口数|基準価額/.test(k))) return 'FUND';
    return 'UNKNOWN';
  }

  /**
   * CSV行→標準化TransactionDTOへマッピング
   * @param {object} row
   * @param {string} format - 'JP_STOCK' | 'US_STOCK' | 'FUND' | 'UNKNOWN'
   */
  mapRowToTransaction(row, format) {
    try {
      switch (format) {
        case 'JP_STOCK':
          return this.mapJP(row);
        case 'US_STOCK':
          return this.mapUS(row);
        case 'FUND':
          return this.mapFund(row);
        default:
          return null;
      }
    } catch (e) {
      this.log('mapRow error', e);
      return null;
    }
  }

  normalizeSide(value) {
    const v = (value || '').toString().toLowerCase();
    if (/買|buy|buying/.test(v)) return 'buy';
    if (/売|sell|selling/.test(v)) return 'sell';
    return 'buy';
  }

  mapJP(row) {
    // 想定キー例: 約定日, 銘柄名, 銘柄コード, 売買区分, 受渡金額（円）, 受渡数量
    const date = row['約定日'] || row['受渡日'] || row['約定日時'] || '';
    const code = row['銘柄コード'] || row['コード'] || row['銘柄'] || row['シンボル'] || '';
    const name = row['銘柄名'] || '';
    const side = this.normalizeSide(row['売買区分'] || row['区分']);
    const qty = Number(row['受渡数量'] || row['数量'] || row['株数'] || 0);
    const amount = Number(row['受渡金額（円）'] || row['金額'] || row['約定金額（円）'] || 0);
    const price = qty ? amount / qty : Number(row['約定単価（円）'] || 0);

    return {
      executedAt: date,
      market: 'JP',
      symbol: code || name,
      side,
      quantity: qty,
      price,
      amount,
      currency: 'JPY',
    };
  }

  mapUS(row) {
    // 想定キー例: Settle Date, Symbol, Action(Buy/Sell), Quantity, Price, Amount, Currency
    const date = row['Settle Date'] || row['Date'] || row['Executed'] || '';
    const symbol = row['Symbol'] || row['Ticker'] || '';
    const side = this.normalizeSide(row['Action'] || row['Side']);
    const qty = Number(row['Quantity'] || row['Qty'] || 0);
    const price = Number(row['Price'] || 0);
    const amount = Number(row['Amount'] || (qty && price ? qty * price : 0));
    const currency = (row['Currency'] || 'USD').toUpperCase();

    return {
      executedAt: date,
      market: 'US',
      symbol,
      side,
      quantity: qty,
      price,
      amount,
      currency,
    };
  }

  mapFund(row) {
    // 想定キー例: 申込日, ファンド名, 口数, 基準価額, 買付金額
    const date = row['申込日'] || row['約定日'] || '';
    const name = row['ファンド名'] || row['銘柄名'] || '';
    const side = this.normalizeSide(row['取引'] || row['売買'] || '買');
    const qty = Number(row['口数'] || 0);
    const price = Number(row['基準価額'] || 0);
    const amount = Number(row['買付金額'] || row['金額'] || (qty && price ? qty * price : 0));

    return {
      executedAt: date,
      market: 'FUND',
      symbol: name,
      side,
      quantity: qty,
      price,
      amount,
      currency: 'JPY',
    };
  }
}

export default RakutenCsvParser;

