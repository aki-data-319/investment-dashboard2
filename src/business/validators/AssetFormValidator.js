import { AssetEntity } from '../../domain/entities/AssetEntity.js';

/**
 * AssetFormValidator - 投資信託追加フォーム専用バリデーター
 * @description フォーム入力データに対する包括的なバリデーションルールを提供するBusinessLayerコンポーネント
 * 責任: フォーム特有のバリデーション、ビジネスルール適用、エラーメッセージ生成
 */
class AssetFormValidator {
    /**
     * フォームデータの包括的バリデーション
     * @description フォーム全体のデータに対して、個別フィールド検証からビジネスルール適用まで一括実行します
     * @param {Object} formData - バリデーション対象のフォームデータ
     * @param {Array<Asset>} [existingAssets=[]] - 重複チェック用の既存資産配列
     * @returns {Promise<Object>} バリデーション結果オブジェクト
     * @returns {boolean} returns.isValid - 全体バリデーション成功フラグ
     * @returns {Array<Object>} returns.errors - エラー詳細配列
     * @returns {Object} returns.processedData - ビジネスルール適用後のデータ
     * @static
     * @example
     * const result = await AssetFormValidator.validateFormData(formData, existingAssets);
     * if (!result.isValid) {
     *   result.errors.forEach(error => console.log(error.message));
     * }
     */
    static async validateFormData(formData, existingAssets = []) {
        console.log('🔍 Starting comprehensive form validation:', formData);
        
        const errors = [];
        let processedData = { ...formData };

        try {
            // 1. 必須フィールドバリデーション
            const requiredFieldErrors = this.validateRequiredFields(formData);
            errors.push(...requiredFieldErrors);

            // 2. フィールド形式バリデーション
            const formatErrors = this.validateFieldFormats(formData);
            errors.push(...formatErrors);

            // 3. ビジネスルールバリデーション
            const businessRuleErrors = this.validateBusinessRules(formData);
            errors.push(...businessRuleErrors);

            // 4. 重複チェック（非同期処理）
            const duplicateErrors = await this.validateDuplicates(formData, existingAssets);
            errors.push(...duplicateErrors);

            // 5. データ前処理（ビジネスルール適用）
            if (errors.length === 0) {
                processedData = this.applyBusinessRules(formData);
            }

            const result = {
                isValid: errors.length === 0,
                errors: errors,
                processedData: processedData
            };

            console.log(`✅ Validation completed: ${result.isValid ? 'SUCCESS' : 'FAILED'} (${errors.length} errors)`);
            return result;

        } catch (error) {
            console.error('❌ Validation process failed:', error);
            return {
                isValid: false,
                errors: [{ field: 'form', message: 'バリデーション処理中にエラーが発生しました', type: 'system' }],
                processedData: formData
            };
        }
    }

    /**
     * 必須フィールドのバリデーション
     * @description フォームの必須項目が適切に入力されているかをチェックします
     * @param {Object} formData - フォームデータ
     * @returns {Array<Object>} エラー配列
     * @private
     * @static
     */
    static validateRequiredFields(formData) {
        const errors = [];

        // 投資信託名（必須）
        if (!formData.name || typeof formData.name !== 'string' || formData.name.trim() === '') {
            errors.push({
                field: 'name',
                message: '投資信託名は必須です',
                type: 'required'
            });
        }

        // 資産タイプ（必須）
        if (!formData.type || typeof formData.type !== 'string' || formData.type.trim() === '') {
            errors.push({
                field: 'type',
                message: '資産タイプを選択してください',
                type: 'required'
            });
        }

        // 総投資額（必須）
        if (formData.totalInvestment === undefined || formData.totalInvestment === null || formData.totalInvestment === '') {
            errors.push({
                field: 'totalInvestment',
                message: '総投資額は必須です',
                type: 'required'
            });
        }

        return errors;
    }

    /**
     * フィールド形式のバリデーション
     * @description 各フィールドの形式・型・範囲をチェックします
     * @param {Object} formData - フォームデータ
     * @returns {Array<Object>} エラー配列
     * @private
     * @static
     */
    static validateFieldFormats(formData) {
        const errors = [];

        // 投資信託名の形式チェック
        if (formData.name) {
            if (typeof formData.name !== 'string') {
                errors.push({
                    field: 'name',
                    message: '投資信託名は文字列で入力してください',
                    type: 'format'
                });
            } else if (formData.name.length > 100) {
                errors.push({
                    field: 'name',
                    message: '投資信託名は100文字以内で入力してください',
                    type: 'format'
                });
            }
        }

        // 総投資額の形式チェック
        if (formData.totalInvestment !== undefined && formData.totalInvestment !== null && formData.totalInvestment !== '') {
            const totalInvestment = Number(formData.totalInvestment);
            
            if (isNaN(totalInvestment)) {
                errors.push({
                    field: 'totalInvestment',
                    message: '総投資額は数値で入力してください',
                    type: 'format'
                });
            } else if (totalInvestment <= 0) {
                errors.push({
                    field: 'totalInvestment',
                    message: '総投資額は1円以上で入力してください',
                    type: 'format'
                });
            } else if (totalInvestment > 999999999) {
                errors.push({
                    field: 'totalInvestment',
                    message: '総投資額は10億円未満で入力してください',
                    type: 'format'
                });
            } else if (!Number.isInteger(totalInvestment)) {
                errors.push({
                    field: 'totalInvestment',
                    message: '総投資額は整数で入力してください',
                    type: 'format'
                });
            }
        }

        // 現在価値の形式チェック（オプション）
        if (formData.currentValue !== undefined && formData.currentValue !== null && formData.currentValue !== '') {
            const currentValue = Number(formData.currentValue);
            
            if (isNaN(currentValue)) {
                errors.push({
                    field: 'currentValue',
                    message: '現在価値は数値で入力してください',
                    type: 'format'
                });
            } else if (currentValue < 0) {
                errors.push({
                    field: 'currentValue',
                    message: '現在価値は0以上で入力してください',
                    type: 'format'
                });
            } else if (currentValue > 999999999) {
                errors.push({
                    field: 'currentValue',
                    message: '現在価値は10億円未満で入力してください',
                    type: 'format'
                });
            } else if (!Number.isInteger(currentValue)) {
                errors.push({
                    field: 'currentValue',
                    message: '現在価値は整数で入力してください',
                    type: 'format'
                });
            }
        }

        // 保有数量の形式チェック（オプション）
        if (formData.quantity !== undefined && formData.quantity !== null && formData.quantity !== '') {
            const quantity = Number(formData.quantity);
            
            if (isNaN(quantity)) {
                errors.push({
                    field: 'quantity',
                    message: '保有数量は数値で入力してください',
                    type: 'format'
                });
            } else if (quantity < 0) {
                errors.push({
                    field: 'quantity',
                    message: '保有数量は0以上で入力してください',
                    type: 'format'
                });
            } else if (quantity > 999999999) {
                errors.push({
                    field: 'quantity',
                    message: '保有数量は10億未満で入力してください',
                    type: 'format'
                });
            }
        }

        // セクターの形式チェック（オプション）
        if (formData.sector && typeof formData.sector === 'string' && formData.sector.length > 50) {
            errors.push({
                field: 'sector',
                message: 'セクターは50文字以内で入力してください',
                type: 'format'
            });
        }

        // 説明の形式チェック（オプション）
        if (formData.description && typeof formData.description === 'string' && formData.description.length > 500) {
            errors.push({
                field: 'description',
                message: '説明は500文字以内で入力してください',
                type: 'format'
            });
        }

        return errors;
    }

    /**
     * ビジネスルールのバリデーション
     * @description アプリケーション固有のビジネスルールをチェックします
     * @param {Object} formData - フォームデータ
     * @returns {Array<Object>} エラー配列
     * @private
     * @static
     */
    static validateBusinessRules(formData) {
        const errors = [];

        // 資産タイプのビジネスルールチェック
        if (formData.type) {
            const validTypes = Object.values(AssetEntity.VALID_TYPES);
            if (!validTypes.includes(formData.type)) {
                errors.push({
                    field: 'type',
                    message: '無効な資産タイプです',
                    type: 'business'
                });
            }
        }

        // 地域のビジネスルールチェック
        if (formData.region) {
            const validRegions = Object.values(AssetEntity.VALID_REGIONS);
            if (!validRegions.includes(formData.region)) {
                errors.push({
                    field: 'region',
                    message: '無効な地域です',
                    type: 'business'
                });
            }
        }

        // 通貨のビジネスルールチェック
        if (formData.currency) {
            const validCurrencies = Object.values(AssetEntity.VALID_CURRENCIES);
            if (!validCurrencies.includes(formData.currency)) {
                errors.push({
                    field: 'currency',
                    message: '無効な通貨です',
                    type: 'business'
                });
            }
        }

        // ビジネスルール: 現在価値と総投資額の関係性
        if (formData.totalInvestment && formData.currentValue) {
            const totalInvestment = Number(formData.totalInvestment);
            const currentValue = Number(formData.currentValue);
            
            // 警告レベル: 現在価値が総投資額の10倍を超える場合
            if (currentValue > totalInvestment * 10) {
                errors.push({
                    field: 'currentValue',
                    message: '現在価値が総投資額の10倍を超えています。入力内容を確認してください',
                    type: 'business',
                    severity: 'warning'
                });
            }
        }

        // ビジネスルール: 投資信託名の命名規則
        if (formData.name && typeof formData.name === 'string') {
            const name = formData.name.trim();
            
            // 危険な文字列パターンをチェック
            const dangerousPatterns = [
                /script/i,
                /<[^>]*>/,  // HTMLタグ
                /javascript:/i
            ];
            
            for (const pattern of dangerousPatterns) {
                if (pattern.test(name)) {
                    errors.push({
                        field: 'name',
                        message: '投資信託名に使用できない文字が含まれています',
                        type: 'business'
                    });
                    break;
                }
            }
        }

        return errors;
    }

    /**
     * 重複チェックのバリデーション
     * @description 既存の資産との重複をチェックします
     * @param {Object} formData - フォームデータ
     * @param {Array<Asset>} existingAssets - 既存資産配列
     * @returns {Promise<Array<Object>>} エラー配列
     * @private
     * @static
     */
    static async validateDuplicates(formData, existingAssets) {
        const errors = [];

        if (formData.name && typeof formData.name === 'string' && existingAssets.length > 0) {
            try {
                const duplicateResult = AssetEntity.checkDuplicate(formData.name, existingAssets);
                
                if (duplicateResult.isDuplicate) {
                    errors.push({
                        field: 'name',
                        message: `同名の投資信託「${duplicateResult.duplicateAsset.name}」が既に登録されています`,
                        type: 'duplicate',
                        isFormError: true,
                        duplicateAsset: duplicateResult.duplicateAsset
                    });
                }
            } catch (error) {
                console.warn('⚠️ Duplicate check failed:', error);
                // 重複チェックのエラーは警告レベルとして処理
                errors.push({
                    field: 'name',
                    message: '重複チェックに失敗しました。名前を確認してください',
                    type: 'duplicate',
                    severity: 'warning'
                });
            }
        }

        return errors;
    }

    /**
     * ビジネスルールの適用（データ前処理）
     * @description バリデーション済みデータにビジネスルールを適用して最終データを生成します
     * @param {Object} formData - バリデーション済みフォームデータ
     * @returns {Object} ビジネスルール適用後のデータ
     * @private
     * @static
     */
    static applyBusinessRules(formData) {
        const processedData = { ...formData };

        // ビジネスルール1: currentValueのデフォルト設定
        if (!processedData.currentValue || processedData.currentValue === 0) {
            processedData.currentValue = processedData.totalInvestment;
            console.log('💼 Applied business rule: currentValue = totalInvestment');
        }

        // ビジネスルール2: 平均取得価格の自動計算
        if (processedData.quantity && processedData.quantity > 0 && processedData.totalInvestment) {
            processedData.averagePrice = processedData.totalInvestment / processedData.quantity;
            console.log('💼 Applied business rule: averagePrice calculated');
        }

        // ビジネスルール3: 地域・通貨のデフォルト設定
        if (!processedData.region) {
            processedData.region = AssetEntity.VALID_REGIONS.JAPAN;
            console.log('💼 Applied business rule: region default = JP');
        }

        if (!processedData.currency) {
            processedData.currency = AssetEntity.VALID_CURRENCIES.JPY;
            console.log('💼 Applied business rule: currency default = JPY');
        }

        // ビジネスルール4: 文字列の正規化
        if (processedData.name) {
            processedData.name = processedData.name.trim();
        }

        if (processedData.sector) {
            processedData.sector = processedData.sector.trim();
        }

        if (processedData.description) {
            processedData.description = processedData.description.trim();
        }

        console.log('💼 Business rules applied successfully');
        return processedData;
    }

    /**
     * 個別フィールドのリアルタイムバリデーション
     * @description 単一フィールドの即座バリデーション（リアルタイム用）
     * @param {string} fieldName - フィールド名
     * @param {*} value - フィールド値
     * @param {Object} [options={}] - バリデーションオプション
     * @returns {Object} バリデーション結果
     * @returns {boolean} returns.isValid - フィールドバリデーション成功フラグ
     * @returns {string|null} returns.error - エラーメッセージ（エラーがない場合はnull）
     * @static
     * @example
     * const result = AssetFormValidator.validateField('name', 'eMAXIS Slim');
     * if (!result.isValid) {
     *   console.log(result.error);
     * }
     */
    static validateField(fieldName, value, options = {}) {
        try {
            switch (fieldName) {
                case 'name':
                    return this.validateNameField(value);
                
                case 'type':
                    return this.validateTypeField(value);
                
                case 'totalInvestment':
                    return this.validateTotalInvestmentField(value);
                
                case 'currentValue':
                    return this.validateCurrentValueField(value);
                
                case 'quantity':
                    return this.validateQuantityField(value);
                
                case 'sector':
                    return this.validateSectorField(value);
                
                case 'description':
                    return this.validateDescriptionField(value);
                
                default:
                    return { isValid: true, error: null };
            }
        } catch (error) {
            console.error(`❌ Field validation failed for ${fieldName}:`, error);
            return { isValid: false, error: 'バリデーション処理中にエラーが発生しました' };
        }
    }

    /**
     * 投資信託名フィールドのバリデーション
     * @param {*} value - フィールド値
     * @returns {Object} バリデーション結果
     * @private
     * @static
     */
    static validateNameField(value) {
        if (!value || typeof value !== 'string' || value.trim() === '') {
            return { isValid: false, error: '投資信託名は必須です' };
        }

        if (value.length > 100) {
            return { isValid: false, error: '投資信託名は100文字以内で入力してください' };
        }

        // セキュリティチェック
        const dangerousPatterns = [/<[^>]*>/, /script/i, /javascript:/i];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(value)) {
                return { isValid: false, error: '使用できない文字が含まれています' };
            }
        }

        return { isValid: true, error: null };
    }

    /**
     * 資産タイプフィールドのバリデーション
     * @param {*} value - フィールド値
     * @returns {Object} バリデーション結果
     * @private
     * @static
     */
    static validateTypeField(value) {
        if (!value || typeof value !== 'string') {
            return { isValid: false, error: '資産タイプを選択してください' };
        }

        const validTypes = Object.values(AssetEntity.VALID_TYPES);
        if (!validTypes.includes(value)) {
            return { isValid: false, error: '無効な資産タイプです' };
        }

        return { isValid: true, error: null };
    }

    /**
     * 総投資額フィールドのバリデーション
     * @param {*} value - フィールド値
     * @returns {Object} バリデーション結果
     * @private
     * @static
     */
    static validateTotalInvestmentField(value) {
        if (value === undefined || value === null || value === '') {
            return { isValid: false, error: '総投資額は必須です' };
        }

        const numValue = Number(value);
        
        if (isNaN(numValue)) {
            return { isValid: false, error: '数値を入力してください' };
        }

        if (numValue <= 0) {
            return { isValid: false, error: '1円以上で入力してください' };
        }

        if (numValue > 999999999) {
            return { isValid: false, error: '10億円未満で入力してください' };
        }

        if (!Number.isInteger(numValue)) {
            return { isValid: false, error: '整数で入力してください' };
        }

        return { isValid: true, error: null };
    }

    /**
     * 現在価値フィールドのバリデーション
     * @param {*} value - フィールド値
     * @returns {Object} バリデーション結果
     * @private
     * @static
     */
    static validateCurrentValueField(value) {
        // オプションフィールドなので空は許可
        if (value === undefined || value === null || value === '') {
            return { isValid: true, error: null };
        }

        const numValue = Number(value);
        
        if (isNaN(numValue)) {
            return { isValid: false, error: '数値を入力してください' };
        }

        if (numValue < 0) {
            return { isValid: false, error: '0以上で入力してください' };
        }

        if (numValue > 999999999) {
            return { isValid: false, error: '10億円未満で入力してください' };
        }

        if (!Number.isInteger(numValue)) {
            return { isValid: false, error: '整数で入力してください' };
        }

        return { isValid: true, error: null };
    }

    /**
     * 保有数量フィールドのバリデーション
     * @param {*} value - フィールド値
     * @returns {Object} バリデーション結果
     * @private
     * @static
     */
    static validateQuantityField(value) {
        // オプションフィールドなので空は許可
        if (value === undefined || value === null || value === '') {
            return { isValid: true, error: null };
        }

        const numValue = Number(value);
        
        if (isNaN(numValue)) {
            return { isValid: false, error: '数値を入力してください' };
        }

        if (numValue < 0) {
            return { isValid: false, error: '0以上で入力してください' };
        }

        if (numValue > 999999999) {
            return { isValid: false, error: '10億未満で入力してください' };
        }

        return { isValid: true, error: null };
    }

    /**
     * セクターフィールドのバリデーション
     * @param {*} value - フィールド値
     * @returns {Object} バリデーション結果
     * @private
     * @static
     */
    static validateSectorField(value) {
        // オプションフィールドなので空は許可
        if (!value) {
            return { isValid: true, error: null };
        }

        if (typeof value !== 'string') {
            return { isValid: false, error: '文字列で入力してください' };
        }

        if (value.length > 50) {
            return { isValid: false, error: '50文字以内で入力してください' };
        }

        return { isValid: true, error: null };
    }

    /**
     * 説明フィールドのバリデーション
     * @param {*} value - フィールド値
     * @returns {Object} バリデーション結果
     * @private
     * @static
     */
    static validateDescriptionField(value) {
        // オプションフィールドなので空は許可
        if (!value) {
            return { isValid: true, error: null };
        }

        if (typeof value !== 'string') {
            return { isValid: false, error: '文字列で入力してください' };
        }

        if (value.length > 500) {
            return { isValid: false, error: '500文字以内で入力してください' };
        }

        return { isValid: true, error: null };
    }

    /**
     * エラーメッセージのフォーマット
     * @description バリデーションエラーをユーザーフレンドリーなメッセージに変換します
     * @param {Array<Object>} errors - エラー配列
     * @returns {Object} フォーマット済みエラー情報
     * @static
     * @example
     * const formatted = AssetFormValidator.formatErrors(errors);
     * console.log(formatted.summary); // "3件のエラーがあります"
     */
    static formatErrors(errors) {
        if (!errors || errors.length === 0) {
            return {
                summary: '',
                fieldErrors: {},
                formErrors: []
            };
        }

        const fieldErrors = {};
        const formErrors = [];

        errors.forEach(error => {
            if (error.isFormError) {
                formErrors.push(error.message);
            } else if (error.field) {
                fieldErrors[error.field] = error.message;
            }
        });

        const summary = `${errors.length}件のエラーがあります`;

        return {
            summary,
            fieldErrors,
            formErrors
        };
    }
}

export { AssetFormValidator };
