/**
 * TransactionEntity - Canonical Transaction (Domain)
 * 目的: 外部CSV差異を吸収した後に扱う、共通台帳エンティティ。
 * 必須: source, subtype, tradeDate, tradeType, quantity, quantityUnit, currency,
 *       settledAmount, settledCurrency, fingerprint
 * 規約: 通貨コードは3文字大文字。数量>0。日付はISO文字列。符号規約は別途チェック可能。
 */
export class TransactionEntity {
  /**
   * @param {Object} data - 共通トランザクション（canonical）入力データ
   * @param {string} data.source - データ元（`rakuten`, `bybit` など）
   * @param {string} data.subtype - 細分類（`jp_equity`, `us_equity`, `mutual_fund`, …）
   * @param {string|Date} data.tradeDate - 約定日（ISO）
   * @param {string|Date} [data.settleDate] - 受渡日（ISO）
   * @param {string} [data.symbol] - ティッカー/銘柄コード（投信はNULL可）
   * @param {string} data.name - 銘柄名/ファンド名
   * @param {string} [data.market] - 市場名（JP/US/FUND等）
   * @param {string} [data.accountType] - 口座種別（特定/新NISA/旧NISA 等）
   * @param {string} data.tradeType - 取引種別（`buy`/`sell`/`dividend`/`interest`/`staking`/…）
   * @param {string} [data.marginType] - 信用区分（現物/信用）
   * @param {number|string} data.quantity - 数量（株数/口数）
   * @param {string} data.quantityUnit - 数量単位（`株`/`口` 等）
   * @param {number|string} [data.price] - 約定単価（原通貨）
   * @param {string} [data.priceCurrency] - 単価通貨（`JPY`/`USD`/`USDT` 等）
   * @param {number|string} [data.grossAmount] - 約定代金（原通貨）
   * @param {string} [data.grossCurrency] - 約定代金通貨
   * @param {number|string} [data.fee] - 手数料
   * @param {number|string} [data.tax] - 税金
   * @param {number|string} [data.otherCosts] - 諸費用
   * @param {string} data.currency - 決済通貨（受渡）
   * @param {number|string} [data.fxRate] - 為替レート（円/原通貨）
   * @param {number|string} data.settledAmount - 受渡金額（`settledCurrency`建て、流入=正/流出=負）
   * @param {string} data.settledCurrency - 受渡通貨
   * @param {string} [data.nisa] - NISA区分
   * @param {any} [data.remarks] - 備考（投信ポイント等）
   * @param {string} [data.fingerprint] - 重複排除キー（同一性ポリシーに基づくハッシュ）
   */
  constructor(data = {}) {
    // 正規化（文字列大小・日付・数値）
    this.source = (data.source || '').trim();
    this.subtype = (data.subtype || '').trim();
    this.tradeDate = TransactionEntity.toIsoDate(data.tradeDate);
    this.settleDate = TransactionEntity.toIsoDateOrNull(data.settleDate);
    this.symbol = data.symbol ?? null;
    this.name = (data.name || '').trim();
    this.market = data.market ?? null;
    this.accountType = data.accountType ?? null;
    this.tradeType = TransactionEntity.normalizeTradeType(data.tradeType);
    this.marginType = data.marginType ?? null;
    this.quantity = TransactionEntity.toNumber(data.quantity);
    this.quantityUnit = (data.quantityUnit || '').trim();
    this.price = TransactionEntity.toNumberOrNull(data.price);
    this.priceCurrency = TransactionEntity.normalizeCurrencyOrNull(data.priceCurrency);
    this.grossAmount = TransactionEntity.toNumberOrNull(data.grossAmount);
    this.grossCurrency = TransactionEntity.normalizeCurrencyOrNull(data.grossCurrency);
    this.fee = TransactionEntity.toNumberOrZero(data.fee);
    this.tax = TransactionEntity.toNumberOrZero(data.tax);
    this.otherCosts = TransactionEntity.toNumberOrZero(data.otherCosts);
    this.currency = TransactionEntity.normalizeCurrency(data.currency);
    this.fxRate = TransactionEntity.toNumberOrNull(data.fxRate);
    this.settledAmount = TransactionEntity.toNumber(data.settledAmount);
    this.settledCurrency = TransactionEntity.normalizeCurrency(data.settledCurrency);
    this.nisa = data.nisa ?? null;
    this.remarks = data.remarks ?? null;

    // 指紋（未指定時は生成）
    this.fingerprint = (data.fingerprint || TransactionEntity.generateFingerprint({
      source: this.source,
      subtype: this.subtype,
      tradeDate: this.tradeDate,
      symbol: this.symbol || '',
      name: this.name,
      tradeType: this.tradeType,
      quantity: this.quantity,
      price: this.price ?? '',
      currency: this.currency,
      settledAmount: this.settledAmount,
      settledCurrency: this.settledCurrency,
    })).toString();

    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    this.validate();
  }

  validate() {
    const errors = [];
    const curReg = /^[A-Z]{3}$/;

    if (!this.source) errors.push('sourceは必須です');
    if (!this.subtype) errors.push('subtypeは必須です');
    if (!this.tradeDate) errors.push('tradeDateは必須です');
    if (!this.name) errors.push('nameは必須です');
    if (!this.tradeType) errors.push('tradeTypeは必須です');
    if (!(this.quantity > 0)) errors.push('quantityは正の数である必要があります');
    if (!this.quantityUnit) errors.push('quantityUnitは必須です');
    if (!this.currency || !curReg.test(this.currency)) errors.push('currencyは3文字の通貨コードが必要です');
    if (!(typeof this.settledAmount === 'number')) errors.push('settledAmountは数値が必要です');
    if (!this.settledCurrency || !curReg.test(this.settledCurrency)) errors.push('settledCurrencyは3文字の通貨コードが必要です');
    if (!this.fingerprint) errors.push('fingerprintは必須です');

    // オプション通貨の形式チェック
    if (this.priceCurrency && !curReg.test(this.priceCurrency)) errors.push('priceCurrencyの形式が不正です');
    if (this.grossCurrency && !curReg.test(this.grossCurrency)) errors.push('grossCurrencyの形式が不正です');

    if (errors.length) {
      throw new Error(`TransactionEntity バリデーションエラー: ${errors.join(', ')}`);
    }
  }

  toJSON() {
    return {
      source: this.source,
      subtype: this.subtype,
      tradeDate: this.tradeDate,
      settleDate: this.settleDate,
      symbol: this.symbol,
      name: this.name,
      market: this.market,
      accountType: this.accountType,
      tradeType: this.tradeType,
      marginType: this.marginType,
      quantity: this.quantity,
      quantityUnit: this.quantityUnit,
      price: this.price,
      priceCurrency: this.priceCurrency,
      grossAmount: this.grossAmount,
      grossCurrency: this.grossCurrency,
      fee: this.fee,
      tax: this.tax,
      otherCosts: this.otherCosts,
      currency: this.currency,
      fxRate: this.fxRate,
      settledAmount: this.settledAmount,
      settledCurrency: this.settledCurrency,
      nisa: this.nisa,
      remarks: this.remarks,
      fingerprint: this.fingerprint,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ============ Utils ============

  static toIsoDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    // 文字列の場合は日付部分を抽出（YYYY-MM-DD想定）
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  static toIsoDateOrNull(value) {
    const v = TransactionEntity.toIsoDate(value);
    return v || null;
  }

  static toNumber(v) {
    const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v);
    if (Number.isNaN(n)) return 0;
    return n;
  }

  static toNumberOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = TransactionEntity.toNumber(v);
    return Number.isNaN(n) ? null : n;
    }

  static toNumberOrZero(v) {
    const n = TransactionEntity.toNumber(v);
    return Number.isNaN(n) ? 0 : n;
  }

  static normalizeCurrency(code) {
    if (!code) return '';
    return String(code).trim().toUpperCase();
  }

  static normalizeCurrencyOrNull(code) {
    if (!code) return null;
    return TransactionEntity.normalizeCurrency(code);
  }

  static normalizeTradeType(t) {
    return (t || '').toString().trim().toLowerCase();
  }

  /**
   * 符号規約チェック（流入=正/流出=負）。厳密バリデーションは呼び出し側で使用。
   * @returns {{ok: boolean, expectedSign?: 'positive'|'negative'|'any'}}
   */
  checkSignConvention() {
    const type = this.tradeType;
    const amt = this.settledAmount;
    const expect = TransactionEntity.expectedSignByTradeType(type);
    if (expect === 'any') return { ok: true, expectedSign: 'any' };
    if (expect === 'positive') return { ok: amt >= 0, expectedSign: 'positive' };
    if (expect === 'negative') return { ok: amt <= 0, expectedSign: 'negative' };
    return { ok: true, expectedSign: 'any' };
  }

  static expectedSignByTradeType(tradeType) {
    switch ((tradeType || '').toLowerCase()) {
      case 'buy': return 'negative';
      case 'sell': return 'positive';
      case 'dividend': return 'positive';
      case 'interest': return 'positive';
      case 'staking': return 'positive';
      case 'fee': return 'negative';
      case 'transfer_in': return 'positive';
      case 'transfer_out': return 'negative';
      default: return 'any';
    }
  }

  /**
   * 指紋生成（軽量ハッシュ）。インフラ層でSHA-256等に置き換え可能。
   * キーの例: source|subtype|date|name|symbol|tradeType|qty|price|currency|settled
   */
  static generateFingerprint(keyFields) {
    const base = [
      keyFields.source,
      keyFields.subtype,
      keyFields.tradeDate,
      keyFields.name,
      keyFields.symbol,
      keyFields.tradeType,
      keyFields.quantity,
      keyFields.price,
      keyFields.currency,
      keyFields.settledAmount,
      keyFields.settledCurrency,
    ].map((v) => (v === null || v === undefined ? '' : String(v))).join('|');
    return 'tx-' + TransactionEntity.djb2(base).toString(16);
  }

  static djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
      hash |= 0; // 32bit
    }
    return (hash >>> 0); // unsigned
  }
}

export default TransactionEntity;
