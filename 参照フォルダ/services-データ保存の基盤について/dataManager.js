/**
 * ===========================================
 * 投資ダッシュボード - データ管理システム
 * ===========================================
 * 
 * このファイルについて：
 * - 投資信託と仮想通貨のデータを管理するためのクラスです
 * - LocalStorage（ブラウザ内のデータ保存場所）を使ってデータを保存します
 * - データの追加・取得・更新・削除（CRUD操作）を行います
 * 
 * なぜこのファイルが必要？：
 * - アプリのデータを一箇所で管理して、他の部分から簡単に使えるようにするため
 * - データの形式を統一して、エラーを防ぐため
 * - 将来的にデータ保存方法を変更する時も、このファイルだけ修正すればよくするため
 */

class DataManager {
    /**
     * コンストラクタ（クラスが作成される時に最初に実行される関数）
     * LocalStorageのキー名を定義して、初期設定を行います
     */
    constructor() {
        // LocalStorageに保存する時のキー名を定義
        // これらの名前でブラウザにデータが保存されます
        this.STORAGE_KEYS = {
            mutualFunds: 'investment_mutual_funds',     // 投資信託データ
            stocks: 'investment_stocks',                // 個別株データ
            cryptoAssets: 'investment_crypto_assets',   // 仮想通貨データ
            assetHistory: 'investment_asset_history',   // 資産履歴データ
            simpleHistory: 'investment_simple_history'  // 簡単な変更履歴データ
        };
        
        // データが正常に保存できているかチェックするフラグ
        this.isStorageAvailable = this._checkStorageAvailability();
        
        console.log('📊 DataManager初期化完了:', this.STORAGE_KEYS);
    }

    // ===========================================
    // 🔧 ヘルパーメソッド（補助的な機能）
    // ===========================================

    /**
     * LocalStorageが使用可能かチェックする関数
     * @returns {boolean} 使用可能ならtrue、不可能ならfalse
     */
    _checkStorageAvailability() {
        try {
            // テストデータを保存・削除して動作確認
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.error('❌ LocalStorage使用不可:', error.message);
            return false;
        }
    }

    /**
     * ユニークなID（一意識別子）を生成する関数
     * 例: "fund_1692778800123_abc123def"
     * @returns {string} 生成されたユニークID
     */
    _generateUniqueId() {
        // タイムスタンプ + ランダム文字列でIDを作成
        const timestamp = Date.now(); // 現在時刻のミリ秒
        const randomString = Math.random().toString(36).substr(2, 9); // ランダム文字列
        return `id_${timestamp}_${randomString}`;
    }

    /**
     * LocalStorageからデータを安全に取得する関数
     * @param {string} key - 取得するデータのキー名
     * @param {*} defaultValue - データが見つからない時のデフォルト値
     * @returns {*} 取得したデータまたはデフォルト値
     */
    _getFromStorage(key, defaultValue = []) {
        // LocalStorageが使えない場合は即座にデフォルト値を返す
        if (!this.isStorageAvailable) {
            console.warn('⚠️ LocalStorage使用不可のため、デフォルト値を返します');
            return defaultValue;
        }

        try {
            const data = localStorage.getItem(key);
            // データが存在しない場合はデフォルト値を返す
            if (data === null) {
                console.log(`📝 ${key}: データが見つからないため、デフォルト値を使用`);
                return defaultValue;
            }
            // JSON文字列をJavaScriptオブジェクトに変換
            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ ${key}のデータ取得エラー:`, error.message);
            return defaultValue;
        }
    }

    /**
     * LocalStorageにデータを安全に保存する関数
     * @param {string} key - 保存するデータのキー名
     * @param {*} data - 保存するデータ
     * @returns {boolean} 保存が成功したらtrue、失敗したらfalse
     */
    _saveToStorage(key, data) {
        if (!this.isStorageAvailable) {
            console.error('❌ LocalStorage使用不可のため、保存できません');
            return false;
        }

        try {
            // JavaScriptオブジェクトをJSON文字列に変換して保存
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`✅ ${key}: データ保存成功`);
            return true;
        } catch (error) {
            console.error(`❌ ${key}のデータ保存エラー:`, error.message);
            // 保存容量が足りない場合の対処
            if (error.name === 'QuotaExceededError') {
                alert('データ保存容量が不足しています。古いデータを削除してください。');
            }
            return false;
        }
    }

    /**
     * 旧形式のデータを新形式にマイグレーションする関数
     * @param {Object} fund - マイグレーション対象のファンドデータ
     * @returns {Object} マイグレーション後のファンドデータ
     */
    _migrateFundData(fund) {
        // すでに新形式の場合はそのまま返す
        if (fund.hasOwnProperty('units') || fund.hasOwnProperty('acquisitionCost')) {
            return fund;
        }

        // 旧形式データを新形式に変換
        return {
            // 既存の基本情報はそのまま保持
            ...fund,
            
            // 詳細財務情報（デフォルトはnull）
            units: null,
            acquisitionCost: null,
            unitPrice: null,
            gainLoss: null,
            gainLossPercent: null,
            
            // 投資戦略情報
            isAccumulating: fund.monthlyAmount > 0 || false,  // 月次積立額があれば積立中とみなす
            // monthlyAmountは既存のまま
            
            // メタ情報
            category: '投資信託',
            provider: '',
            ticker: '',
            market: '',
            
            // 時系列情報
            firstPurchase: fund.createdAt || null,  // 作成日を初回購入日とみなす
            lastUpdate: fund.updatedAt || new Date().toISOString(),
            
            // 分散分析用
            sectorAllocation: null,
            countryAllocation: null,
            
            // システム情報は既存のまま維持
            // createdAt, updatedAtは既存値を使用
        };
    }

    /**
     * 配分データ（セクター・国別）のバリデーション
     * @param {Object} allocation - 配分データオブジェクト
     * @returns {boolean} 有効ならtrue、無効ならfalse
     */
    _validateAllocationData(allocation) {
        if (!allocation || typeof allocation !== 'object') {
            return false;
        }

        let totalPercentage = 0;
        for (const [key, value] of Object.entries(allocation)) {
            // キーが空文字列でないことを確認
            if (typeof key !== 'string' || key.trim().length === 0) {
                return false;
            }
            
            // 値が数値で0以上100以下であることを確認
            const percentage = parseFloat(value);
            if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                return false;
            }
            
            totalPercentage += percentage;
        }

        // 合計が110%以下であることを確認（多少の誤差を許可）
        return totalPercentage <= 110;
    }

    /**
     * オブジェクトのバリデーション（データ検証）を行う関数
     * @param {Object} obj - 検証するオブジェクト
     * @param {Array} requiredFields - 必須フィールド名の配列
     * @returns {Object} {isValid: boolean, errors: string[]}
     */
    _validateObject(obj, requiredFields) {
        const errors = [];
        
        // オブジェクトが存在するかチェック
        if (!obj || typeof obj !== 'object') {
            errors.push('データがオブジェクト形式ではありません');
            return { isValid: false, errors };
        }

        // 必須フィールドの存在チェック
        requiredFields.forEach(field => {
            if (!obj.hasOwnProperty(field)) {
                errors.push(`必須フィールド '${field}' が見つかりません`);
            } else if (obj[field] === null || obj[field] === undefined) {
                errors.push(`フィールド '${field}' の値が無効です`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ===========================================
    // 💰 投資信託データ管理メソッド
    // ===========================================

    /**
     * 全ての投資信託データを取得する関数（マイグレーション対応）
     * @returns {Array} 投資信託オブジェクトの配列
     */
    getMutualFunds() {
        console.log('📊 投資信託データを取得中...');
        let funds = this._getFromStorage(this.STORAGE_KEYS.mutualFunds, []);
        
        // データのマイグレーション処理
        funds = funds.map(fund => this._migrateFundData(fund));
        
        console.log(`📊 取得完了: ${funds.length}件の投資信託データ`);
        return funds;
    }

    /**
     * 新しい投資信託を追加する関数（拡張版）
     * @param {Object} fund - 追加する投資信託オブジェクト
     * @param {string} fund.name - 投資信託名
     * @param {number} fund.amount - 現在評価額
     * @param {number} [fund.units] - 保有口数/株数
     * @param {number} [fund.acquisitionCost] - 取得コスト（実際の投資額）
     * @param {number} [fund.unitPrice] - 最新単価
     * @param {number} [fund.gainLoss] - 含み損益
     * @param {number} [fund.gainLossPercent] - 含み損益率(%)
     * @param {boolean} [fund.isAccumulating] - 積立設定有無
     * @param {number} [fund.monthlyAmount] - 月次積立額
     * @param {string} [fund.category] - 資産カテゴリ
     * @param {string} [fund.provider] - 証券会社
     * @param {string} [fund.ticker] - ティッカーシンボル
     * @param {string} [fund.market] - 市場
     * @param {string} [fund.firstPurchase] - 初回購入日
     * @param {Object} [fund.sectorAllocation] - セクター配分
     * @param {Object} [fund.countryAllocation] - 国別配分
     * @returns {Object|null} 追加された投資信託オブジェクトまたはnull（失敗時）
     */
    addMutualFund(fund) {
        console.log('➕ 投資信託を追加中...', fund.name);
        
        // データの形式をチェック
        const validation = this._validateObject(fund, ['name', 'amount', 'monthlyAmount']);
        if (!validation.isValid) {
            console.error('❌ 投資信託追加失敗 - バリデーションエラー:', validation.errors);
            return null;
        }

        // 現在のデータを取得
        const currentFunds = this.getMutualFunds();
        
        // 新しい投資信託オブジェクトを作成（拡張版）
        const newFund = {
            // 基本情報
            id: this._generateUniqueId(),              // ユニークID
            name: String(fund.name).trim(),           // 投資信託名
            amount: parseFloat(fund.amount) || 0,     // 現在評価額
            
            // 詳細財務情報
            units: parseFloat(fund.units) || null,                    // 保有口数/株数
            acquisitionCost: parseFloat(fund.acquisitionCost) || null, // 取得コスト
            unitPrice: parseFloat(fund.unitPrice) || null,            // 最新単価
            gainLoss: parseFloat(fund.gainLoss) || null,              // 含み損益
            gainLossPercent: parseFloat(fund.gainLossPercent) || null, // 含み損益率(%)
            
            // 投資戦略情報
            isAccumulating: Boolean(fund.isAccumulating) || false,   // 積立設定有無
            monthlyAmount: parseFloat(fund.monthlyAmount) || 0,      // 月次積立額
            
            // メタ情報
            category: String(fund.category || '投資信託').trim(),     // 資産カテゴリ
            provider: String(fund.provider || '').trim(),            // 証券会社
            ticker: String(fund.ticker || '').trim(),                // ティッカーシンボル
            market: String(fund.market || '').trim(),                // 市場
            account: String(fund.account || '').trim(),              // 口座区分（特定/一般/NISA等）
            
            // 時系列情報
            firstPurchase: fund.firstPurchase || null,               // 初回購入日
            lastUpdate: new Date().toISOString(),                    // 最終更新日
            
            // 分散分析用（オプショナル）
            sectorAllocation: fund.sectorAllocation || null,         // セクター配分
            countryAllocation: fund.countryAllocation || null,       // 国別配分
            
            // システム情報
            createdAt: new Date().toISOString(),      // 作成日時（ISO形式）
            updatedAt: new Date().toISOString()       // 更新日時
        };

        // データの妥当性をさらにチェック（拡張版）
        if (newFund.amount < 0) {
            console.error('❌ 投資信託追加失敗 - 現在評価額は負の値にできません');
            return null;
        }

        if (newFund.monthlyAmount < 0) {
            console.error('❌ 投資信託追加失敗 - 月次積立額は負の値にできません');
            return null;
        }

        if (newFund.name.length === 0) {
            console.error('❌ 投資信託追加失敗 - 名前は必須です');
            return null;
        }

        // 詳細財務情報のバリデーション
        if (newFund.units !== null && newFund.units < 0) {
            console.error('❌ 投資信託追加失敗 - 保有口数は負の値にできません');
            return null;
        }

        if (newFund.acquisitionCost !== null && newFund.acquisitionCost < 0) {
            console.error('❌ 投資信託追加失敗 - 取得コストは負の値にできません');
            return null;
        }

        if (newFund.unitPrice !== null && newFund.unitPrice < 0) {
            console.error('❌ 投資信託追加失敗 - 単価は負の値にできません');
            return null;
        }

        if (newFund.gainLossPercent !== null && (newFund.gainLossPercent < -100 || newFund.gainLossPercent > 10000)) {
            console.error('❌ 投資信託追加失敗 - 含み損益率は-100%から10000%の範囲で入力してください');
            return null;
        }

        // セクター・国別配分のバリデーション
        if (newFund.sectorAllocation && !this._validateAllocationData(newFund.sectorAllocation)) {
            console.error('❌ 投資信託追加失敗 - セクター配分データが無効です');
            return null;
        }

        if (newFund.countryAllocation && !this._validateAllocationData(newFund.countryAllocation)) {
            console.error('❌ 投資信託追加失敗 - 国別配分データが無効です');
            return null;
        }

        // 配列に新しいデータを追加
        currentFunds.push(newFund);
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.mutualFunds, currentFunds);
        if (!saveSuccess) {
            console.error('❌ 投資信託追加失敗 - データ保存エラー');
            return null;
        }

        console.log('✅ 投資信託追加成功:', newFund.name, `(ID: ${newFund.id})`);
        return newFund;
    }

    /**
     * 投資信託データを更新する関数
     * @param {string} id - 更新する投資信託のID
     * @param {Object} updateData - 更新するデータ
     * @returns {Object|null} 更新された投資信託オブジェクトまたはnull（失敗時）
     */
    updateMutualFund(id, updateData) {
        console.log('✏️ 投資信託を更新中...', id);
        
        if (!id) {
            console.error('❌ 投資信託更新失敗 - IDが指定されていません');
            return null;
        }

        // 現在のデータを取得
        const currentFunds = this.getMutualFunds();
        
        // 指定されたIDの投資信託を探す
        const fundIndex = currentFunds.findIndex(fund => fund.id === id);
        if (fundIndex === -1) {
            console.error('❌ 投資信託更新失敗 - 指定されたIDの投資信託が見つかりません:', id);
            return null;
        }

        // 🕐 履歴記録用：更新前のデータを保存
        const oldData = { ...currentFunds[fundIndex] };

        // 現在のデータを更新データでマージ（結合）
        const updatedFund = {
            ...currentFunds[fundIndex],  // 既存のデータをコピー
            ...updateData,               // 更新データで上書き
            updatedAt: new Date().toISOString()  // 更新日時は常に現在時刻にする
        };

        // データの妥当性をチェック
        if (updatedFund.amount !== undefined && updatedFund.amount < 0) {
            console.error('❌ 投資信託更新失敗 - 金額は負の値にできません');
            return null;
        }

        if (updatedFund.monthlyAmount !== undefined && updatedFund.monthlyAmount < 0) {
            console.error('❌ 投資信託更新失敗 - 月次積立額は負の値にできません');
            return null;
        }

        if (updatedFund.name !== undefined && String(updatedFund.name).trim().length === 0) {
            console.error('❌ 投資信託更新失敗 - 名前は必須です');
            return null;
        }

        // 配列内の該当データを更新
        currentFunds[fundIndex] = updatedFund;
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.mutualFunds, currentFunds);
        if (!saveSuccess) {
            console.error('❌ 投資信託更新失敗 - データ保存エラー');
            return null;
        }

        // 🕐 履歴記録：更新処理完了後に記録
        this.recordSimpleHistory({
            action: 'update',
            type: 'mutualFund',
            id: id,
            oldData: oldData,
            newData: updatedFund,
            timestamp: new Date().toISOString()
        });

        console.log('✅ 投資信託更新成功:', updatedFund.name, `(ID: ${id})`);
        return updatedFund;
    }

    /**
     * 投資信託を削除する関数
     * @param {string} id - 削除する投資信託のID
     * @returns {boolean} 削除が成功したらtrue、失敗したらfalse
     */
    deleteMutualFund(id) {
        console.log('🗑️ 投資信託を削除中...', id);
        
        if (!id) {
            console.error('❌ 投資信託削除失敗 - IDが指定されていません');
            return false;
        }

        // 現在のデータを取得
        const currentFunds = this.getMutualFunds();
        
        // 指定されたIDの投資信託を探す
        const fundIndex = currentFunds.findIndex(fund => fund.id === id);
        if (fundIndex === -1) {
            console.error('❌ 投資信託削除失敗 - 指定されたIDの投資信託が見つかりません:', id);
            return false;
        }

        // 削除対象の名前を記録（ログ用）
        const deletedFundName = currentFunds[fundIndex].name;

        // 指定されたID以外のデータを残す（つまり、指定IDのデータを削除）
        const updatedFunds = currentFunds.filter(fund => fund.id !== id);
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.mutualFunds, updatedFunds);
        if (!saveSuccess) {
            console.error('❌ 投資信託削除失敗 - データ保存エラー');
            return false;
        }

        console.log('✅ 投資信託削除成功:', deletedFundName, `(ID: ${id})`);
        return true;
    }

    // ===========================================
    // 📊 個別株データ管理メソッド
    // ===========================================

    /**
     * 全ての個別株データを取得する関数
     * @returns {Array} 個別株オブジェクトの配列
     */
    getStocks() {
        console.log('📊 個別株データを取得中...');
        const stocks = this._getFromStorage(this.STORAGE_KEYS.stocks, []);
        console.log(`📊 取得完了: ${stocks.length}件の個別株データ`);
        return stocks;
    }

    /**
     * 新しい個別株を追加する関数
     * @param {Object} stock - 追加する個別株オブジェクト
     * @param {string} stock.name - 銘柄名
     * @param {number} stock.amount - 現在評価額
     * @param {string} [stock.code] - 銘柄コード
     * @param {string} [stock.ticker] - ティッカーシンボル
     * @param {string} [stock.market] - 市場名
     * @param {string} [stock.region] - 地域 (JP/US)
     * @param {number} [stock.quantity] - 保有数量
     * @param {number} [stock.acquisitionCost] - 取得コスト
     * @param {string} [stock.provider] - 証券会社
     * @returns {Object|null} 追加された個別株オブジェクトまたはnull（失敗時）
     */
    addStock(stock) {
        console.log('➕ 個別株を追加中...', stock.name);
        
        // データの形式をチェック
        const validation = this._validateObject(stock, ['name', 'amount']);
        if (!validation.isValid) {
            console.error('❌ 個別株追加失敗 - バリデーションエラー:', validation.errors);
            return null;
        }

        // 現在のデータを取得
        const currentStocks = this.getStocks();
        
        // 新しい個別株オブジェクトを作成
        const newStock = {
            id: this._generateUniqueId(),                              // ユニークID
            name: String(stock.name).trim(),                          // 銘柄名
            amount: parseFloat(stock.amount) || 0,                    // 現在評価額
            code: String(stock.code || '').trim() || null,            // 銘柄コード
            ticker: String(stock.ticker || '').trim() || null,        // ティッカーシンボル
            market: String(stock.market || '').trim() || null,        // 市場名
            region: String(stock.region || 'JP').trim(),             // 地域
            quantity: parseFloat(stock.quantity) || 0,               // 保有数量
            acquisitionCost: parseFloat(stock.acquisitionCost) || null, // 取得コスト
            provider: String(stock.provider || '楽天証券').trim(),    // 証券会社
            account: String(stock.account || '').trim(),             // 口座区分（特定/一般/NISA等）
            source: String(stock.source || 'manual').trim(),         // データソース
            createdAt: new Date().toISOString(),                     // 作成日時
            updatedAt: new Date().toISOString(),                     // 更新日時
            // ポートフォリオ集約に必要な追加フィールド
            tradeType: String(stock.tradeType || 'buy').trim(),      // 売買区分
            date: stock.date || new Date().toISOString().split('T')[0], // 約定日
            unitPrice: parseFloat(stock.unitPrice) || 0,             // 単価
            unitPriceJpy: parseFloat(stock.unitPriceJpy) || parseFloat(stock.unitPrice) || 0, // 🆕 円換算単価
            fee: parseFloat(stock.fee) || 0,                         // 手数料
            currency: String(stock.currency || 'JPY').trim(),        // 通貨
            settlementCurrency: String(stock.settlementCurrency || (stock.region === 'JP' ? '円' : 'USドル')).trim(), // 🆕 決済通貨
            exchangeRate: parseFloat(stock.exchangeRate) || 1,       // 🆕 為替レート
            amountJpy: parseFloat(stock.amountJpy) || parseFloat(stock.amount) || 0 // 🆕 円換算金額
        };

        // データの妥当性をさらにチェック
        if (newStock.amount < 0) {
            console.error('❌ 個別株追加失敗 - 評価額は負の値にできません');
            return null;
        }

        if (newStock.name.length === 0) {
            console.error('❌ 個別株追加失敗 - 銘柄名は必須です');
            return null;
        }

        if (newStock.quantity < 0) {
            console.error('❌ 個別株追加失敗 - 保有数量は負の値にできません');
            return null;
        }

        // 配列に新しいデータを追加
        currentStocks.push(newStock);
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.stocks, currentStocks);
        if (!saveSuccess) {
            console.error('❌ 個別株追加失敗 - データ保存エラー');
            return null;
        }

        console.log('✅ 個別株追加成功:', newStock.name, `(ID: ${newStock.id})`);
        return newStock;
    }

    /**
     * 個別株データを更新する関数
     * @param {string} id - 更新する個別株のID
     * @param {Object} updateData - 更新するデータ
     * @returns {Object|null} 更新された個別株オブジェクトまたはnull（失敗時）
     */
    updateStock(id, updateData) {
        console.log('✏️ 個別株を更新中...', id);
        
        if (!id) {
            console.error('❌ 個別株更新失敗 - IDが指定されていません');
            return null;
        }

        // 現在のデータを取得
        const currentStocks = this.getStocks();
        
        // 指定されたIDの個別株を探す
        const stockIndex = currentStocks.findIndex(stock => stock.id === id);
        if (stockIndex === -1) {
            console.error('❌ 個別株更新失敗 - 指定されたIDの個別株が見つかりません:', id);
            return null;
        }

        // 🕐 履歴記録用：更新前のデータを保存
        const oldData = { ...currentStocks[stockIndex] };

        // データを更新（既存のデータとマージ）
        const updatedStock = {
            ...currentStocks[stockIndex],
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        // 更新されたデータの妥当性をチェック
        if (updatedStock.amount < 0) {
            console.error('❌ 個別株更新失敗 - 評価額は負の値にできません');
            return null;
        }

        if (!updatedStock.name || updatedStock.name.trim() === '') {
            console.error('❌ 個別株更新失敗 - 銘柄名は必須です');
            return null;
        }

        // 配列内の該当項目を更新
        currentStocks[stockIndex] = updatedStock;
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.stocks, currentStocks);
        if (!saveSuccess) {
            console.error('❌ 個別株更新失敗 - データ保存エラー');
            return null;
        }

        // 🕐 履歴記録：更新処理完了後に記録
        this.recordSimpleHistory({
            action: 'update',
            type: 'stock',
            id: id,
            oldData: oldData,
            newData: updatedStock,
            timestamp: new Date().toISOString()
        });

        console.log('✅ 個別株更新成功:', updatedStock.name);
        return updatedStock;
    }

    /**
     * 個別株を削除する関数
     * @param {string} id - 削除する個別株のID
     * @returns {boolean} 削除成功ならtrue、失敗ならfalse
     */
    deleteStock(id) {
        console.log('🗑️ 個別株を削除中...', id);
        
        if (!id) {
            console.error('❌ 個別株削除失敗 - IDが指定されていません');
            return false;
        }

        // 現在のデータを取得
        const currentStocks = this.getStocks();
        
        // 指定されたIDの個別株を探す
        const stockIndex = currentStocks.findIndex(stock => stock.id === id);
        if (stockIndex === -1) {
            console.error('❌ 個別株削除失敗 - 指定されたIDの個別株が見つかりません:', id);
            return false;
        }

        // 削除する個別株の名前を記録（ログ用）
        const stockName = currentStocks[stockIndex].name;
        
        // 配列から削除
        currentStocks.splice(stockIndex, 1);
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.stocks, currentStocks);
        if (!saveSuccess) {
            console.error('❌ 個別株削除失敗 - データ保存エラー');
            return false;
        }

        console.log('✅ 個別株削除成功:', stockName);
        return true;
    }

    /**
     * 個別株の合計評価額を計算する関数
     * @returns {number} 個別株の合計評価額
     */
    calculateStocksTotal() {
        const stocks = this.getStocks();
        const total = stocks.reduce((sum, stock) => sum + parseFloat(stock.amount), 0);
        console.log(`💰 個別株合計評価額: ¥${total.toLocaleString()}`);
        return total;
    }

    // ===========================================
    // 💎 仮想通貨データ管理メソッド
    // ===========================================

    /**
     * 全ての仮想通貨データを取得する関数
     * @returns {Array} 仮想通貨オブジェクトの配列
     */
    getCryptoAssets() {
        console.log('💎 仮想通貨データを取得中...');
        const cryptoAssets = this._getFromStorage(this.STORAGE_KEYS.cryptoAssets, []);
        console.log(`💎 取得完了: ${cryptoAssets.length}件の仮想通貨データ`);
        return cryptoAssets;
    }

    /**
     * 新しい仮想通貨を追加する関数
     * @param {Object} crypto - 追加する仮想通貨オブジェクト
     * @param {string} crypto.name - 仮想通貨名
     * @param {number} crypto.amount - 現在の投資額
     * @param {number} crypto.stakingRate - ステーキング利率（％）
     * @param {string} crypto.platform - 取引プラットフォーム
     * @returns {Object|null} 追加された仮想通貨オブジェクトまたはnull（失敗時）
     */
    addCryptoAsset(crypto) {
        console.log('➕ 仮想通貨を追加中...', crypto.name);
        
        // データの形式をチェック
        const validation = this._validateObject(crypto, ['name', 'amount', 'stakingRate', 'platform']);
        if (!validation.isValid) {
            console.error('❌ 仮想通貨追加失敗 - バリデーションエラー:', validation.errors);
            return null;
        }

        // 現在のデータを取得
        const currentCryptoAssets = this.getCryptoAssets();
        
        // 新しい仮想通貨オブジェクトを作成
        const newCrypto = {
            id: this._generateUniqueId(),                      // ユニークID
            name: String(crypto.name).trim(),                 // 名前（文字列として保存、前後の空白除去）
            amount: parseFloat(crypto.amount) || 0,           // 金額（数値に変換、無効なら0）
            stakingRate: parseFloat(crypto.stakingRate) || 0, // ステーキング利率
            platform: String(crypto.platform).trim() || 'Bybit', // プラットフォーム名
            createdAt: new Date().toISOString(),              // 作成日時（ISO形式）
            updatedAt: new Date().toISOString()               // 更新日時
        };

        // データの妥当性をさらにチェック
        if (newCrypto.amount < 0) {
            console.error('❌ 仮想通貨追加失敗 - 金額は負の値にできません');
            return null;
        }

        if (newCrypto.stakingRate < 0 || newCrypto.stakingRate > 100) {
            console.error('❌ 仮想通貨追加失敗 - ステーキング利率は0%から100%の範囲で入力してください');
            return null;
        }

        if (newCrypto.name.length === 0) {
            console.error('❌ 仮想通貨追加失敗 - 名前は必須です');
            return null;
        }

        if (newCrypto.platform.length === 0) {
            console.error('❌ 仮想通貨追加失敗 - プラットフォーム名は必須です');
            return null;
        }

        // 配列に新しいデータを追加
        currentCryptoAssets.push(newCrypto);
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.cryptoAssets, currentCryptoAssets);
        if (!saveSuccess) {
            console.error('❌ 仮想通貨追加失敗 - データ保存エラー');
            return null;
        }

        console.log('✅ 仮想通貨追加成功:', newCrypto.name, `(ID: ${newCrypto.id})`);
        return newCrypto;
    }

    /**
     * 仮想通貨データを更新する関数
     * @param {string} id - 更新する仮想通貨のID
     * @param {Object} updateData - 更新するデータ
     * @returns {Object|null} 更新された仮想通貨オブジェクトまたはnull（失敗時）
     */
    updateCryptoAsset(id, updateData) {
        console.log('✏️ 仮想通貨を更新中...', id);
        
        if (!id) {
            console.error('❌ 仮想通貨更新失敗 - IDが指定されていません');
            return null;
        }

        // 現在のデータを取得
        const currentCryptoAssets = this.getCryptoAssets();
        
        // 指定されたIDの仮想通貨を探す
        const cryptoIndex = currentCryptoAssets.findIndex(crypto => crypto.id === id);
        if (cryptoIndex === -1) {
            console.error('❌ 仮想通貨更新失敗 - 指定されたIDの仮想通貨が見つかりません:', id);
            return null;
        }

        // 🕐 履歴記録用：更新前のデータを保存
        const oldData = { ...currentCryptoAssets[cryptoIndex] };

        // 現在のデータを更新データでマージ（結合）
        const updatedCrypto = {
            ...currentCryptoAssets[cryptoIndex], // 既存のデータをコピー
            ...updateData,                       // 更新データで上書き
            updatedAt: new Date().toISOString()  // 更新日時は常に現在時刻にする
        };

        // データの妥当性をチェック
        if (updatedCrypto.amount !== undefined && updatedCrypto.amount < 0) {
            console.error('❌ 仮想通貨更新失敗 - 金額は負の値にできません');
            return null;
        }

        if (updatedCrypto.stakingRate !== undefined && (updatedCrypto.stakingRate < 0 || updatedCrypto.stakingRate > 100)) {
            console.error('❌ 仮想通貨更新失敗 - ステーキング利率は0%から100%の範囲で入力してください');
            return null;
        }

        if (updatedCrypto.name !== undefined && String(updatedCrypto.name).trim().length === 0) {
            console.error('❌ 仮想通貨更新失敗 - 名前は必須です');
            return null;
        }

        if (updatedCrypto.platform !== undefined && String(updatedCrypto.platform).trim().length === 0) {
            console.error('❌ 仮想通貨更新失敗 - プラットフォーム名は必須です');
            return null;
        }

        // 配列内の該当データを更新
        currentCryptoAssets[cryptoIndex] = updatedCrypto;
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.cryptoAssets, currentCryptoAssets);
        if (!saveSuccess) {
            console.error('❌ 仮想通貨更新失敗 - データ保存エラー');
            return null;
        }

        // 🕐 履歴記録：更新処理完了後に記録
        this.recordSimpleHistory({
            action: 'update',
            type: 'cryptoAsset',
            id: id,
            oldData: oldData,
            newData: updatedCrypto,
            timestamp: new Date().toISOString()
        });

        console.log('✅ 仮想通貨更新成功:', updatedCrypto.name, `(ID: ${id})`);
        return updatedCrypto;
    }

    /**
     * 仮想通貨を削除する関数
     * @param {string} id - 削除する仮想通貨のID
     * @returns {boolean} 削除が成功したらtrue、失敗したらfalse
     */
    deleteCryptoAsset(id) {
        console.log('🗑️ 仮想通貨を削除中...', id);
        
        if (!id) {
            console.error('❌ 仮想通貨削除失敗 - IDが指定されていません');
            return false;
        }

        // 現在のデータを取得
        const currentCryptoAssets = this.getCryptoAssets();
        
        // 指定されたIDの仮想通貨を探す
        const cryptoIndex = currentCryptoAssets.findIndex(crypto => crypto.id === id);
        if (cryptoIndex === -1) {
            console.error('❌ 仮想通貨削除失敗 - 指定されたIDの仮想通貨が見つかりません:', id);
            return false;
        }

        // 削除対象の名前を記録（ログ用）
        const deletedCryptoName = currentCryptoAssets[cryptoIndex].name;

        // 指定されたID以外のデータを残す（つまり、指定IDのデータを削除）
        const updatedCryptoAssets = currentCryptoAssets.filter(crypto => crypto.id !== id);
        
        // LocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.cryptoAssets, updatedCryptoAssets);
        if (!saveSuccess) {
            console.error('❌ 仮想通貨削除失敗 - データ保存エラー');
            return false;
        }

        console.log('✅ 仮想通貨削除成功:', deletedCryptoName, `(ID: ${id})`);
        return true;
    }

    // ===========================================
    // 💰 資産計算メソッド
    // ===========================================

    /**
     * 総資産額を計算する関数
     * 投資信託・個別株・仮想通貨の合計を返します
     * @returns {number} 総資産額
     */
    calculateTotalAssets() {
        console.log('💰 総資産を計算中...');
        
        // 投資信託の合計額を計算
        const mutualFundsTotal = this.calculateMutualFundsTotal();
        
        // 個別株の合計額を計算
        const stocksTotal = this.calculateStocksTotal();
        
        // 仮想通貨の合計額を計算
        const cryptoAssetsTotal = this.calculateCryptoAssetsTotal();
        
        // 合計を計算
        const totalAssets = mutualFundsTotal + stocksTotal + cryptoAssetsTotal;
        
        console.log(`💰 計算完了 - 投資信託: ¥${mutualFundsTotal.toLocaleString()}, 個別株: ¥${stocksTotal.toLocaleString()}, 仮想通貨: ¥${cryptoAssetsTotal.toLocaleString()}, 合計: ¥${totalAssets.toLocaleString()}`);
        
        return totalAssets;
    }

    /**
     * 投資信託の合計額を計算する関数
     * @returns {number} 投資信託の合計額
     */
    calculateMutualFundsTotal() {
        const mutualFunds = this.getMutualFunds();
        return mutualFunds.reduce((total, fund) => {
            return total + (parseFloat(fund.amount) || 0);
        }, 0);
    }

    /**
     * 仮想通貨の合計額を計算する関数
     * @returns {number} 仮想通貨の合計額
     */
    calculateCryptoAssetsTotal() {
        const cryptoAssets = this.getCryptoAssets();
        return cryptoAssets.reduce((total, crypto) => {
            return total + (parseFloat(crypto.amount) || 0);
        }, 0);
    }

    /**
     * 月次ステーキング収入の合計を計算する関数
     * @returns {number} 月次ステーキング収入
     */
    calculateMonthlyStakingIncome() {
        const cryptoAssets = this.getCryptoAssets();
        return cryptoAssets.reduce((total, crypto) => {
            const amount = parseFloat(crypto.amount) || 0;
            const rate = parseFloat(crypto.stakingRate) || 0;
            // 年利を月利に変換して計算
            const monthlyIncome = (amount * rate / 100) / 12;
            return total + monthlyIncome;
        }, 0);
    }

    // ===========================================
    // 💹 拡張された財務計算メソッド
    // ===========================================

    /**
     * 投資信託の総含み損益を計算する関数
     * @returns {number} 総含み損益
     */
    calculateTotalGainLoss() {
        const mutualFunds = this.getMutualFunds();
        return mutualFunds.reduce((total, fund) => {
            // 直接指定された含み損益がある場合はそれを使用
            if (fund.gainLoss !== null && fund.gainLoss !== undefined) {
                return total + (parseFloat(fund.gainLoss) || 0);
            }
            // 評価額と取得コストから計算
            if (fund.acquisitionCost !== null && fund.acquisitionCost !== undefined) {
                const currentValue = parseFloat(fund.amount) || 0;
                const cost = parseFloat(fund.acquisitionCost) || 0;
                return total + (currentValue - cost);
            }
            return total;
        }, 0);
    }

    /**
     * 投資信託の総取得コストを計算する関数
     * @returns {number} 総取得コスト
     */
    calculateTotalAcquisitionCost() {
        const mutualFunds = this.getMutualFunds();
        return mutualFunds.reduce((total, fund) => {
            return total + (parseFloat(fund.acquisitionCost) || 0);
        }, 0);
    }

    /**
     * 投資信託の平均含み損益率を計算する関数
     * @returns {number} 平均含み損益率(%)
     */
    calculateAverageGainLossPercent() {
        const mutualFunds = this.getMutualFunds();
        if (mutualFunds.length === 0) return 0;

        const totalCost = this.calculateTotalAcquisitionCost();
        if (totalCost === 0) return 0;

        const totalGainLoss = this.calculateTotalGainLoss();
        return (totalGainLoss / totalCost) * 100;
    }

    /**
     * 積立設定されている投資信託の月次積立合計額を計算する関数
     * @returns {number} 月次積立合計額
     */
    calculateTotalMonthlyContribution() {
        const mutualFunds = this.getMutualFunds();
        return mutualFunds.reduce((total, fund) => {
            if (fund.isAccumulating) {
                return total + (parseFloat(fund.monthlyAmount) || 0);
            }
            return total;
        }, 0);
    }

    /**
     * プロバイダー別資産配分を計算する関数
     * @returns {Object} プロバイダー別の資産額
     */
    calculateProviderAllocation() {
        const mutualFunds = this.getMutualFunds();
        const allocation = {};

        mutualFunds.forEach(fund => {
            const provider = fund.provider || '不明';
            const amount = parseFloat(fund.amount) || 0;
            allocation[provider] = (allocation[provider] || 0) + amount;
        });

        return allocation;
    }

    /**
     * カテゴリー別資産配分を計算する関数
     * @returns {Object} カテゴリー別の資産額
     */
    calculateCategoryAllocation() {
        const mutualFunds = this.getMutualFunds();
        const cryptoAssets = this.getCryptoAssets();
        const allocation = {};

        // 投資信託のカテゴリー集計
        mutualFunds.forEach(fund => {
            const category = fund.category || '投資信託';
            const amount = parseFloat(fund.amount) || 0;
            allocation[category] = (allocation[category] || 0) + amount;
        });

        // 仮想通貨の集計
        cryptoAssets.forEach(crypto => {
            const category = '仮想通貨';
            const amount = parseFloat(crypto.amount) || 0;
            allocation[category] = (allocation[category] || 0) + amount;
        });

        return allocation;
    }

    /**
     * セクター別資産配分を集計する関数
     * @returns {Object} セクター別の資産額
     */
    calculateSectorAllocation() {
        const mutualFunds = this.getMutualFunds();
        const sectorTotals = {};

        mutualFunds.forEach(fund => {
            const amount = parseFloat(fund.amount) || 0;
            
            if (fund.sectorAllocation && typeof fund.sectorAllocation === 'object') {
                Object.entries(fund.sectorAllocation).forEach(([sector, percentage]) => {
                    const sectorAmount = amount * (parseFloat(percentage) / 100);
                    sectorTotals[sector] = (sectorTotals[sector] || 0) + sectorAmount;
                });
            } else {
                // セクター配分データがない場合は「その他」に分類
                sectorTotals['その他'] = (sectorTotals['その他'] || 0) + amount;
            }
        });

        return sectorTotals;
    }

    /**
     * 国別資産配分を集計する関数
     * @returns {Object} 国別の資産額
     */
    calculateCountryAllocation() {
        const mutualFunds = this.getMutualFunds();
        const countryTotals = {};

        mutualFunds.forEach(fund => {
            const amount = parseFloat(fund.amount) || 0;
            
            if (fund.countryAllocation && typeof fund.countryAllocation === 'object') {
                Object.entries(fund.countryAllocation).forEach(([country, percentage]) => {
                    const countryAmount = amount * (parseFloat(percentage) / 100);
                    countryTotals[country] = (countryTotals[country] || 0) + countryAmount;
                });
            } else {
                // 国別配分データがない場合は「不明」に分類
                countryTotals['不明'] = (countryTotals['不明'] || 0) + amount;
            }
        });

        return countryTotals;
    }

    // ===========================================
    // 📊 資産履歴管理メソッド
    // ===========================================

    /**
     * 資産履歴を更新する関数
     * 日次でデータを記録し、グラフ表示などに使用します
     * @returns {boolean} 更新が成功したらtrue、失敗したらfalse
     */
    updateAssetHistory() {
        console.log('📊 資産履歴を更新中...');
        
        // 現在の履歴を取得
        const history = this._getFromStorage(this.STORAGE_KEYS.assetHistory, []);
        
        // 今日の日付を取得（YYYY-MM-DD形式）
        const today = new Date().toISOString().split('T')[0];
        
        // 今日の記録が既に存在するかチェック
        const existingRecordIndex = history.findIndex(record => record.date === today);
        
        // 現在の資産情報を計算
        const newRecord = {
            date: today,
            totalAssets: this.calculateTotalAssets(),
            mutualFundsTotal: this.calculateMutualFundsTotal(),
            cryptoAssetsTotal: this.calculateCryptoAssetsTotal(),
            monthlyStakingIncome: this.calculateMonthlyStakingIncome(),
            timestamp: new Date().toISOString()
        };

        // 今日の記録が既に存在する場合は更新、存在しない場合は追加
        if (existingRecordIndex !== -1) {
            history[existingRecordIndex] = newRecord;
            console.log('📊 今日の資産履歴を更新しました');
        } else {
            history.push(newRecord);
            console.log('📊 新しい資産履歴を追加しました');
        }

        // 履歴を日付順にソート（新しい順）
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 古いデータを削除（最新90日分のみ保持）
        if (history.length > 90) {
            const removedCount = history.length - 90;
            history.splice(90);
            console.log(`📊 古い履歴データ${removedCount}件を削除しました`);
        }

        // 更新された履歴をLocalStorageに保存
        const saveSuccess = this._saveToStorage(this.STORAGE_KEYS.assetHistory, history);
        
        if (saveSuccess) {
            console.log('✅ 資産履歴更新成功');
            return true;
        } else {
            console.error('❌ 資産履歴更新失敗');
            return false;
        }
    }

    /**
     * 資産履歴を取得する関数
     * @param {number} days - 取得する日数（デフォルト: 30日）
     * @returns {Array} 資産履歴の配列
     */
    getAssetHistory(days = 30) {
        const history = this._getFromStorage(this.STORAGE_KEYS.assetHistory, []);
        
        // 指定された日数分のデータを返す
        return history.slice(0, days);
    }

    // ===========================================
    // 🛠️ データメンテナンスメソッド
    // ===========================================

    /**
     * 全データをエクスポートする関数
     * バックアップやデータ移行時に使用
     * @returns {Object} エクスポートデータ
     */
    exportAllData() {
        console.log('📤 全データをエクスポート中...');
        
        const exportData = {
            mutualFunds: this.getMutualFunds(),
            stocks: this.getStocks(),
            cryptoAssets: this.getCryptoAssets(),
            assetHistory: this.getAssetHistory(90), // 90日分の履歴
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        console.log('✅ データエクスポート完了');
        return exportData;
    }

    /**
     * データをインポートする関数
     * バックアップからのデータ復元時に使用
     * @param {Object} importData - インポートするデータ
     * @returns {boolean} インポートが成功したらtrue、失敗したらfalse
     */
    importAllData(importData) {
        console.log('📥 データをインポート中...');
        
        if (!importData || typeof importData !== 'object') {
            console.error('❌ インポートデータが無効です');
            return false;
        }

        let successCount = 0;
        let totalOperations = 0;

        // 投資信託データのインポート
        if (importData.mutualFunds && Array.isArray(importData.mutualFunds)) {
            totalOperations++;
            const success = this._saveToStorage(this.STORAGE_KEYS.mutualFunds, importData.mutualFunds);
            if (success) successCount++;
        }

        // 個別株データのインポート
        if (importData.stocks && Array.isArray(importData.stocks)) {
            totalOperations++;
            const success = this._saveToStorage(this.STORAGE_KEYS.stocks, importData.stocks);
            if (success) successCount++;
        }

        // 仮想通貨データのインポート
        if (importData.cryptoAssets && Array.isArray(importData.cryptoAssets)) {
            totalOperations++;
            const success = this._saveToStorage(this.STORAGE_KEYS.cryptoAssets, importData.cryptoAssets);
            if (success) successCount++;
        }

        // 資産履歴のインポート
        if (importData.assetHistory && Array.isArray(importData.assetHistory)) {
            totalOperations++;
            const success = this._saveToStorage(this.STORAGE_KEYS.assetHistory, importData.assetHistory);
            if (success) successCount++;
        }

        const importSuccess = successCount === totalOperations && totalOperations > 0;
        
        if (importSuccess) {
            console.log('✅ データインポート完了');
        } else {
            console.error(`❌ データインポート失敗 - 成功: ${successCount}/${totalOperations}`);
        }
        
        return importSuccess;
    }

    /**
     * 全データを削除する関数
     * アプリリセット時に使用（注意: 復元不可能）
     * @returns {boolean} 削除が成功したらtrue、失敗したらfalse
     */
    clearAllData() {
        console.log('🗑️ 全データを削除中...');
        
        let successCount = 0;
        const keys = Object.values(this.STORAGE_KEYS);
        
        keys.forEach(key => {
            try {
                localStorage.removeItem(key);
                successCount++;
                console.log(`✅ ${key} 削除成功`);
            } catch (error) {
                console.error(`❌ ${key} 削除失敗:`, error.message);
            }
        });

        const clearSuccess = successCount === keys.length;
        
        if (clearSuccess) {
            console.log('✅ 全データ削除完了');
        } else {
            console.error(`❌ データ削除失敗 - 成功: ${successCount}/${keys.length}`);
        }
        
        return clearSuccess;
    }

    /**
     * データの整合性チェックを行う関数
     * 定期的に実行してデータの健全性を確認
     * @returns {Object} チェック結果
     */
    validateAllData() {
        console.log('🔍 データ整合性チェック中...');
        
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            summary: {}
        };

        try {
            // 投資信託データのチェック
            const mutualFunds = this.getMutualFunds();
            result.summary.mutualFundsCount = mutualFunds.length;
            
            // 個別株データのチェック
            const stocks = this.getStocks();
            result.summary.stocksCount = stocks.length;
            
            mutualFunds.forEach((fund, index) => {
                if (!fund.id) {
                    result.errors.push(`投資信託[${index}]: IDが見つかりません`);
                    result.isValid = false;
                }
                if (!fund.name || fund.name.trim() === '') {
                    result.errors.push(`投資信託[${index}]: 名前が未設定です`);
                    result.isValid = false;
                }
                if (isNaN(fund.amount) || fund.amount < 0) {
                    result.errors.push(`投資信託[${index}]: 金額が無効です`);
                    result.isValid = false;
                }
            });

            // 仮想通貨データのチェック
            const cryptoAssets = this.getCryptoAssets();
            result.summary.cryptoAssetsCount = cryptoAssets.length;
            
            cryptoAssets.forEach((crypto, index) => {
                if (!crypto.id) {
                    result.errors.push(`仮想通貨[${index}]: IDが見つかりません`);
                    result.isValid = false;
                }
                if (!crypto.name || crypto.name.trim() === '') {
                    result.errors.push(`仮想通貨[${index}]: 名前が未設定です`);
                    result.isValid = false;
                }
                if (isNaN(crypto.amount) || crypto.amount < 0) {
                    result.errors.push(`仮想通貨[${index}]: 金額が無効です`);
                    result.isValid = false;
                }
                if (crypto.stakingRate && (crypto.stakingRate < 0 || crypto.stakingRate > 100)) {
                    result.warnings.push(`仮想通貨[${index}]: ステーキング利率が範囲外です`);
                }
            });

            // 総資産の計算チェック
            const totalAssets = this.calculateTotalAssets();
            result.summary.totalAssets = totalAssets;
            
            if (isNaN(totalAssets)) {
                result.errors.push('総資産の計算結果が無効です');
                result.isValid = false;
            }

        } catch (error) {
            result.errors.push(`データ検証エラー: ${error.message}`);
            result.isValid = false;
        }

        console.log(`🔍 データ整合性チェック完了 - 結果: ${result.isValid ? '正常' : '異常'}`);
        
        return result;
    }

    // ===========================================
    // 🕐 簡単な履歴記録システム（新機能）
    // ===========================================

    /**
     * 簡単な変更履歴を記録するメソッド
     * 既存の更新処理に追加して、「いつ・何を・どう変更したか」を記録
     * 
     * @param {Object} historyEntry - 履歴エントリオブジェクト
     * @param {string} historyEntry.action - アクション種別 ('add', 'update', 'delete')
     * @param {string} historyEntry.type - データ種別 ('mutualFund', 'stock', 'cryptoAsset')
     * @param {string} historyEntry.id - 対象のデータID
     * @param {Object} historyEntry.oldData - 変更前のデータ（updateとdeleteの場合）
     * @param {Object} historyEntry.newData - 変更後のデータ（addとupdateの場合）
     * @param {string} historyEntry.timestamp - タイムスタンプ
     */
    recordSimpleHistory(historyEntry) {
        try {
            if (!this.isStorageAvailable) {
                console.warn('⚠️ LocalStorageが使用できないため、履歴記録をスキップします');
                return;
            }

            // 現在の履歴を取得（存在しない場合は空配列）
            let history = [];
            try {
                const stored = localStorage.getItem(this.STORAGE_KEYS.simpleHistory);
                if (stored) {
                    history = JSON.parse(stored);
                }
            } catch (parseError) {
                console.warn('⚠️ 既存の履歴データが破損しているため、新しい履歴を開始します:', parseError);
                history = [];
            }

            // 新しい履歴エントリを作成
            const newEntry = {
                id: Date.now() + Math.random(), // ユニークなID生成
                timestamp: historyEntry.timestamp,
                action: historyEntry.action,
                type: historyEntry.type,
                targetId: historyEntry.id,
                targetName: this._extractTargetName(historyEntry),
                changes: this._extractChanges(historyEntry.oldData, historyEntry.newData)
            };

            // 履歴配列の先頭に追加（最新が最初に来るように）
            history.unshift(newEntry);

            // 履歴件数を制限（最新20件のみ保持してパフォーマンス向上）
            if (history.length > 20) {
                history = history.slice(0, 20);
            }

            // LocalStorageに保存
            localStorage.setItem(this.STORAGE_KEYS.simpleHistory, JSON.stringify(history));

            console.log(`🕐 履歴記録完了: ${historyEntry.action} ${historyEntry.type} "${newEntry.targetName}"`);

        } catch (error) {
            console.error('❌ 履歴記録エラー:', error);
            // 履歴記録に失敗しても既存処理は継続（重要：既存機能に影響させない）
        }
    }

    /**
     * 対象データの名前を抽出するヘルパーメソッド
     * @param {Object} historyEntry - 履歴エントリ
     * @returns {string} データ名
     */
    _extractTargetName(historyEntry) {
        // 新しいデータがある場合はそちらから、なければ古いデータから名前を取得
        const data = historyEntry.newData || historyEntry.oldData;
        return data ? (data.name || 'Unknown') : 'Unknown';
    }

    /**
     * データの変更点を抽出するメソッド
     * 重要なフィールドのみを比較して、変更があった項目を記録
     * 
     * @param {Object} oldData - 変更前のデータ
     * @param {Object} newData - 変更後のデータ
     * @returns {Array} 変更点の配列
     */
    _extractChanges(oldData, newData) {
        const changes = [];

        // データが存在しない場合の処理
        if (!oldData && newData) {
            return [{ field: 'all', oldValue: null, newValue: '新規作成' }];
        }
        if (oldData && !newData) {
            return [{ field: 'all', oldValue: '存在', newValue: null }];
        }
        if (!oldData || !newData) {
            return [];
        }

        // チェック対象のフィールドを定義
        // 各データ種別で共通して重要なフィールド
        const checkFields = ['amount', 'monthlyAmount', 'notes', 'provider', 'stakingRate', 'quantity'];

        checkFields.forEach(field => {
            // フィールドが存在し、かつ値が変更されている場合
            if ((field in oldData || field in newData) && oldData[field] !== newData[field]) {
                changes.push({
                    field: field,
                    oldValue: oldData[field],
                    newValue: newData[field]
                });
            }
        });

        return changes;
    }

    /**
     * 保存されている履歴データを取得するメソッド
     * @returns {Array} 履歴エントリの配列（最新順）
     */
    getSimpleHistory() {
        try {
            if (!this.isStorageAvailable) {
                return [];
            }

            const stored = localStorage.getItem(this.STORAGE_KEYS.simpleHistory);
            if (!stored) {
                return [];
            }

            const history = JSON.parse(stored);
            // 最新10件のみ返す（表示用）
            return Array.isArray(history) ? history.slice(0, 10) : [];

        } catch (error) {
            console.error('❌ 履歴取得エラー:', error);
            return [];
        }
    }

    /**
     * 履歴データを全削除するメソッド
     * @returns {boolean} 削除成功可否
     */
    clearSimpleHistory() {
        try {
            if (!this.isStorageAvailable) {
                console.warn('⚠️ LocalStorageが使用できません');
                return false;
            }

            localStorage.removeItem(this.STORAGE_KEYS.simpleHistory);
            console.log('🗑️ 履歴データを削除しました');
            return true;

        } catch (error) {
            console.error('❌ 履歴削除エラー:', error);
            return false;
        }
    }

    // ===========================================
    // 🏷️ セクター管理機能（Phase 2 新機能）
    // ===========================================

    /**
     * 特定銘柄のセクター情報を更新するメソッド
     * 銘柄別ビューからのセクター入力機能で使用
     * @param {string} ticker - ティッカーシンボル/銘柄コード
     * @param {string} region - 地域（JP/US）
     * @param {Object} sectorInfo - セクター情報オブジェクト
     * @param {string} sectorInfo.sector - セクター名
     * @param {string} sectorInfo.subSector - サブセクター名
     * @param {string} [sectorInfo.industryGroup] - 業界グループ（オプション）
     * @returns {Object} 更新結果オブジェクト {success: boolean, updatedStocks: Array, message: string}
     */
    updateStockSector(ticker, region, sectorInfo) {
        console.log(`🏷️ セクター情報更新開始: ${ticker} (${region})`);
        
        try {
            // 入力値の検証
            if (!ticker || !region || !sectorInfo || !sectorInfo.sector) {
                console.error('❌ セクター更新失敗 - 必須パラメータが不足');
                return {
                    success: false,
                    updatedStocks: [],
                    message: '必須パラメータ（ticker, region, sector）が不足しています'
                };
            }

            // 現在の個別株データを取得
            const stocks = this.getStocks();
            
            // 対象銘柄の取引を特定（地域別識別子対応）
            const targetStocks = stocks.filter(stock => {
                if (region === 'JP') {
                    return stock.region === 'JP' && stock.code === ticker;
                } else {
                    return stock.region !== 'JP' && stock.ticker === ticker;
                }
            });

            if (targetStocks.length === 0) {
                console.warn(`⚠️ 対象銘柄が見つかりません: ${ticker} (${region})`);
                return {
                    success: false,
                    updatedStocks: [],
                    message: `対象銘柄が見つかりません: ${ticker}`
                };
            }

            // セクター情報の更新処理
            const updatedStocks = [];
            const updateData = {
                sector: String(sectorInfo.sector).trim(),
                subSector: String(sectorInfo.subSector || '').trim(),
                industryGroup: String(sectorInfo.industryGroup || '').trim(),
                sectorUpdatedAt: new Date().toISOString()
            };

            // 対象銘柄の全取引にセクター情報を適用
            for (const stock of targetStocks) {
                const updatedStock = this.updateStock(stock.id, updateData);
                if (updatedStock) {
                    updatedStocks.push(updatedStock);
                }
            }

            if (updatedStocks.length > 0) {
                console.log(`✅ セクター情報更新完了: ${ticker} - ${updatedStocks.length}件の取引を更新`);
                
                // sectorManagerにカスタムセクター設定を保存
                if (typeof window !== 'undefined' && window.sectorManager) {
                    window.sectorManager.updateSectorMapping(
                        region,
                        ticker,
                        sectorInfo.sector,
                        sectorInfo.subSector || ''
                    );
                }

                return {
                    success: true,
                    updatedStocks: updatedStocks,
                    message: `${ticker}のセクター情報を更新しました（${updatedStocks.length}件の取引）`
                };
            } else {
                console.error('❌ セクター情報更新失敗 - 更新処理でエラーが発生');
                return {
                    success: false,
                    updatedStocks: [],
                    message: 'セクター情報の更新処理でエラーが発生しました'
                };
            }

        } catch (error) {
            console.error('❌ セクター情報更新エラー:', error);
            return {
                success: false,
                updatedStocks: [],
                message: `セクター情報更新エラー: ${error.message}`
            };
        }
    }

    /**
     * 特定銘柄のセクター情報を取得するメソッド
     * @param {string} ticker - ティッカーシンボル/銘柄コード
     * @param {string} region - 地域（JP/US）
     * @returns {Object|null} セクター情報オブジェクトまたはnull
     */
    getStockSector(ticker, region) {
        try {
            const stocks = this.getStocks();
            
            // 対象銘柄の最初の取引を取得（セクター情報は共通のため）
            const targetStock = stocks.find(stock => {
                if (region === 'JP') {
                    return stock.region === 'JP' && stock.code === ticker;
                } else {
                    return stock.region !== 'JP' && stock.ticker === ticker;
                }
            });

            if (!targetStock) {
                return null;
            }

            return {
                sector: targetStock.sector || null,
                subSector: targetStock.subSector || null,
                industryGroup: targetStock.industryGroup || null,
                sectorUpdatedAt: targetStock.sectorUpdatedAt || null
            };

        } catch (error) {
            console.error('❌ セクター情報取得エラー:', error);
            return null;
        }
    }

    /**
     * 利用可能なセクターオプションを取得するメソッド
     * @param {string} region - 地域（JP/US）
     * @returns {Array} セクターオプションの配列
     */
    getAvailableSectorOptions(region = 'JP') {
        // sectorManagerが利用可能な場合はそちらから取得
        if (typeof window !== 'undefined' && window.sectorManager) {
            return window.sectorManager.getAvailableSectors(region);
        }

        // フォールバック用の基本セクターリスト
        if (region === 'JP') {
            return [
                '水産・農林業', '鉱業', '建設業', '食品', '繊維製品', 'パルプ・紙',
                '化学', '医薬品', '石油・石炭製品', 'ゴム製品', 'ガラス・土石製品',
                '鉄鋼', '非鉄金属', '金属製品', '機械', '電気機器', '輸送用機器',
                'その他製品', '電気・ガス業', '陸運業', '海運業', '空運業',
                '倉庫・運輸関連業', '情報・通信業', '卸売業', '小売業',
                '銀行業', '証券・商品先物取引業', '保険業', 'その他金融業',
                '不動産業', 'サービス業', 'その他'
            ];
        } else {
            return [
                'Technology', 'Health Care', 'Financials', 'Consumer Discretionary',
                'Communication Services', 'Industrials', 'Consumer Staples',
                'Energy', 'Utilities', 'Real Estate', 'Materials', 'ETF', 'Other'
            ];
        }
    }

    // ===========================================
    // 📊 銘柄別統合ビュー機能（新機能）
    // ===========================================

    /**
     * 個別株の銘柄別統合データを取得するメソッド
     * 同一銘柄（ticker）の複数取引を集約し、実際の保有状況を算出
     * @returns {Array} 銘柄別統計データの配列
     */
    getStockSummary() {
        console.log('📊 銘柄別統合データを取得中...');
        
        try {
            // 既存のgetStocks()メソッドを使用してデータ取得
            const stocks = this.getStocks();
            
            if (!stocks || stocks.length === 0) {
                console.log('📊 個別株データが存在しません');
                return [];
            }

            // 銘柄別に集約処理を実行
            const aggregated = this.aggregateBySymbol(stocks);
            
            console.log(`📊 銘柄別統合完了 - ${aggregated.length}銘柄`);
            return aggregated;

        } catch (error) {
            console.error('❌ 銘柄別統合データ取得エラー:', error);
            return [];
        }
    }

    /**
     * 地域に応じた適切な銘柄識別子を取得するヘルパーメソッド
     * JP株: code使用、US株: ticker使用
     * @param {Object} stock - 個別株データオブジェクト
     * @returns {string} 銘柄識別子
     */
    getStockIdentifier(stock) {
        try {
            if (!stock) {
                console.warn('⚠️ 株式データが空です');
                return 'UNKNOWN';
            }

            // 地域別の識別子取得
            if (stock.region === 'JP') {
                // 日本株: codeフィールドを使用
                const code = stock.code;
                if (code && code.trim() !== '') {
                    return code.trim();
                }
                console.warn('⚠️ JP株のcodeが見つかりません:', stock);
                return 'JP_UNKNOWN';
                
            } else {
                // US株その他: tickerフィールドを使用
                const ticker = stock.ticker;
                if (ticker && ticker.trim() !== '') {
                    return ticker.trim();
                }
                console.warn('⚠️ US株のtickerが見つかりません:', stock);
                return 'US_UNKNOWN';
            }

        } catch (error) {
            console.error('❌ 銘柄識別子取得エラー:', error);
            return 'ERROR';
        }
    }

    /**
     * 個別株データを銘柄（ticker/code）別に集約するメソッド
     * JP株/US株対応: 地域に応じて適切な識別子を使用
     * 加重平均取得価格、総保有数量、含み損益等を計算
     * @param {Array} stocks - 個別株データ配列
     * @returns {Array} 銘柄別集約データ配列
     */
    aggregateBySymbol(stocks) {
        if (!Array.isArray(stocks) || stocks.length === 0) {
            return [];
        }

        console.log(`📊 ${stocks.length}件の取引を銘柄別に集約中...`);

        // Step 1: 銘柄（ticker/code）別にグループ化（地域対応）
        const stockGroups = {};
        
        stocks.forEach(stock => {
            // 🆕 地域に応じた適切な識別子を取得
            const identifier = this.getStockIdentifier(stock);
            
            if (!stockGroups[identifier]) {
                stockGroups[identifier] = [];
            }
            stockGroups[identifier].push(stock);
        });

        console.log(`📊 ${Object.keys(stockGroups).length}銘柄にグループ化完了`);

        // Step 2: 各銘柄の統計計算
        const summary = Object.keys(stockGroups).map(identifier => {
            const transactions = stockGroups[identifier];
            
            // 基本情報（代表取引から取得）
            const representative = transactions[0];
            
            // 数量・金額の集計
            let totalCost = 0;           // 総取得コスト
            let totalQuantity = 0;       // 総保有数量
            let currentValue = 0;        // 現在価値
            
            transactions.forEach(tx => {
                const quantity = parseFloat(tx.quantity) || 0;
                
                // 🆕 円統一価格フィールドの使用（比較性向上）
                let avgPriceJpy = 0;
                let currentPriceJpy = 0;
                
                // 円換算取得価格: unitPriceJpy優先、fallbackで従来計算
                avgPriceJpy = parseFloat(tx.unitPriceJpy) || parseFloat(tx.unitPrice) || parseFloat(tx.averagePrice) || 0;
                
                // 円換算現在価格: currentPriceJpy優先、fallbackで取得価格
                currentPriceJpy = parseFloat(tx.currentPriceJpy) || avgPriceJpy;
                
                totalCost += quantity * avgPriceJpy;  // 🆕 円統一計算
                totalQuantity += quantity;
                currentValue += quantity * currentPriceJpy;  // 🆕 円統一計算
                
                // デバッグ用ログ（必要に応じて削除）
                if (avgPriceJpy === 0) {
                    console.warn('⚠️ 円換算平均価格が0です:', {
                        ticker: identifier,
                        region: tx.region,
                        unitPrice: tx.unitPrice,
                        unitPriceJpy: tx.unitPriceJpy,
                        averagePrice: tx.averagePrice,
                        transaction: tx
                    });
                }
            });

            // 統計計算
            const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
            const unrealizedPL = currentValue - totalCost;
            const plPercentage = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

            return {
                ticker: identifier, // JP株の場合はcode、US株の場合はtickerが入る
                name: representative.name || identifier,
                region: representative.region || 'Unknown',
                sector: representative.sector || 'Unknown',
                totalQuantity: totalQuantity,
                averagePrice: averagePrice,
                totalCost: totalCost,
                currentValue: currentValue,
                unrealizedPL: unrealizedPL,
                plPercentage: plPercentage,
                transactionCount: transactions.length,
                transactions: transactions // 詳細取引データも保持
            };
        });

        // 現在価値順で並び替え（降順）
        const sortedSummary = summary.sort((a, b) => b.currentValue - a.currentValue);
        
        console.log('📊 銘柄別統計計算完了');
        return sortedSummary;
    }
}

// ===========================================
// 🏭 インスタンス作成とエクスポート
// ===========================================

/**
 * DataManagerのグローバルインスタンスを作成
 * アプリ全体で同じインスタンスを使用することで、データの一貫性を保つ
 */
const dataManager = new DataManager();

// グローバルアクセスのためwindowオブジェクトにアタッチ（テストページ用）
if (typeof window !== 'undefined') {
    window.dataManager = dataManager;
    console.log('🌍 dataManagerをグローバルスコープに登録しました');
}