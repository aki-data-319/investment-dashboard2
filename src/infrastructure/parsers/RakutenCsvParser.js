/**
 * RakutenCsvParser - 楽天証券CSV解析エンジン
 * @description 楽天証券の日本株・米国株・投資信託CSVを統一形式に変換する高機能パーサー
 * @author Investment Dashboard v2 Team
 * @version 2.0.0
 * @created 2025-09-21
 * 
 * 統合元: 参照フォルダ/services-データ保存の基盤について/rakutenCsvParser.js
 * 配置: src/infrastructure/parsers/ (Infrastructure Layer)
 * 
 * 【主要機能】
 * - Shift-JIS正常読み込み（文字化け完全対策）
 * - 3つのCSV形式対応（JP株・US株・投資信託）
 * - 柔軟な列名検索（エンコーディング差異対応）
 * - 統一データ形式への変換
 * - 詳細なデバッグ・ログ機能
 */

import { TransactionEntity } from '../../domain/entities/TransactionEntity.js';

export class RakutenCsvParser {
    /**
     * RakutenCsvParserコンストラクタ
     * @description 楽天証券CSV形式のメタデータとパーサー設定を初期化
     * @example
     * const parser = new RakutenCsvParser();
     * const result = await parser.parseCsvFile(file, 'JP');
     */
    constructor() {
        this.headersLogged = false; // ヘッダーログ出力フラグ
        
        // 実際の楽天証券CSVヘッダーパターン（正確な列名）
        this.csvFormats = {
            JP: {
                fileName: 'tradehistoryJP',
                description: '日本株式取引履歴',
                // 実際のヘッダーパターン（28列）- 実データに合わせて修正
                headerPatterns: [
                    '約定日', '受渡日', '銘柄コード', '銘柄名', '市場名称', 
                    '口座区分', '取引区分', '売買区分', '信用区分', '弁済期限',
                    '数量［株］', '単価［円］', '手数料［円］', '税金等［円］', '諸費用［円］',
                    '税区分', '受渡金額［円］', '建約定日', '建単価［円］', '建手数料［円］',
                    '建手数料消費税［円］', '金利（支払）〔円〕', '金利（受取）〔円〕',
                    '逆日歩／特別空売り料（支払）〔円〕', '逆日歩（受取）〔円〕',
                    '貸株料', '事務管理費〔円〕（税抜）', '名義書換料〔円〕（税抜）'
                ],
                // JP固有の識別パターン
                uniquePatterns: ['銘柄コード', '市場名称', '数量［株］'],
                keyColumns: ['約定日', '銘柄コード', '銘柄名', '売買区分', '数量［株］', '単価［円］', '受渡金額［円］'],
                requiredColumns: ['約定日', '銘柄名', '売買区分']
            },
            US: {
                fileName: 'tradehistoryUS',
                description: '米国株式取引履歴',
                // 実際のヘッダーパターン（18列）
                headerPatterns: [
                    '約定日', '受渡日', 'ティッカー', '銘柄名', '口座',
                    '取引区分', '売買区分', '信用区分', '弁済期限', '決済通貨',
                    '数量［株］', '単価［USドル］', '約定代金［USドル］', '為替レート',
                    '手数料［USドル］', '税金［USドル］', '受渡金額［USドル］', '受渡金額［円］'
                ],
                // US固有の識別パターン
                uniquePatterns: ['ティッカー', '単価［USドル］', '約定代金［USドル］', '為替レート'],
                keyColumns: ['約定日', 'ティッカー', '銘柄名', '売買区分', '数量［株］', '単価［USドル］', '受渡金額［USドル］'],
                requiredColumns: ['約定日', '銘柄名', '売買区分']
            },
            INVST: {
                fileName: 'tradehistoryINVST',
                description: '投資信託取引履歴',
                // 実際のヘッダーパターン（14列）
                headerPatterns: [
                    '約定日', '受渡日', 'ファンド名', '分配金', '口座',
                    '取引', '買付方法', '数量［口］', '単価', '経費',
                    '為替レート', '受付金額[現地通貨]', '受渡金額/(ポイント利用)[円]', '決済通貨'
                ],
                // INVST固有の識別パターン
                uniquePatterns: ['ファンド名', '数量［口］', '受渡金額/(ポイント利用)[円]'],
                keyColumns: ['約定日', 'ファンド名', '取引', '数量［口］', '単価', '受渡金額/(ポイント利用)[円]'],
                requiredColumns: ['約定日', 'ファンド名', '取引']
            }
        };
        
        this.debugMode = false;
    }

    /**
     * デバッグログ出力
     * @description 開発・デバッグ用のログ出力機能
     * @param {string} message - ログメッセージ
     * @param {*} [data=null] - 追加データ（オプション）
     * @returns {void}
     * @example
     * parser.debugLog('CSVファイル処理開始', { fileName: 'trade.csv' });
     */
    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[RakutenCsvParser] ${message}`, data || '');
        }
    }

    /**
     * 柔軟な列名検索
     * @description エンコーディングや空白文字の違いを考慮した列値検索
     * @param {Object} row - CSV行データ
     * @param {Array<string>} columnNames - 検索する列名の配列（優先順）
     * @returns {string|null} 見つかった値またはnull
     * @throws {Error} 検索対象データが無効な場合
     * @example
     * const value = parser.findColumnValue(row, ['売買区分', '取引区分', '取引']);
     * // '買付' または '売却' などの値を取得
     */
    findColumnValue(row, columnNames) {
        for (const colName of columnNames) {
            // 完全一致
            if (row[colName] !== undefined && row[colName] !== null && row[colName] !== '') {
                return row[colName];
            }
            
            // 部分一致（空白文字の違いを考慮）
            const matchingKey = Object.keys(row).find(key => 
                key.trim() === colName.trim() || key.includes(colName) || colName.includes(key.trim())
            );
            
            if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null && row[matchingKey] !== '') {
                return row[matchingKey];
            }
        }
        return null;
    }

    /**
     * CSVファイル正常エンコーディング読み込み
     * @description Shift-JIS、UTF-8、ISO-8859-1を順次試行して正常読み込みを実現
     * @param {File} file - 読み込み対象のCSVファイル
     * @returns {Promise<string>} 正常に読み込まれたCSVテキスト
     * @throws {Error} 全エンコーディングで読み込み失敗時
     * @example
     * const csvText = await parser.readCsvFileWithProperEncoding(file);
     * // 日本語が正常に読み込まれたCSVテキストを取得
     */
    async readCsvFileWithProperEncoding(file) {
        const encodings = ['Shift_JIS', 'UTF-8', 'ISO-8859-1'];
        
        for (const encoding of encodings) {
            try {
                this.debugLog(`${encoding}で読み込み試行中...`);
                
                const text = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    
                    reader.onload = (event) => {
                        resolve(event.target.result);
                    };
                    
                    reader.onerror = () => {
                        reject(new Error(`${encoding}での読み込みに失敗`));
                    };
                    
                    // エンコーディング指定で読み込み
                    reader.readAsText(file, encoding);
                });
                
                this.debugLog(`${encoding}読み込み結果（最初の100文字）:`, text.substring(0, 100));
                
                // 日本語が正常に読めているかチェック
                if (this.containsValidJapanese(text)) {
                    this.debugLog(`✅ ${encoding}で正常な日本語を検出`);
                    return text;
                }
                
                this.debugLog(`⚠️ ${encoding}では日本語が正しく読み込まれていない`);
                
            } catch (error) {
                this.debugLog(`❌ ${encoding}での読み込みエラー:`, error.message);
                continue;
            }
        }
        
        throw new Error('すべてのエンコーディングでの読み込みに失敗しました');
    }

    /**
     * 正常な日本語検証
     * @description テキストに正常な日本語（投資関連用語）が含まれているかを検証
     * @param {string} text - 検証対象テキスト
     * @returns {boolean} 正常な日本語が含まれている場合true
     * @example
     * const isValid = parser.containsValidJapanese('約定日,銘柄名,売買区分');
     * // true（投資用語が含まれている）
     */
    containsValidJapanese(text) {
        // ひらがな、カタカナ、漢字の範囲をチェック
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
        
        if (!japaneseRegex.test(text)) {
            return false;
        }
        
        // よく使われる投資関連の日本語用語をチェック
        const commonTerms = ['約定', '銘柄', '受渡', '売買', '取引', 'ファンド'];
        const foundTerms = commonTerms.filter(term => text.includes(term));
        
        this.debugLog(`検出された投資用語: ${foundTerms.join(', ')}`);
        
        // 少なくとも1つの投資用語が含まれていることを確認
        return foundTerms.length > 0;
    }

    /**
     * CSVファイル解析メイン処理
     * @description 楽天証券CSVファイルを解析し、標準形式のデータに変換
     * @param {File} file - 解析対象のCSVファイル
     * @param {string} csvType - CSV形式（'JP'|'US'|'INVST'）
     * @param {function} [progressCallback=null] - 進捗コールバック関数
     * @returns {Promise<Object>} 解析結果オブジェクト
     * @throws {Error} ファイル読み込み失敗、形式不正等
     * @example
     * const result = await parser.parseCsvFile(file, 'JP', (progress, message) => {
     *   console.log(`${progress}%: ${message}`);
     * });
     * // { success: true, data: [...], csvType: 'JP', ... }
     */
    async parseCsvFile(file, csvType, progressCallback = null) {
        try {
            this.debugLog('=== CSVファイル処理開始 ===');
            this.debugLog('ファイル情報:', { name: file.name, size: file.size });
            this.debugLog('📋 指定されたCSV形式:', csvType);
            
            if (progressCallback) progressCallback(10, 'ファイルを読み込み中...');
            
            // 1. 正しいエンコーディングでファイル読み込み
            const csvText = await this.readCsvFileWithProperEncoding(file);
            this.debugLog('正常読み込み完了（最初の200文字）:', csvText.substring(0, 200));
            
            if (progressCallback) progressCallback(50, 'CSVデータを解析中...');
            
            // 2. Papa ParseでCSV解析
            this.debugLog('Papa Parse実行中...');
            const parseResult = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim()
            });

            if (parseResult.errors.length > 0) {
                this.debugLog('⚠️ CSV解析警告:', parseResult.errors);
                console.warn('[RakutenCsvParser.js] PapaParse 警告', parseResult.errors);
            }

            this.debugLog('Papa Parse結果:', {
                rows: parseResult.data.length,
                fields: parseResult.meta.fields
            });

            if (progressCallback) progressCallback(70, 'エンティティへ正規化中...');
            // 3. v3: TransactionEntityへ正規化
            let transactionEntities = [];
            try {
                transactionEntities = this.convertRowsToTransactionEntities(parseResult.data, csvType);
            } catch (e) {
                console.error('[RakutenCsvParser.js] convertRowsToTransactionEntities エラー:', e?.message || e);
                throw e;
            }
            this.debugLog('正規化済みエンティティ行数:', transactionEntities.length);
            if (progressCallback) progressCallback(90, '正規化完了...');

            const result = {
                success: true,
                csvType: csvType,
                description: this.csvFormats[csvType].description,
                originalRows: parseResult.data.length,
                convertedRows: transactionEntities.length,
                fileName: file.name,
                fileSize: file.size,
                parseDate: new Date().toISOString(),
                headers: parseResult.meta.fields,
                debugInfo: {
                    detectionMethod: 'manual_selection',
                    selectedFormat: csvType,
                    encodingSuccess: true
                }
            };
            // v3専用出力
            result.entities = transactionEntities;
            result.v3 = {
                totalCount: transactionEntities.length,
                validCount: transactionEntities.length,
            };

            if (progressCallback) progressCallback(100, '完了');
            this.debugLog('✅ CSVファイル処理完了 - 形式:', csvType);
            
            return result;

        } catch (error) {
            this.debugLog('❌ CSVファイル処理エラー:', error);
            console.error('[RakutenCsvParser.js] parseCsvFile エラー:', error?.message || error);
            return {
                success: false,
                error: error.message,
                fileName: file.name,
                fileSize: file.size,
                csvType: csvType,
                debugInfo: {
                    errorType: error.name,
                    selectedFormat: csvType,
                    encodingSuccess: false
                }
            };
        }
    }

    /**
     * v3: CSV行を TransactionEntity[] に変換
     * @param {Array<object>} rows
     * @param {'JP'|'US'|'INVST'} csvType
     */
    convertRowsToTransactionEntities(rows, csvType) {
        const entities = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const ent = this.convertRowToTransactionEntity(row, csvType);
                if (ent) entities.push(ent);
            } catch (e) {
                console.error(`[RakutenCsvParser.js] 行${i + 1} の正規化に失敗:`, e?.message || e);
            }
        }
        return entities;
    }

    /**
     * v3: 単一行を TransactionEntity に変換
     */
    convertRowToTransactionEntity(row, csvType) {
        // 空行スキップ
        const hasData = Object.values(row).some(v => v && v.toString().trim() !== '');
        if (!hasData) return null;

        const tradeTypeRaw = this.findColumnValue(row, ['売買区分', '取引区分', '取引']) || '';
        const tradeType = (tradeTypeRaw || '').toString().trim().toLowerCase();
        const buySell = this.normalizeTradeType(tradeTypeRaw);

        const base = {
            source: 'rakuten',
            subtype: csvType === 'JP' ? 'jp_equity' : (csvType === 'US' ? 'us_equity' : 'mutual_fund'),
            tradeDate: this.parseDate(this.findColumnValue(row, ['約定日', '取引日'])),
            settleDate: this.parseDate(this.findColumnValue(row, ['受渡日'])),
            symbol: null,
            name: this.findColumnValue(row, ['銘柄名', 'ファンド名']) || '',
            market: this.findColumnValue(row, ['市場名称']) || null,
            accountType: this.findColumnValue(row, ['口座区分', '口座']) || null,
            tradeType: tradeType,
            marginType: this.findColumnValue(row, ['信用区分']) || null,
            fee: 0,
            tax: 0,
            otherCosts: 0,
            nisa: null,
            remarks: null,
        };

        if (csvType === 'JP') {
            const qty = this.parseQuantity(this.findColumnValue(row, ['数量［株］', '数量']) || '0');
            const priceJpy = this.parseAmount(this.findColumnValue(row, ['単価［円］', '単価']) || '0');
            const settledJpyAbs = this.parseAmount(this.findColumnValue(row, ['受渡金額［円］', '受渡金額']) || '0');
            const fee = this.parseAmount(this.findColumnValue(row, ['手数料［円］', '手数料']) || '0');
            const tax = this.parseAmount(this.findColumnValue(row, ['税金等［円］', '税金']) || '0');
            const other = this.parseAmount(this.findColumnValue(row, ['諸費用［円］']) || '0');
            const sign = TransactionEntity.expectedSignByTradeType(buySell) === 'negative' ? -1 : (TransactionEntity.expectedSignByTradeType(buySell) === 'positive' ? 1 : 1);
            const settled = settledJpyAbs * sign;

            return new TransactionEntity({
                ...base,
                symbol: this.findColumnValue(row, ['銘柄コード']) || null,
                quantity: qty,
                quantityUnit: '株',
                price: priceJpy,
                priceCurrency: 'JPY',
                grossAmount: null,
                grossCurrency: null,
                fee, tax, otherCosts: other,
                currency: 'JPY',
                fxRate: 1,
                settledAmount: settled,
                settledCurrency: 'JPY',
            });
        }

        if (csvType === 'US') {
            const qty = this.parseQuantity(this.findColumnValue(row, ['数量［株］', '数量']) || '0');
            const priceUsd = this.parseAmount(this.findColumnValue(row, ['単価［USドル］']) || '0');
            const grossUsd = this.parseAmount(this.findColumnValue(row, ['約定代金［USドル］']) || '0');
            const feeUsd = this.parseAmount(this.findColumnValue(row, ['手数料［USドル］']) || '0');
            const taxUsd = this.parseAmount(this.findColumnValue(row, ['税金［USドル］']) || '0');
            const fx = this.parseAmount(this.findColumnValue(row, ['為替レート']) || '0');
            const settleCurRaw = this.findColumnValue(row, ['決済通貨']) || 'USドル';
            const settleCur = this.normalizeCurrencyLabel(settleCurRaw);
            const cashUsd = this.parseAmount(this.findColumnValue(row, ['受渡金額［USドル］']) || '0');
            const cashJpy = this.parseAmount(this.findColumnValue(row, ['受渡金額［円］']) || '0');
            const sign = TransactionEntity.expectedSignByTradeType(buySell) === 'negative' ? -1 : (TransactionEntity.expectedSignByTradeType(buySell) === 'positive' ? 1 : 1);
            const settled = (settleCur === 'JPY' ? cashJpy : cashUsd) * sign;

            return new TransactionEntity({
                ...base,
                symbol: this.findColumnValue(row, ['ティッカー']) || null,
                quantity: qty,
                quantityUnit: '株',
                price: priceUsd,
                priceCurrency: 'USD',
                grossAmount: grossUsd,
                grossCurrency: 'USD',
                fee: feeUsd,
                tax: taxUsd,
                currency: settleCur,
                fxRate: fx || null,
                settledAmount: settled,
                settledCurrency: settleCur,
            });
        }

        if (csvType === 'INVST') {
            const qty = this.parseQuantity(this.findColumnValue(row, ['数量［口］']) || '0');
            const price = this.parseAmount(this.findColumnValue(row, ['単価']) || '0');
            const fee = this.parseAmount(this.findColumnValue(row, ['経費']) || '0');
            const fx = this.parseAmount(this.findColumnValue(row, ['為替レート']) || '0');
            const settleCur = this.normalizeCurrencyLabel(this.findColumnValue(row, ['決済通貨']) || '円');
            const cashJpy = this.parseAmount(this.findColumnValue(row, ['受渡金額/(ポイント利用)[円]']) || '0');
            const sign = TransactionEntity.expectedSignByTradeType(buySell) === 'negative' ? -1 : (TransactionEntity.expectedSignByTradeType(buySell) === 'positive' ? 1 : 1);

            return new TransactionEntity({
                ...base,
                quantity: qty,
                quantityUnit: '口',
                price: price,
                priceCurrency: 'JPY',
                grossAmount: null,
                grossCurrency: null,
                fee,
                tax: 0,
                currency: settleCur || 'JPY',
                fxRate: fx || null,
                settledAmount: (cashJpy * sign),
                settledCurrency: 'JPY',
            });
        }
        return null;
    }

    /**
     * 日本語ラベルを通貨コードに正規化
     */
    normalizeCurrencyLabel(label) {
        const t = (label || '').toString();
        if (t.includes('円')) return 'JPY';
        if (t.includes('USドル') || t.toUpperCase() === 'USD') return 'USD';
        return t.trim().toUpperCase().slice(0, 3);
    }


    /**
     * 日付文字列解析
     * @description 楽天証券の日付形式を標準ISO形式（YYYY-MM-DD）に変換
     * @param {string} dateStr - 楽天証券日付文字列
     * @returns {string} ISO形式日付文字列（YYYY-MM-DD）
     * @example
     * const isoDate = parser.parseDate('2025/01/15');
     * // '2025-01-15'
     */
    parseDate(dateStr) {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        
        const cleaned = dateStr.replace(/[^\d/-]/g, '');
        
        try {
            const date = new Date(cleaned);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            return date.toISOString().split('T')[0];
        } catch (error) {
            this.debugLog('日付解析エラー:', dateStr);
            return new Date().toISOString().split('T')[0];
        }
    }

    /**
     * 売買区分正規化
     * @description 楽天証券の売買区分を標準形式（buy/sell/other）に正規化
     * @param {string} tradeType - 楽天証券売買区分
     * @returns {string} 正規化された売買区分（'buy'|'sell'|'other'）
     * @example
     * const normalized = parser.normalizeTradeType('現物買');
     * // 'buy'
     */
    normalizeTradeType(tradeType) {
        const normalized = tradeType.toLowerCase().trim();
        
        if (normalized.includes('買') || normalized.includes('buy')) {
            return 'buy';
        } else if (normalized.includes('売') || normalized.includes('sell')) {
            return 'sell';
        } else {
            return 'other';
        }
    }

    /**
     * 金額文字列解析
     * @description 楽天証券の金額文字列（円記号、コンマ含む）を数値に変換
     * @param {string} amountStr - 楽天証券金額文字列
     * @returns {number} 数値金額（負数は絶対値に変換）
     * @example
     * const amount = parser.parseAmount('¥1,234,567');
     * // 1234567
     */
    parseAmount(amountStr) {
        if (!amountStr) return 0;
        
        const cleaned = amountStr.toString().replace(/[,¥$\s]/g, '');
        const number = parseFloat(cleaned);
        
        return isNaN(number) ? 0 : Math.abs(number);
    }

    /**
     * 数量文字列解析
     * @description 楽天証券の数量文字列（株数、口数）を数値に変換
     * @param {string} quantityStr - 楽天証券数量文字列
     * @returns {number} 数値数量（負数は絶対値に変換）
     * @example
     * const quantity = parser.parseQuantity('1,000');
     * // 1000
     */
    parseQuantity(quantityStr) {
        if (!quantityStr) return 0;
        
        const cleaned = quantityStr.toString().replace(/[,\s]/g, '');
        const number = parseFloat(cleaned);
        
        return isNaN(number) ? 0 : Math.abs(number);
    }

    /**
     * 複数CSVファイル一括処理
     * @description 複数の楽天証券CSVファイルを指定形式で一括処理
     * @param {FileList} files - 処理対象ファイル一覧
     * @param {string} csvType - 統一CSV形式（'JP'|'US'|'INVST'）
     * @param {function} [progressCallback=null] - 進捗コールバック関数
     * @returns {Promise<Array<Object>>} 各ファイルの処理結果配列
     * @throws {Error} ファイル処理失敗時
     * @example
     * const results = await parser.parseMultipleCsvFiles(files, 'JP', 
     *   (progress, message) => console.log(`${progress}%: ${message}`)
     * );
     * // [{ success: true, data: [...] }, { success: false, error: '...' }]
     */
    async parseMultipleCsvFiles(files, csvType, progressCallback = null) {
        this.debugLog('=== 複数ファイル処理開始 ===');
        this.debugLog('ファイル数:', files.length);
        this.debugLog('📋 指定されたCSV形式:', csvType);
        
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            this.debugLog(`--- ファイル ${i+1}/${files.length} 処理開始 ---`);
            
            if (progressCallback) {
                const overallProgress = Math.floor((i / files.length) * 100);
                progressCallback(overallProgress, `${file.name} を処理中... (${i + 1}/${files.length})`);
            }

            const result = await this.parseCsvFile(file, csvType, null);
            results.push(result);
            
            this.debugLog(`ファイル ${i+1} 処理結果:`, result.success ? '成功' : '失敗');
        }

        this.debugLog('=== 複数ファイル処理完了 ===');
        return results;
    }

    /**
     * デバッグモード設定
     * @description デバッグログ出力の有効/無効を切り替え
     * @param {boolean} enabled - デバッグモード有効フラグ
     * @returns {void}
     * @example
     * parser.setDebugMode(false); // 本番環境でログを無効化
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.debugLog('デバッグモード変更:', enabled ? 'ON' : 'OFF');
    }

    /**
     * v3エンティティ出力モード切替
     * @param {boolean} enabled
     */
    // v3専用のため切替フラグは不要

    /**
     * サポート済みCSV形式一覧取得
     * @description パーサーがサポートするCSV形式の一覧を取得
     * @returns {Array<Object>} サポート形式情報配列
     * @static
     * @example
     * const formats = RakutenCsvParser.getSupportedFormats();
     * // [{ key: 'JP', description: '日本株式取引履歴' }, ...]
     */
    static getSupportedFormats() {
        return [
            { key: 'JP', description: '日本株式取引履歴' },
            { key: 'US', description: '米国株式取引履歴' },
            { key: 'INVST', description: '投資信託取引履歴' }
        ];
    }

    /**
     * パーサーバージョン情報取得
     * @description RakutenCsvParserのバージョン情報を取得
     * @returns {Object} バージョン情報オブジェクト
     * @static
     * @example
     * const version = RakutenCsvParser.getVersion();
     * // { version: '2.0.0', build: '2025-09-21', features: [...] }
     */
    static getVersion() {
        return {
            version: '2.0.0',
            build: '2025-09-21',
            architecture: 'v3-canonical-transactions',
            features: [
                'Shift-JIS正常読み込み',
                '3つのCSV形式対応',
                '柔軟な列名検索',
                'TransactionEntity 正規化',
                '詳細デバッグ機能（日本語ログ）'
            ]
        };
    }
}

// ES6モジュールエクスポート（v2アーキテクチャ対応）
export default RakutenCsvParser;

// グローバルエクスポート（従来の互換性保持）
if (typeof window !== 'undefined') {
    window.RakutenCsvParser = RakutenCsvParser;
    console.log('✅ RakutenCsvParser v2統合版がグローバルスコープに登録されました');
}
