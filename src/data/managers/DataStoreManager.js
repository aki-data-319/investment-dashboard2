/**
 * DataStoreManager - 投資ダッシュボード統合データ管理システム
 * @description 参照版dataManager.jsをv2アーキテクチャに統合した拡張版
 * 責任: LocalStorage管理、データ永続化、マイグレーション、バックアップ・復元
 * 配置: src/data/managers/ (Data Layer)
 * 
 * 統合元: 参照フォルダ/services-データ保存の基盤について/dataManager.js
 * 統合日: 2025-09-18
 */

export class DataStoreManager {
    // v2 repository compatibility: static storage keys used by repositories
    static DEFAULT_KEYS = {
        ASSETS: 'investment-assets',
        INDEX: 'investment-assets-index'
    };
    /**
     * DataStoreManager コンストラクタ
     * @description LocalStorageのキー名を定義し、初期設定を行います
     * @example
     * const dataManager = new DataStoreManager();
     * const funds = dataManager.getMutualFunds();
     */
    constructor(storageAdapter = null, options = {}) {
        // LocalStorageに保存する時のキー名を定義
        // これらの名前でブラウザにデータが保存されます
        this.STORAGE_KEYS = {
            mutualFunds: 'investment_mutual_funds',     // 投資信託データ
            stocks: 'investment_stocks',                // 個別株データ
            cryptoAssets: 'investment_crypto_assets',   // 仮想通貨データ
            assetHistory: 'investment_asset_history',   // 資産履歴データ
            simpleHistory: 'investment_simple_history'  // 簡単な変更履歴データ
        };
        
        // Repositoryから渡されるアダプターと設定（任意）
        this.adapter = storageAdapter;
        this.options = {
            namespacePrefix: options.namespacePrefix || 'investment-',
            versionKey: options.versionKey || 'investment-version',
            currentVersion: options.currentVersion || 1,
            debug: options.debug === true
        };
        
        // データが正常に保存できているかチェックするフラグ
        this.isStorageAvailable = this._checkStorageAvailability();
        
        console.log('📊 DataStoreManager初期化完了:', this.STORAGE_KEYS);
    }

    // ===========================================
    // 🔧 ヘルパーメソッド（補助的な機能）
    // ===========================================

    /**
     * LocalStorageが使用可能かチェックする関数
     * @description ブラウザでLocalStorageが利用できるかを確認します
     * @returns {boolean} 使用可能ならtrue、不可能ならfalse
     * @example
     * if (dataManager._checkStorageAvailability()) {
     *   console.log('LocalStorage利用可能');
     * }
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
     * @description タイムスタンプとランダム文字列を組み合わせたIDを生成
     * @returns {string} 生成されたユニークID
     * @example
     * const id = dataManager._generateUniqueId();
     * // "id_1692778800123_abc123def"
     */
    _generateUniqueId() {
        // タイムスタンプ + ランダム文字列でIDを作成
        const timestamp = Date.now(); // 現在時刻のミリ秒
        const randomString = Math.random().toString(36).substr(2, 9); // ランダム文字列
        return `id_${timestamp}_${randomString}`;
    }

    /**
     * LocalStorageからデータを安全に取得する関数
     * @description エラーハンドリングを含む安全なデータ取得
     * @param {string} key - 取得するデータのキー名
     * @param {*} defaultValue - データが見つからない時のデフォルト値
     * @returns {*} 取得したデータまたはデフォルト値
     * @example
     * const data = dataManager._getFromStorage('key', []);
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
     * @description エラーハンドリングと容量チェックを含む安全な保存
     * @param {string} key - 保存するデータのキー名
     * @param {*} data - 保存するデータ
     * @returns {boolean} 保存が成功したらtrue、失敗したらfalse
     * @example
     * const success = dataManager._saveToStorage('key', data);
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

    // ===========================================
    // 🌐 Repository互換API（公開メソッド）
    // ===========================================
    /**
     * 任意キーでデータを読み込む（アダプター優先）
     * @param {string} key
     * @returns {*|null}
     */
    load(key) {
        try {
            if (this.adapter && typeof this.adapter.load === 'function') {
                return this.adapter.load(key);
            }
            // フォールバック: 直接LocalStorageから取得
            return this._getFromStorage(key, null);
        } catch (e) {
            console.error('❌ DataStoreManager.load 失敗:', e);
            return null;
        }
    }

    /**
     * 任意キーでデータを保存（アダプター優先）
     * @param {string} key
     * @param {*} data
     * @returns {boolean}
     */
    save(key, data) {
        try {
            if (this.adapter && typeof this.adapter.save === 'function') {
                return this.adapter.save(key, data);
            }
            // フォールバック: 直接LocalStorageへ保存
            return this._saveToStorage(key, data);
        } catch (e) {
            console.error('❌ DataStoreManager.save 失敗:', e);
            return false;
        }
    }

    /**
     * 旧形式のデータを新形式にマイグレーションする関数
     * @description データ構造の変更に対応したマイグレーション処理
     * @param {Object} fund - マイグレーション対象のファンドデータ
     * @returns {Object} マイグレーション後のファンドデータ
     * @example
     * const migratedFund = dataManager._migrateFundData(oldFund);
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
     * @description データの整合性をチェックする関数
     * @param {Object} allocation - 配分データオブジェクト
     * @returns {boolean} 有効ならtrue、無効ならfalse
     * @example
     * const isValid = dataManager._validateAllocationData(allocation);
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
     * @description 必須フィールドの存在をチェック
     * @param {Object} obj - 検証するオブジェクト
     * @param {Array} requiredFields - 必須フィールド名の配列
     * @returns {Object} {isValid: boolean, errors: string[]}
     * @example
     * const result = dataManager._validateObject(data, ['name', 'amount']);
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
     * @description LocalStorageから投資信託データを取得し、必要に応じてマイグレーション
     * @returns {Array} 投資信託オブジェクトの配列
     * @example
     * const funds = dataManager.getMutualFunds();
     * console.log(`${funds.length}件の投資信託データ`);
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
     * @description 詳細な財務情報を含む投資信託データを追加
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
     * @throws {Error} バリデーションエラー、保存エラー
     * @example
     * const newFund = dataManager.addMutualFund({
     *   name: 'eMAXIS Slim 全世界株式',
     *   amount: 100000,
     *   monthlyAmount: 10000
     * });
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
     * @description 指定されたIDの投資信託データを更新
     * @param {string} id - 更新する投資信託のID
     * @param {Object} updateData - 更新するデータ
     * @returns {Object|null} 更新された投資信託オブジェクトまたはnull（失敗時）
     * @throws {Error} IDが見つからない、バリデーションエラー
     * @example
     * const updated = dataManager.updateMutualFund('id_123', {
     *   amount: 110000,
     *   gainLoss: 10000
     * });
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
     * @description 指定されたIDの投資信託を削除
     * @param {string} id - 削除する投資信託のID
     * @returns {boolean} 削除が成功したらtrue、失敗したらfalse
     * @throws {Error} IDが見つからない、保存エラー
     * @example
     * const success = dataManager.deleteMutualFund('id_123');
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
     * @description LocalStorageから個別株データを取得
     * @returns {Array} 個別株オブジェクトの配列
     * @example
     * const stocks = dataManager.getStocks();
     */
    getStocks() {
        console.log('📊 個別株データを取得中...');
        const stocks = this._getFromStorage(this.STORAGE_KEYS.stocks, []);
        console.log(`📊 取得完了: ${stocks.length}件の個別株データ`);
        return stocks;
    }

    /**
     * 新しい個別株を追加する関数
     * @description 詳細な個別株情報を追加
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
     * @example
     * const newStock = dataManager.addStock({
     *   name: 'Apple Inc.',
     *   amount: 150000,
     *   ticker: 'AAPL',
     *   region: 'US'
     * });
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
     * @description 指定されたIDの個別株データを更新
     * @param {string} id - 更新する個別株のID
     * @param {Object} updateData - 更新するデータ
     * @returns {Object|null} 更新された個別株オブジェクトまたはnull（失敗時）
     * @example
     * const updated = dataManager.updateStock('id_123', {
     *   amount: 160000,
     *   quantity: 110
     * });
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
     * @description 指定されたIDの個別株を削除
     * @param {string} id - 削除する個別株のID
     * @returns {boolean} 削除成功ならtrue、失敗ならfalse
     * @example
     * const success = dataManager.deleteStock('id_123');
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
     * @description 全個別株の評価額合計を算出
     * @returns {number} 個別株の合計評価額
     * @example
     * const total = dataManager.calculateStocksTotal();
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
     * @description LocalStorageから仮想通貨データを取得
     * @returns {Array} 仮想通貨オブジェクトの配列
     * @example
     * const cryptos = dataManager.getCryptoAssets();
     */
    getCryptoAssets() {
        console.log('💎 仮想通貨データを取得中...');
        const cryptoAssets = this._getFromStorage(this.STORAGE_KEYS.cryptoAssets, []);
        console.log(`💎 取得完了: ${cryptoAssets.length}件の仮想通貨データ`);
        return cryptoAssets;
    }

    /**
     * 新しい仮想通貨を追加する関数
     * @description 仮想通貨データを追加
     * @param {Object} crypto - 追加する仮想通貨オブジェクト
     * @param {string} crypto.name - 仮想通貨名
     * @param {number} crypto.amount - 現在の投資額
     * @param {number} crypto.stakingRate - ステーキング利率（％）
     * @param {string} crypto.platform - 取引プラットフォーム
     * @returns {Object|null} 追加された仮想通貨オブジェクトまたはnull（失敗時）
     * @example
     * const newCrypto = dataManager.addCryptoAsset({
     *   name: 'Bitcoin',
     *   amount: 500000,
     *   stakingRate: 0,
     *   platform: 'Bybit'
     * });
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
     * @description 指定されたIDの仮想通貨データを更新
     * @param {string} id - 更新する仮想通貨のID
     * @param {Object} updateData - 更新するデータ
     * @returns {Object|null} 更新された仮想通貨オブジェクトまたはnull（失敗時）
     * @example
     * const updated = dataManager.updateCryptoAsset('id_123', {
     *   amount: 550000,
     *   stakingRate: 4.5
     * });
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
     * @description 指定されたIDの仮想通貨を削除
     * @param {string} id - 削除する仮想通貨のID
     * @returns {boolean} 削除が成功したらtrue、失敗したらfalse
     * @example
     * const success = dataManager.deleteCryptoAsset('id_123');
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
     * @description 投資信託・個別株・仮想通貨の合計を計算
     * @returns {number} 総資産額
     * @example
     * const total = dataManager.calculateTotalAssets();
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
     * @description 全投資信託の評価額合計を算出
     * @returns {number} 投資信託の合計額
     * @example
     * const total = dataManager.calculateMutualFundsTotal();
     */
    calculateMutualFundsTotal() {
        const mutualFunds = this.getMutualFunds();
        return mutualFunds.reduce((total, fund) => {
            return total + (parseFloat(fund.amount) || 0);
        }, 0);
    }

    /**
     * 仮想通貨の合計額を計算する関数
     * @description 全仮想通貨の評価額合計を算出
     * @returns {number} 仮想通貨の合計額
     * @example
     * const total = dataManager.calculateCryptoAssetsTotal();
     */
    calculateCryptoAssetsTotal() {
        const cryptoAssets = this.getCryptoAssets();
        return cryptoAssets.reduce((total, crypto) => {
            return total + (parseFloat(crypto.amount) || 0);
        }, 0);
    }

    /**
     * 月次ステーキング収入の合計を計算する関数
     * @description 仮想通貨ステーキングによる月次収入を算出
     * @returns {number} 月次ステーキング収入
     * @example
     * const income = dataManager.calculateMonthlyStakingIncome();
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
    // 🕐 簡単な履歴記録システム
    // ===========================================

    /**
     * 簡単な変更履歴を記録するメソッド
     * @description データの変更履歴を記録して、いつ・何を・どう変更したかを追跡
     * @param {Object} historyEntry - 履歴エントリオブジェクト
     * @param {string} historyEntry.action - アクション種別 ('add', 'update', 'delete')
     * @param {string} historyEntry.type - データ種別 ('mutualFund', 'stock', 'cryptoAsset')
     * @param {string} historyEntry.id - 対象のデータID
     * @param {Object} historyEntry.oldData - 変更前のデータ（updateとdeleteの場合）
     * @param {Object} historyEntry.newData - 変更後のデータ（addとupdateの場合）
     * @param {string} historyEntry.timestamp - タイムスタンプ
     * @example
     * dataManager.recordSimpleHistory({
     *   action: 'update',
     *   type: 'mutualFund',
     *   id: 'id_123',
     *   oldData: oldFund,
     *   newData: updatedFund,
     *   timestamp: new Date().toISOString()
     * });
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
     * @description 履歴記録用にデータの名前を取得
     * @param {Object} historyEntry - 履歴エントリ
     * @returns {string} データ名
     * @private
     */
    _extractTargetName(historyEntry) {
        // 新しいデータがある場合はそちらから、なければ古いデータから名前を取得
        const data = historyEntry.newData || historyEntry.oldData;
        return data ? (data.name || 'Unknown') : 'Unknown';
    }

    /**
     * データの変更点を抽出するメソッド
     * @description 重要なフィールドのみを比較して、変更があった項目を記録
     * @param {Object} oldData - 変更前のデータ
     * @param {Object} newData - 変更後のデータ
     * @returns {Array} 変更点の配列
     * @private
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
     * @description 記録された変更履歴を取得
     * @returns {Array} 履歴エントリの配列（最新順）
     * @example
     * const history = dataManager.getSimpleHistory();
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
     * @description 保存されている変更履歴を全て削除
     * @returns {boolean} 削除成功可否
     * @example
     * const success = dataManager.clearSimpleHistory();
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
    // 🛠️ データメンテナンスメソッド
    // ===========================================

    /**
     * 全データをエクスポートする関数
     * @description バックアップやデータ移行用のエクスポート
     * @returns {Object} エクスポートデータ
     * @example
     * const backup = dataManager.exportAllData();
     */
    exportAllData() {
        console.log('📤 全データをエクスポート中...');
        
        const exportData = {
            mutualFunds: this.getMutualFunds(),
            stocks: this.getStocks(),
            cryptoAssets: this.getCryptoAssets(),
            simpleHistory: this.getSimpleHistory(),
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        console.log('✅ データエクスポート完了');
        return exportData;
    }

    /**
     * データをインポートする関数
     * @description バックアップからのデータ復元
     * @param {Object} importData - インポートするデータ
     * @returns {boolean} インポートが成功したらtrue、失敗したらfalse
     * @example
     * const success = dataManager.importAllData(backupData);
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
     * @description アプリリセット用（注意: 復元不可能）
     * @returns {boolean} 削除が成功したらtrue、失敗したらfalse
     * @example
     * const success = dataManager.clearAllData();
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
}

// ES6モジュールエクスポート（v2アーキテクチャ対応）
export default DataStoreManager;

// グローバルエクスポート（従来の互換性保持）
if (typeof window !== 'undefined') {
    window.DataStoreManager = DataStoreManager;
    console.log('🌍 DataStoreManager統合版をグローバルスコープに登録しました');
}
