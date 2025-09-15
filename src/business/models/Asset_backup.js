/**
 * Asset モデル - Business Layer
 * 投資資産の基本データ構造とビジネスロジック
 */

export class Asset {
    /**
     * Assetクラスのコンストラクタ
     * @description 投資資産の新しいインスタンスを作成します。初期データを受け取り、必要な検証を行います。
     * @param {Object} data - 資産の初期データ
     * @param {string} [data.id] - 資産の一意識別子（省略時は自動生成）
     * @param {string} [data.name=''] - 資産名
     * @param {string} [data.type='mutualFund'] - 資産タイプ（mutualFund/stock/bond/reit/crypto/other）
     * @param {string} [data.region='JP'] - 地域（JP/US/EU/OTHER）
     * @param {string} [data.currency='JPY'] - 通貨（JPY/USD/EUR/OTHER）
     * @param {number} [data.totalInvestment=0] - 総投資額
     * @param {number} [data.currentValue=0] - 現在価値
     * @param {number} [data.quantity=0] - 保有数量
     * @param {number} [data.averagePrice=0] - 平均取得価格
     * @param {string} [data.createdAt] - 作成日時（ISO文字列形式、省略時は現在時刻）
     * @param {string} [data.updatedAt] - 更新日時（ISO文字列形式、省略時は現在時刻）
     * @param {boolean} [data.isActive=true] - アクティブ状態
     * @param {string|null} [data.sector=null] - セクター情報
     * @param {string|null} [data.subSector=null] - サブセクター情報
     * @param {string} [data.description=''] - 資産の説明
     * @param {Array<string>} [data.tags=[]] - タグ配列
     * @throws {Error} バリデーションに失敗した場合
     * @example
     * // 基本的な使用例
     * const asset = new Asset({
     *   name: '日経225インデックスファンド',
     *   type: 'mutualFund',
     *   totalInvestment: 100000,
     *   currentValue: 105000
     * });
     */
    constructor(data = {}) {
        // 基本プロパティ
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.type = data.type || 'mutualFund'; // mutualFund, stock, bond, reit, crypto
        this.region = data.region || 'JP'; // JP, US, OTHER
        this.currency = data.currency || 'JPY';
        
        // 投資関連
        this.totalInvestment = data.totalInvestment || 0; // 総投資額
        this.currentValue = data.currentValue || 0; // 現在価値
        this.quantity = data.quantity || 0; // 保有数量
        this.averagePrice = data.averagePrice || 0; // 平均取得価格
        
        // メタデータ
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        
        // セクター情報
        this.sector = data.sector || null;
        this.subSector = data.subSector || null;
        
        // 追加情報
        this.description = data.description || '';
        this.tags = data.tags || [];
        
        // バリデーション実行
        this.validate();
    }

    /**
     * ユニークIDを生成
     * @description タイムスタンプとランダム文字列を組み合わせて一意の資産IDを生成します
     * @returns {string} 'asset-{timestamp}-{randomString}' 形式の一意識別子
     * @example
     * // 生成例: "asset-1640995200000-k7j3h9x2m"
     * const id = asset.generateId();
     */
    generateId() {
        return `asset-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * データバリデーション
     * @description 資産データの妥当性を検証し、エラーがある場合は例外をスローします
     * @throws {Error} バリデーションエラーメッセージを含む例外
     * @returns {void}
     * @example
     * try {
     *   asset.validate();
     *   console.log('データは有効です');
     * } catch (error) {
     *   console.error('バリデーションエラー:', error.message);
     * }
     */
    validate() {
        const errors = [];

        // 必須フィールドチェック
        if (!this.name || this.name.trim() === '') {
            errors.push('名前は必須です');
        }

        if (this.name && this.name.length > 100) {
            errors.push('名前は100文字以内で入力してください');
        }

        // 数値フィールドチェック
        if (this.totalInvestment < 0) {
            errors.push('総投資額は0以上である必要があります');
        }

        if (this.currentValue < 0) {
            errors.push('現在価値は0以上である必要があります');
        }

        if (this.quantity < 0) {
            errors.push('保有数量は0以上である必要があります');
        }

        // 列挙型チェック
        const validTypes = ['mutualFund', 'stock', 'bond', 'reit', 'crypto', 'other'];
        if (!validTypes.includes(this.type)) {
            errors.push(`無効な資産タイプ: ${this.type}`);
        }

        const validRegions = ['JP', 'US', 'EU', 'OTHER'];
        if (!validRegions.includes(this.region)) {
            errors.push(`無効な地域: ${this.region}`);
        }

        const validCurrencies = ['JPY', 'USD', 'EUR', 'OTHER'];
        if (!validCurrencies.includes(this.currency)) {
            errors.push(`無効な通貨: ${this.currency}`);
        }

        if (errors.length > 0) {
            throw new Error(`バリデーションエラー: ${errors.join(', ')}`);
        }
    }

    /**
     * 投資額を更新（買い増し）
     * @description 新たな投資を追加し、総投資額、保有数量、平均取得価格を更新します
     * @param {number} amount - 追加投資額（正の数値）
     * @param {number} [quantity=0] - 追加購入数量
     * @throws {Error} 投資額が0以下の場合
     * @returns {Asset} メソッドチェーンのためのthisインスタンス
     * @example
     * // 10万円で500口を追加購入
     * asset.addInvestment(100000, 500);
     * 
     * // 投資額のみ追加（数量なし）
     * asset.addInvestment(50000);
     */
    addInvestment(amount, quantity = 0) {
        if (amount <= 0) {
            throw new Error('投資額は0より大きい必要があります');
        }

        this.totalInvestment += amount;
        this.quantity += quantity;
        
        // 平均取得価格の再計算
        if (this.quantity > 0) {
            this.averagePrice = this.totalInvestment / this.quantity;
        }
        
        this.updatedAt = new Date().toISOString();
        return this;
    }

    /**
     * 現在価値を更新
     * @description 資産の現在価値を新しい値に更新し、更新日時も更新します
     * @param {number} newValue - 新しい現在価値（0以上の数値）
     * @throws {Error} 現在価値が0未満の場合
     * @returns {Asset} メソッドチェーンのためのthisインスタンス
     * @example
     * // 現在価値を110万円に更新
     * asset.updateCurrentValue(1100000);
     */
    updateCurrentValue(newValue) {
        if (newValue < 0) {
            throw new Error('現在価値は0以上である必要があります');
        }
        
        this.currentValue = newValue;
        this.updatedAt = new Date().toISOString();
        return this;
    }

    /**
     * 評価損益を計算
     * @description 現在価値と総投資額の差額を計算して評価損益を返します
     * @returns {number} 評価損益（正の値は利益、負の値は損失）
     * @example
     * // 現在価値110万円、総投資額100万円の場合
     * const gainLoss = asset.getUnrealizedGainLoss(); // 100000 (10万円の利益)
     */
    getUnrealizedGainLoss() {
        return this.currentValue - this.totalInvestment;
    }

    /**
     * 利益率を計算（パーセンテージ）
     * @description 投資に対する利益率をパーセンテージで計算します
     * @returns {number} 利益率（パーセント単位、例：10.5は10.5%を意味）
     * @example
     * // 総投資額100万円、現在価値110万円の場合
     * const returnPct = asset.getReturnPercentage(); // 10.0 (10%の利益)
     * 
     * // 総投資額が0の場合
     * const returnPct = asset.getReturnPercentage(); // 0
     */
    getReturnPercentage() {
        if (this.totalInvestment === 0) return 0;
        return ((this.currentValue - this.totalInvestment) / this.totalInvestment) * 100;
    }

    /**
     * 資産の要約情報を生成
     * @description 資産の主要情報と計算結果をまとめたサマリーオブジェクトを返します
     * @returns {Object} 資産要約オブジェクト
     * @returns {string} returns.id - 資産ID
     * @returns {string} returns.name - 資産名
     * @returns {string} returns.type - 資産タイプ
     * @returns {string} returns.region - 地域
     * @returns {number} returns.totalInvestment - 総投資額
     * @returns {number} returns.currentValue - 現在価値
     * @returns {number} returns.unrealizedGainLoss - 評価損益
     * @returns {number} returns.returnPercentage - 利益率（%）
     * @returns {boolean} returns.isProfit - 利益状態かどうか
     * @returns {string|null} returns.sector - セクター
     * @returns {string} returns.createdAt - 作成日時
     * @returns {string} returns.updatedAt - 更新日時
     * @example
     * const summary = asset.getSummary();
     * console.log(`${summary.name}: ${summary.isProfit ? '利益' : '損失'}`);
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            region: this.region,
            totalInvestment: this.totalInvestment,
            currentValue: this.currentValue,
            unrealizedGainLoss: this.getUnrealizedGainLoss(),
            returnPercentage: this.getReturnPercentage(),
            isProfit: this.getUnrealizedGainLoss() >= 0,
            sector: this.sector,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * JSON形式でエクスポート
     * @description 資産インスタンスの全プロパティをJSON形式のオブジェクトに変換します
     * @returns {Object} 資産の全データを含むJSONオブジェクト
     * @returns {string} returns.id - 資産ID
     * @returns {string} returns.name - 資産名
     * @returns {string} returns.type - 資産タイプ
     * @returns {string} returns.region - 地域
     * @returns {string} returns.currency - 通貨
     * @returns {number} returns.totalInvestment - 総投資額
     * @returns {number} returns.currentValue - 現在価値
     * @returns {number} returns.quantity - 保有数量
     * @returns {number} returns.averagePrice - 平均取得価格
     * @returns {string} returns.createdAt - 作成日時
     * @returns {string} returns.updatedAt - 更新日時
     * @returns {boolean} returns.isActive - アクティブ状態
     * @returns {string|null} returns.sector - セクター
     * @returns {string|null} returns.subSector - サブセクター
     * @returns {string} returns.description - 説明
     * @returns {Array<string>} returns.tags - タグ配列
     * @example
     * const jsonData = asset.toJSON();
     * localStorage.setItem('asset', JSON.stringify(jsonData));
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            region: this.region,
            currency: this.currency,
            totalInvestment: this.totalInvestment,
            currentValue: this.currentValue,
            quantity: this.quantity,
            averagePrice: this.averagePrice,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            isActive: this.isActive,
            sector: this.sector,
            subSector: this.subSector,
            description: this.description,
            tags: this.tags
        };
    }

    /**
     * JSONからインスタンスを作成
     * @description JSONオブジェクトから新しいAssetインスタンスを作成します（静的メソッド）
     * @param {Object} json - 資産データを含むJSONオブジェクト
     * @returns {Asset} 新しく作成されたAssetインスタンス
     * @static
     * @example
     * const jsonData = JSON.parse(localStorage.getItem('asset'));
     * const asset = Asset.fromJSON(jsonData);
     * 
     * // または直接オブジェクトから
     * const asset = Asset.fromJSON({
     *   name: '投資信託A',
     *   type: 'mutualFund',
     *   totalInvestment: 100000
     * });
     */
    static fromJSON(json) {
        return new Asset(json);
    }

    /**
     * 資産のコピーを作成
     * @description 現在の資産インスタンスの完全なコピーを作成します
     * @returns {Asset} 現在のインスタンスと同じデータを持つ新しいAssetインスタンス
     * @example
     * const originalAsset = new Asset({ name: '元の資産', totalInvestment: 100000 });
     * const clonedAsset = originalAsset.clone();
     * 
     * // クローンは独立したオブジェクト
     * clonedAsset.name = '複製された資産';
     * console.log(originalAsset.name); // '元の資産' (変更されない)
     */
    clone() {
        return new Asset(this.toJSON());
    }

    /**
     * 2つの資産が同じかチェック
     * @description 現在の資産と別の資産が同じIDを持つかどうかを比較します
     * @param {*} other - 比較対象のオブジェクト
     * @returns {boolean} 同じ資産の場合はtrue、異なる場合はfalse
     * @example
     * const asset1 = new Asset({ name: '資産A' });
     * const asset2 = new Asset({ name: '資産B' });
     * const asset1Clone = asset1.clone();
     * 
     * console.log(asset1.equals(asset2)); // false (異なるID)
     * console.log(asset1.equals(asset1Clone)); // true (同じID)
     * console.log(asset1.equals("文字列")); // false (Assetインスタンスではない)
     */
    equals(other) {
        if (!(other instanceof Asset)) return false;
        return this.id === other.id;
    }

    /**
     * 表示用の文字列を生成
     * @description 資産の情報を人が読みやすい形式の文字列で返します
     * @returns {string} 資産名、タイプ、現在価値、損益情報を含む文字列
     * @example
     * const asset = new Asset({
     *   name: '日経225ファンド',
     *   type: 'mutualFund',
     *   totalInvestment: 1000000,
     *   currentValue: 1100000
     * });
     * 
     * console.log(asset.toString());
     * // "日経225ファンド (mutualFund): ¥1,100,000 (+¥100,000, +10.00%)"
     */
    toString() {
        const gainLoss = this.getUnrealizedGainLoss();
        const returnPct = this.getReturnPercentage();
        const sign = gainLoss >= 0 ? '+' : '';
        
        return `${this.name} (${this.type}): ¥${this.currentValue.toLocaleString()} (${sign}¥${gainLoss.toLocaleString()}, ${sign}${returnPct.toFixed(2)}%)`;
    }

    // ========================================
    // フォーム専用静的メソッド（Business Layer強化）
    // ========================================

    /**
     * フォームデータから資産インスタンスを作成
     * @description フォーム入力データを受け取り、ビジネスルールを適用して新しい資産インスタンスを作成します
     * @param {Object} formData - フォームから送信されたデータ
     * @param {string} formData.name - 投資信託名
     * @param {string} formData.type - 資産タイプ
     * @param {number} formData.totalInvestment - 総投資額
     * @param {number} [formData.currentValue] - 現在価値（未設定時は総投資額と同じ）
     * @param {number} [formData.quantity] - 保有数量
     * @param {string} [formData.region] - 地域
     * @param {string} [formData.currency] - 通貨
     * @param {string} [formData.sector] - セクター
     * @param {string} [formData.description] - 説明
     * @returns {Asset} 新しく作成された資産インスタンス
     * @throws {Error} フォームデータが無効な場合
     * @static
     * @example
     * const formData = {
     *   name: 'eMAXIS Slim 全世界株式',
     *   type: 'mutualFund',
     *   totalInvestment: 100000,
     *   region: 'OTHER'
     * };
     * const asset = Asset.createFromForm(formData);
     */
    static createFromForm(formData) {
        console.log('🏭 Creating Asset from form data:', formData);

        // ビジネスルール適用：currentValueのデフォルト設定
        const processedData = {
            ...formData,
            // currentValueが未設定の場合は総投資額と同じ値を設定
            currentValue: formData.currentValue || formData.totalInvestment,
            // 平均取得価格の計算（数量が設定されている場合）
            averagePrice: formData.quantity && formData.quantity > 0 
                ? formData.totalInvestment / formData.quantity 
                : 0
        };

        // Asset インスタンス作成
        const asset = new Asset(processedData);

        console.log('✅ Asset created from form data:', asset.name);
        return asset;
    }

    /**
     * フォームデータの基本バリデーション
     * @description フォームから送信されたデータがAsset作成に適しているかをチェックします
     * @param {Object} formData - バリデーション対象のフォームデータ
     * @returns {Object} バリデーション結果
     * @returns {boolean} returns.isValid - バリデーション成功フラグ
     * @returns {Array<string>} returns.errors - エラーメッセージ配列
     * @static
     * @example
     * const result = Asset.validateFormData(formData);
     * if (!result.isValid) {
     *   console.log('エラー:', result.errors);
     * }
     */
    static validateFormData(formData) {
        const errors = [];

        // 必須フィールドのビジネスルールチェック
        if (!formData.name || typeof formData.name !== 'string' || formData.name.trim() === '') {
            errors.push('投資信託名は必須です');
        }

        if (!formData.type || typeof formData.type !== 'string') {
            errors.push('資産タイプは必須です');
        }

        if (!formData.totalInvestment || typeof formData.totalInvestment !== 'number' || formData.totalInvestment <= 0) {
            errors.push('総投資額は1円以上で入力してください');
        }

        // ビジネスルール：資産タイプの妥当性
        const validTypes = ['mutualFund', 'stock', 'bond', 'reit', 'crypto', 'other'];
        if (formData.type && !validTypes.includes(formData.type)) {
            errors.push('無効な資産タイプです');
        }

        // ビジネスルール：数値の妥当性
        if (formData.currentValue !== undefined && (typeof formData.currentValue !== 'number' || formData.currentValue < 0)) {
            errors.push('現在価値は0以上で入力してください');
        }

        if (formData.quantity !== undefined && (typeof formData.quantity !== 'number' || formData.quantity < 0)) {
            errors.push('保有数量は0以上で入力してください');
        }

        // ビジネスルール：文字列長制限
        if (formData.name && formData.name.length > 100) {
            errors.push('投資信託名は100文字以内で入力してください');
        }

        if (formData.sector && formData.sector.length > 50) {
            errors.push('セクターは50文字以内で入力してください');
        }

        if (formData.description && formData.description.length > 500) {
            errors.push('説明は500文字以内で入力してください');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * 重複チェック
     * @description 新しい投資信託名が既存の資産と重複していないかをチェックします
     * @param {string} name - チェック対象の投資信託名
     * @param {Array<Asset>} existingAssets - 既存資産の配列
     * @returns {Object} 重複チェック結果
     * @returns {boolean} returns.isDuplicate - 重複フラグ
     * @returns {Asset|null} returns.duplicateAsset - 重複した資産（重複がない場合はnull）
     * @static
     * @example
     * const result = Asset.checkDuplicate('eMAXIS Slim', existingAssets);
     * if (result.isDuplicate) {
     *   console.log('重複:', result.duplicateAsset.name);
     * }
     */
    static checkDuplicate(name, existingAssets) {
        if (!name || typeof name !== 'string') {
            return { isDuplicate: false, duplicateAsset: null };
        }

        const normalizedName = name.trim().toLowerCase();
        
        const duplicateAsset = existingAssets.find(asset => 
            asset.name.toLowerCase() === normalizedName
        );

        return {
            isDuplicate: !!duplicateAsset,
            duplicateAsset: duplicateAsset || null
        };
    }

    /**
     * ビジネス定数：有効な資産タイプ
     * @description システムで使用可能な資産タイプの定数
     * @static
     * @readonly
     */
    static get VALID_TYPES() {
        return {
            MUTUAL_FUND: 'mutualFund',
            STOCK: 'stock',
            BOND: 'bond',
            REIT: 'reit',
            CRYPTO: 'crypto',
            OTHER: 'other'
        };
    }

    /**
     * ビジネス定数：有効な地域
     * @description システムで使用可能な地域の定数
     * @static
     * @readonly
     */
    static get VALID_REGIONS() {
        return {
            JAPAN: 'JP',
            US: 'US',
            EUROPE: 'EU',
            OTHER: 'OTHER'
        };
    }

    /**
     * ビジネス定数：有効な通貨
     * @description システムで使用可能な通貨の定数
     * @static
     * @readonly
     */
    static get VALID_CURRENCIES() {
        return {
            JPY: 'JPY',
            USD: 'USD',
            EUR: 'EUR',
            OTHER: 'OTHER'
        };
    }

    /**
     * 資産タイプの日本語名を取得
     * @description 資産タイプコードから日本語表示名を取得します
     * @param {string} type - 資産タイプコード
     * @returns {string} 日本語表示名
     * @static
     * @example
     * console.log(Asset.getTypeDisplayName('mutualFund')); // '投資信託'
     */
    static getTypeDisplayName(type) {
        const typeNames = {
            mutualFund: '投資信託',
            stock: '個別株式',
            bond: '債券',
            reit: 'REIT',
            crypto: '暗号資産',
            other: 'その他'
        };
        return typeNames[type] || 'その他';
    }

    /**
     * 地域の日本語名を取得
     * @description 地域コードから日本語表示名を取得します
     * @param {string} region - 地域コード
     * @returns {string} 日本語表示名
     * @static
     * @example
     * console.log(Asset.getRegionDisplayName('US')); // '米国'
     */
    static getRegionDisplayName(region) {
        const regionNames = {
            JP: '日本',
            US: '米国',
            EU: '欧州',
            OTHER: 'その他'
        };
        return regionNames[region] || 'その他';
    }
}

// デフォルトエクスポート
export default Asset;