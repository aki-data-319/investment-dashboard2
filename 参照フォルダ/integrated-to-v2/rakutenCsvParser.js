/**
 * 楽天証券CSVパーサー - Shift-JIS正常読み込み版
 * 文字化けを前提とせず、正しいエンコーディングで読み込む
 */

class RakutenCsvParser {
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
        
        this.debugMode = true;
    }

    debugLog(message, data = null) {
        if (this.debugMode) {
            console.log(`[RakutenCsvParser] ${message}`, data || '');
        }
    }

    /**
     * 柔軟な列名検索（空白文字やエンコーディングの違いを考慮）
     * @param {Object} row - CSV行データ
     * @param {Array} columnNames - 検索する列名の配列（優先順）
     * @returns {string|null} 見つかった値またはnull
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
     * CSVファイルを正しいエンコーディングで読み込み
     * @param {File} file - CSVファイル
     * @returns {Promise<string>} 正常に読み込まれたCSVテキスト
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
     * 正常な日本語が含まれているかチェック
     * @param {string} text - チェックするテキスト
     * @returns {boolean} 正常な日本語が含まれている場合true
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
     * CSVファイルをパースして標準形式に変換（指定された形式を使用）
     * @param {File} file - CSVファイル
     * @param {string} csvType - 手動で指定されたCSV形式（JP/US/INVST）
     * @param {function} progressCallback - 進捗コールバック関数
     * @returns {Promise<Object>} パース結果
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
            }

            this.debugLog('Papa Parse結果:', {
                rows: parseResult.data.length,
                fields: parseResult.meta.fields
            });

            if (progressCallback) progressCallback(70, 'データを変換中...');
            
            // 3. データ変換（指定された形式を使用）
            const convertedData = this.convertToStandardFormat(parseResult.data, csvType);
            this.debugLog('変換済みデータ行数:', convertedData.length);
            
            if (progressCallback) progressCallback(90, '変換完了...');

            const result = {
                success: true,
                csvType: csvType,
                description: this.csvFormats[csvType].description,
                originalRows: parseResult.data.length,
                convertedRows: convertedData.length,
                data: convertedData,
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

            if (progressCallback) progressCallback(100, '完了');
            this.debugLog('✅ CSVファイル処理完了 - 形式:', csvType);
            
            return result;

        } catch (error) {
            this.debugLog('❌ CSVファイル処理エラー:', error);
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
     * パースデータを標準形式に変換
     * @param {Object[]} rawData - Papa Parse結果データ
     * @param {string} csvType - CSV形式
     * @returns {Object[]} 変換済みデータ
     */
    convertToStandardFormat(rawData, csvType) {
        this.debugLog('=== データ変換開始 ===');
        this.debugLog('変換対象行数:', rawData.length);
        this.debugLog('CSV形式:', csvType);
        
        const convertedData = [];
        let skippedRows = 0;

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            try {
                const converted = this.convertSingleRow(row, csvType);
                if (converted) {
                    convertedData.push(converted);
                } else {
                    skippedRows++;
                }
            } catch (error) {
                skippedRows++;
                this.debugLog(`行${i+1}変換エラー:`, error, row);
            }
        }

        this.debugLog('変換完了:', {
            success: convertedData.length,
            skipped: skippedRows
        });

        return convertedData;
    }

    /**
     * 単一行を標準形式に変換
     * @param {Object} row - CSVの1行データ
     * @param {string} csvType - CSV形式
     * @returns {Object|null} 変換済みデータまたはnull
     */
    convertSingleRow(row, csvType) {
        // 空行チェック
        const hasData = Object.values(row).some(value => value && value.toString().trim() !== '');
        if (!hasData) {
            return null;
        }

        // 実際のCSVヘッダーをデバッグ出力（最初の行のみ）
        if (!this.headersLogged) {
            this.debugLog('🔍 実際のCSVヘッダー一覧:', Object.keys(row));
            this.headersLogged = true;
        }

        // 必須フィールドチェック（正常な日本語ヘッダーで）
        const format = this.csvFormats[csvType];
        for (const required of format.requiredColumns) {
            if (!row[required] || row[required].toString().trim() === '') {
                this.debugLog(`⚠️ 必須フィールド不足: ${required} (値: ${row[required]})`);
                return null;
            }
        }

        // 共通フィールド（実際の列名で参照・柔軟な検索）
        const tradeTypeColumn = this.findColumnValue(row, ['売買区分', '取引区分', '取引']);
        const rawTradeType = tradeTypeColumn || '';
        const normalizedTradeType = this.normalizeTradeType(rawTradeType);
        
        // デバッグログ追加（詳細版）
        this.debugLog(`🔍 売買区分処理:`, {
            銘柄名: row['銘柄名'] || row['ファンド名'] || '',
            元の売買区分: rawTradeType,
            正規化後: normalizedTradeType,
            CSV形式: csvType,
            '売買区分列の値': row['売買区分'],
            '取引列の値': row['取引'],
            約定日: row['約定日'],
            利用可能列: Object.keys(row).filter(key => key.includes('売買') || key.includes('取引') || key.includes('約定'))
        });
        
        const baseData = {
            date: this.parseDate(this.findColumnValue(row, ['約定日', '取引日'])),
            name: this.findColumnValue(row, ['銘柄名', 'ファンド名']) || '',
            tradeType: normalizedTradeType,
            source: 'rakuten',
            csvType: csvType,
            originalData: row
        };

        // CSV形式固有の追加データ（実際の列名で参照）
        switch (csvType) {
            case 'JP':
                const unitPriceJp = this.parseAmount(this.findColumnValue(row, ['単価［円］', '単価']) || '0');
                const amountJp = this.parseAmount(this.findColumnValue(row, ['受渡金額［円］', '受渡金額']) || '0');
                
                return {
                    ...baseData,
                    code: this.findColumnValue(row, ['銘柄コード']) || '',
                    market: this.findColumnValue(row, ['市場名称']) || '',
                    quantity: this.parseQuantity(this.findColumnValue(row, ['数量［株］', '数量']) || '0'),
                    unitPrice: unitPriceJp,
                    amount: amountJp,
                    amountJpy: amountJp, // 🆕 円換算額（JP株はそのまま）
                    unitPriceJpy: unitPriceJp, // 🆕 円換算単価（JP株はそのまま）
                    fee: this.parseAmount(this.findColumnValue(row, ['手数料［円］', '手数料']) || '0'),
                    account: this.findColumnValue(row, ['口座区分', '口座']) || '',
                    settlementCurrency: '円', // 🆕 JP株は常に円決済
                    exchangeRate: 1, // 🆕 JP株は為替レート1
                    type: 'stock',
                    region: 'JP',
                    currency: 'JPY'
                };

            case 'US':
                // 決済通貨に応じた金額取得
                const settlementCurrency = row['決済通貨'] || '';
                const exchangeRate = this.parseAmount(row['為替レート'] || '1');
                const unitPriceUsd = this.parseAmount(row['単価［USドル］'] || '0');
                const amountUsd = this.parseAmount(row['受渡金額［USドル］'] || '0');
                const amountJpyRaw = this.parseAmount(row['受渡金額［円］'] || '0');
                
                let amount, amountJpy;
                
                if (settlementCurrency === '円') {
                    // 円決済の場合：受渡金額［円］を使用
                    amount = amountJpyRaw;
                    amountJpy = amountJpyRaw;
                } else {
                    // USドル決済の場合：受渡金額［USドル］を使用
                    amount = amountUsd;
                    amountJpy = amountJpyRaw || (amountUsd * exchangeRate);
                }

                // 🆕 円換算単価を事前計算
                const unitPriceJpy = unitPriceUsd * exchangeRate;

                return {
                    ...baseData,
                    ticker: row['ティッカー'] || '',
                    quantity: this.parseQuantity(row['数量［株］'] || '0'),
                    unitPrice: unitPriceUsd,
                    amount: amount,
                    amountJpy: amountJpy,
                    unitPriceJpy: unitPriceJpy, // 🆕 円換算単価
                    fee: this.parseAmount(row['手数料［USドル］'] || '0'),
                    exchangeRate: exchangeRate,
                    settlementCurrency: settlementCurrency,
                    account: row['口座'] || '',
                    type: 'stock',
                    region: 'US',
                    currency: settlementCurrency === '円' ? 'JPY' : 'USD'
                };

            case 'INVST':
                return {
                    ...baseData,
                    quantity: this.parseQuantity(row['数量［口］'] || '0'),
                    unitPrice: this.parseAmount(row['単価'] || '0'),
                    amount: this.parseAmount(row['受渡金額/(ポイント利用)[円]'] || '0'),
                    fee: this.parseAmount(row['経費'] || '0'),
                    buyMethod: row['買付方法'] || '',
                    account: row['口座'] || '',
                    type: 'mutualFund',
                    region: 'JP',
                    currency: 'JPY',
                    isFund: true
                };

            default:
                return baseData;
        }
    }

    // ユーティリティメソッド（既存のまま）
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

    parseAmount(amountStr) {
        if (!amountStr) return 0;
        
        const cleaned = amountStr.toString().replace(/[,¥$\s]/g, '');
        const number = parseFloat(cleaned);
        
        return isNaN(number) ? 0 : Math.abs(number);
    }

    parseQuantity(quantityStr) {
        if (!quantityStr) return 0;
        
        const cleaned = quantityStr.toString().replace(/[,\s]/g, '');
        const number = parseFloat(cleaned);
        
        return isNaN(number) ? 0 : Math.abs(number);
    }

    /**
     * 複数のCSVファイルを一括処理（指定された形式を使用）
     * @param {FileList} files - 処理するファイル一覧
     * @param {string} csvType - 指定されたCSV形式（JP/US/INVST）
     * @param {function} progressCallback - 進捗コールバック関数
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
     * デバッグモードの切り替え
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.debugLog('デバッグモード変更:', enabled ? 'ON' : 'OFF');
    }
}

// グローバルインスタンス作成
const rakutenCsvParser = new RakutenCsvParser();

// windowオブジェクトにも追加
if (typeof window !== 'undefined') {
    window.rakutenCsvParser = rakutenCsvParser;
    console.log('✅ 楽天証券CSVパーサー（Shift-JIS正常読み込み版）が利用可能です');
}