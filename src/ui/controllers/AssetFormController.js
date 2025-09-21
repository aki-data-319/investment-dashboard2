import { AssetFormView } from '../views/AssetFormView.js';
import { AssetEntity } from '../../domain/entities/AssetEntity.js';
import { AssetCalculator } from '../../business/models/AssetCalculator.js';
import { AssetFormValidator } from '../../business/validators/AssetFormValidator.js';

/**
 * AssetFormController - 投資信託追加フォームの制御を担当
 * @description 投資信託追加フォームのビジネスロジック、バリデーション、データ処理を管理するコントローラークラス
 * 責任: フォーム制御、ユーザー操作処理、バリデーション実行、データ保存の仲介
 */
class AssetFormController {
    /**
     * AssetFormControllerのコンストラクタ
     * @description AssetFormViewの初期化と必要な依存関係の設定を行います
     * @param {AssetRepository} assetRepository - 資産データの永続化を担当するリポジトリ
     * @param {DashboardController} dashboardController - ダッシュボードの更新を担当するコントローラー
     * @example
     * const formController = new AssetFormController(assetRepository, dashboardController);
     * formController.openForm();
     */
    constructor(assetRepository, dashboardController) {
        this.view = new AssetFormView();
        this.assetRepository = assetRepository;
        this.dashboardController = dashboardController;
        this.isProcessing = false;
        
        console.log('🎮 AssetFormController initialized');
    }

    /**
     * フォームを開く
     * @description 投資信託追加フォームモーダルを表示し、イベントリスナーを設定します
     * @returns {void}
     * @example
     * formController.openForm();
     * // フォームモーダルが表示され、入力可能になる
     */
    openForm() {
        console.log('📝 Opening asset form...');
        
        try {
            // ビューでモーダル表示
            this.view.showModal();
            
            // イベントリスナー設定
            this.bindFormEvents();
            
            console.log('✅ Asset form opened successfully');
            
        } catch (error) {
            console.error('❌ Failed to open asset form:', error);
            alert('フォームの表示に失敗しました。ページを再読み込みしてお試しください。');
        }
    }

    /**
     * フォームを閉じる
     * @description フォームモーダルを非表示にし、リソースをクリーンアップします
     * @returns {void}
     * @example
     * formController.closeForm();
     * // フォームモーダルが閉じられ、入力内容がリセットされる
     */
    closeForm() {
        console.log('📝 Closing asset form...');
        
        try {
            // ビューでモーダル非表示
            this.view.hideModal();
            
            // 処理中フラグをリセット
            this.isProcessing = false;
            
            console.log('✅ Asset form closed successfully');
            
        } catch (error) {
            console.error('❌ Failed to close asset form:', error);
        }
    }

    /**
     * フォームイベントリスナーを設定
     * @description フォーム送信、フィールド変更、キャンセル等のイベントリスナーを設定します
     * @returns {void}
     * @private
     */
    bindFormEvents() {
        const formElement = document.querySelector('#assetForm');
        if (!formElement) {
            console.error('❌ Form element not found');
            return;
        }

        // フォーム送信イベント
        formElement.addEventListener('submit', this.handleSubmit.bind(this));

        // リアルタイムバリデーション用のフィールドイベント
        this.bindFieldValidationEvents();

        console.log('🔗 Form events bound successfully');
    }

    /**
     * フィールドバリデーション用イベントを設定
     * @description 各入力フィールドにリアルタイムバリデーション用のイベントリスナーを設定します
     * @returns {void}
     * @private
     */
    bindFieldValidationEvents() {
        const fieldMappings = [
            { selector: '[name="name"]', handler: this.validateName.bind(this) },
            { selector: '[name="type"]', handler: this.validateType.bind(this) },
            { selector: '[name="totalInvestment"]', handler: this.validateTotalInvestment.bind(this) },
            { selector: '[name="currentValue"]', handler: this.validateCurrentValue.bind(this) },
            { selector: '[name="quantity"]', handler: this.validateQuantity.bind(this) }
        ];

        fieldMappings.forEach(({ selector, handler }) => {
            const field = document.querySelector(selector);
            if (field) {
                // 入力時とフォーカス離脱時にバリデーション
                field.addEventListener('input', (e) => handler(e.target.value, e.target.name));
                field.addEventListener('blur', (e) => handler(e.target.value, e.target.name));
            }
        });
    }

    /**
     * フォーム送信処理
     * @description フォーム送信時の処理を実行し、バリデーション、データ保存を行います
     * @param {Event} event - フォーム送信イベント
     * @returns {Promise<void>}
     * @example
     * // フォーム送信時に自動実行
     * formElement.addEventListener('submit', controller.handleSubmit.bind(controller));
     */
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isProcessing) {
            console.warn('⚠️ Form submission already in progress');
            return;
        }

        console.log('🚀 Processing form submission...');
        this.isProcessing = true;

        try {
            // ローディング状態表示
            this.view.showLoading();
            this.view.clearAllFieldErrors();

            // フォームデータ取得
            const formData = this.view.getFormData();
            console.log('📋 Form data collected:', formData);

            // 全体バリデーション実行
            const validationResult = await this.validateFormData(formData);
            if (!validationResult.isValid) {
                this.displayValidationErrors(validationResult.errors);
                return;
            }

            // データ保存処理（BusinessLayer処理済みデータを使用）
            const savedAsset = await this.saveAsset(validationResult.processedData);
            console.log('✅ Asset saved successfully:', savedAsset.name);

            // 成功フィードバック
            this.view.showSuccessMessage(`「${savedAsset.name}」を追加しました`);

            // ダッシュボード更新
            if (this.dashboardController && typeof this.dashboardController.refreshData === 'function') {
                await this.dashboardController.refreshData();
            }

        } catch (error) {
            console.error('❌ Form submission failed:', error);
            this.handleSubmissionError(error);
            
        } finally {
            this.view.hideLoading();
            this.isProcessing = false;
        }
    }

    /**
     * フォームデータ全体のバリデーション
     * @description BusinessLayerのバリデーターを使用してフォーム全体のデータを包括的にバリデーションします
     * @param {Object} formData - フォームデータオブジェクト
     * @returns {Promise<Object>} バリデーション結果オブジェクト
     * @returns {boolean} returns.isValid - バリデーション成功フラグ
     * @returns {Array<Object>} returns.errors - エラー配列
     * @returns {Object} returns.processedData - ビジネスルール適用後のデータ
     * @example
     * const result = await controller.validateFormData(formData);
     * if (!result.isValid) {
     *   console.log('エラー:', result.errors);
     * }
     */
    async validateFormData(formData) {
        console.log('🔍 Delegating validation to BusinessLayer...');

        try {
            // 既存資産を取得（重複チェック用）
            const existingAssets = await this.assetRepository.getAllAssets();

            // BusinessLayerのバリデーターを使用
            const validationResult = await AssetFormValidator.validateFormData(formData, existingAssets);

            console.log(`✅ BusinessLayer validation completed: ${validationResult.isValid ? 'SUCCESS' : 'FAILED'}`);
            return validationResult;

        } catch (error) {
            console.error('❌ BusinessLayer validation failed:', error);
            return {
                isValid: false,
                errors: [{ 
                    field: 'form', 
                    message: 'バリデーション処理中にエラーが発生しました',
                    isFormError: true 
                }],
                processedData: formData
            };
        }
    }

    /**
     * 資産データを保存
     * @description BusinessLayerでビジネスルールを適用済みのデータを使用して新しい資産を保存します
     * @param {Object} processedData - ビジネスルール適用済みフォームデータ
     * @returns {Promise<Asset>} 保存された資産オブジェクト
     * @throws {Error} 保存処理に失敗した場合
     * @example
     * const savedAsset = await controller.saveAsset(processedData);
     * console.log('保存完了:', savedAsset.name);
     */
    async saveAsset(processedData) {
        console.log('💾 Saving asset data using BusinessLayer...');

        try {
            // BusinessLayerのAssetEntityクラスを使用してインスタンス作成
            const assetEntity = AssetEntity.createFromForm(processedData);
            
            // リポジトリで保存実行（既にBusinessLayerで処理済みのAssetEntityインスタンス）
            const savedAsset = await this.assetRepository.addAsset(assetEntity.toJSON());
            
            console.log('✅ AssetEntity saved to repository via BusinessLayer:', savedAsset.id);
            return savedAsset;

        } catch (error) {
            console.error('❌ Failed to save AssetEntity via BusinessLayer:', error);
            throw new Error(`資産の保存に失敗しました: ${error.message}`);
        }
    }

    /**
     * バリデーションエラーを表示
     * @description バリデーション結果のエラーを適切な場所に表示します
     * @param {Array<Object>} errors - エラー配列
     * @returns {void}
     * @private
     */
    displayValidationErrors(errors) {
        console.log('❌ Displaying validation errors:', errors);

        // フォーム全体エラーとフィールドエラーを分離
        const formErrors = errors.filter(error => error.isFormError);
        const fieldErrors = errors.filter(error => !error.isFormError);

        // フィールドエラー表示
        fieldErrors.forEach(error => {
            this.view.showFieldError(error.field, error.message);
        });

        // フォーム全体エラー表示
        if (formErrors.length > 0) {
            const formErrorMessage = formErrors.map(error => error.message).join('、');
            this.view.showFormError(formErrorMessage);
        }
    }

    /**
     * 送信エラーを処理
     * @description フォーム送信時のエラーを適切に処理し、ユーザーにフィードバックします
     * @param {Error} error - 発生したエラー
     * @returns {void}
     * @private
     */
    handleSubmissionError(error) {
        console.error('❌ Handling submission error:', error);

        let userMessage = '投資信託の追加に失敗しました。';
        
        // エラーの種類に応じたメッセージ
        if (error.message.includes('保存')) {
            userMessage = 'データの保存に失敗しました。再度お試しください。';
        } else if (error.message.includes('ネットワーク')) {
            userMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
        } else if (error.message.includes('バリデーション')) {
            userMessage = '入力内容に問題があります。確認してください。';
        }

        this.view.showFormError(userMessage);
    }

    // ========================================
    // フィールド個別バリデーションメソッド
    // ========================================

    /**
     * 投資信託名のバリデーション
     * @description BusinessLayerのバリデーターを使用して投資信託名フィールドのリアルタイムバリデーションを実行します
     * @param {string} value - 入力値
     * @param {string} fieldName - フィールド名
     * @returns {boolean} バリデーション結果
     * @private
     */
    validateName(value, fieldName) {
        this.view.clearFieldError(fieldName);

        const result = AssetFormValidator.validateField(fieldName, value);
        
        if (!result.isValid) {
            this.view.showFieldError(fieldName, result.error);
            return false;
        }

        return true;
    }

    /**
     * 資産タイプのバリデーション
     * @description BusinessLayerのバリデーターを使用して資産タイプフィールドのリアルタイムバリデーションを実行します
     * @param {string} value - 選択値
     * @param {string} fieldName - フィールド名
     * @returns {boolean} バリデーション結果
     * @private
     */
    validateType(value, fieldName) {
        this.view.clearFieldError(fieldName);

        const result = AssetFormValidator.validateField(fieldName, value);
        
        if (!result.isValid) {
            this.view.showFieldError(fieldName, result.error);
            return false;
        }

        return true;
    }

    /**
     * 総投資額のバリデーション
     * @description BusinessLayerのバリデーターを使用して総投資額フィールドのリアルタイムバリデーションを実行します
     * @param {string|number} value - 入力値
     * @param {string} fieldName - フィールド名
     * @returns {boolean} バリデーション結果
     * @private
     */
    validateTotalInvestment(value, fieldName) {
        this.view.clearFieldError(fieldName);

        const result = AssetFormValidator.validateField(fieldName, value);
        
        if (!result.isValid) {
            this.view.showFieldError(fieldName, result.error);
            return false;
        }

        return true;
    }

    /**
     * 現在価値のバリデーション
     * @description BusinessLayerのバリデーターを使用して現在価値フィールドのリアルタイムバリデーションを実行します
     * @param {string|number} value - 入力値
     * @param {string} fieldName - フィールド名
     * @returns {boolean} バリデーション結果
     * @private
     */
    validateCurrentValue(value, fieldName) {
        this.view.clearFieldError(fieldName);

        const result = AssetFormValidator.validateField(fieldName, value);
        
        if (!result.isValid) {
            this.view.showFieldError(fieldName, result.error);
            return false;
        }

        return true;
    }

    /**
     * 保有数量のバリデーション
     * @description BusinessLayerのバリデーターを使用して保有数量フィールドのリアルタイムバリデーションを実行します
     * @param {string|number} value - 入力値
     * @param {string} fieldName - フィールド名
     * @returns {boolean} バリデーション結果
     * @private
     */
    validateQuantity(value, fieldName) {
        this.view.clearFieldError(fieldName);

        const result = AssetFormValidator.validateField(fieldName, value);
        
        if (!result.isValid) {
            this.view.showFieldError(fieldName, result.error);
            return false;
        }

        return true;
    }

    /**
     * クリーンアップ処理
     * @description コントローラーのクリーンアップを行い、メモリリークを防止します
     * @returns {void}
     * @example
     * formController.destroy();
     * // イベントリスナーやリソースが適切に解放される
     */
    destroy() {
        console.log('🧹 AssetFormController cleanup');
        
        // ビューのクリーンアップ
        if (this.view) {
            this.view.hideModal();
        }
        
        // 参照をクリア
        this.view = null;
        this.assetRepository = null;
        this.dashboardController = null;
        this.isProcessing = false;
    }
}

export { AssetFormController };
