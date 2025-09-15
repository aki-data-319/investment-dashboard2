/**
 * AssetFormView - 投資信託追加フォームの描画を担当
 * @description 投資信託追加用のモーダルフォームのDOM操作と描画を専門に行うViewクラス
 * 責任: フォームの表示・非表示、バリデーションメッセージ表示、ローディング状態管理
 */
class AssetFormView {
    /**
     * AssetFormViewのコンストラクタ
     * @description モーダルフォームの初期化とDOM要素の準備を行います
     * @example
     * const formView = new AssetFormView();
     * formView.showModal();
     */
    constructor() {
        this.modalElement = null;
        this.formElement = null;
        this.overlayElement = null;
        this.isVisible = false;
        
        console.log('📝 AssetFormView initialized');
    }

    /**
     * モーダルフォームを表示
     * @description フォームモーダルを作成してページに表示し、フォーカスを設定します
     * @returns {void}
     * @example
     * formView.showModal();
     * // モーダルがフェードインアニメーションで表示される
     */
    showModal() {
        if (this.isVisible) {
            console.warn('⚠️ Modal is already visible');
            return;
        }

        console.log('🎨 Showing asset form modal...');
        
        // モーダルHTML生成
        this.createModalElements();
        
        // ページに追加
        document.body.appendChild(this.modalElement);
        
        // アニメーション用の少し遅れて表示
        setTimeout(() => {
            this.modalElement.classList.add('modal-show');
            this.focusFirstField();
        }, 10);
        
        this.isVisible = true;
        this.bindModalEvents();
        
        console.log('✅ Asset form modal displayed');
    }

    /**
     * モーダルフォームを非表示
     * @description フォームモーダルをフェードアウトして削除します
     * @returns {void}
     * @example
     * formView.hideModal();
     * // モーダルがフェードアウトアニメーションで消える
     */
    hideModal() {
        if (!this.isVisible) {
            return;
        }

        console.log('🎨 Hiding asset form modal...');
        
        // フェードアウトアニメーション
        this.modalElement.classList.remove('modal-show');
        
        // アニメーション完了後にDOM削除
        setTimeout(() => {
            if (this.modalElement && this.modalElement.parentNode) {
                this.modalElement.parentNode.removeChild(this.modalElement);
            }
            this.modalElement = null;
            this.formElement = null;
            this.overlayElement = null;
            this.isVisible = false;
            
            console.log('✅ Asset form modal hidden');
        }, 300);
    }

    /**
     * モーダル要素を作成
     * @description モーダルのHTML構造を生成し、DOM要素として準備します
     * @returns {void}
     * @private
     */
    createModalElements() {
        // モーダル全体のコンテナ
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'asset-form-modal';
        this.modalElement.innerHTML = this.createModalTemplate();
        
        // 各要素の参照を取得
        this.overlayElement = this.modalElement.querySelector('.modal-overlay');
        this.formElement = this.modalElement.querySelector('#assetForm');
    }

    /**
     * モーダルのHTMLテンプレートを作成
     * @description 投資信託追加フォームの完全なHTML構造を生成します
     * @returns {string} モーダルフォームのHTMLテンプレート
     * @private
     */
    createModalTemplate() {
        return `
            <div class="modal-overlay">
                <div class="modal-container">
                    <!-- モーダルヘッダー -->
                    <div class="modal-header">
                        <h2 class="modal-title">
                            <i data-lucide="plus-circle" class="h-5 w-5"></i>
                            投資信託を追加
                        </h2>
                        <button type="button" class="modal-close-btn" id="modalCloseBtn">
                            <i data-lucide="x" class="h-5 w-5"></i>
                        </button>
                    </div>

                    <!-- フォーム本体 -->
                    <form id="assetForm" class="asset-form">
                        <!-- エラーメッセージ表示エリア -->
                        <div id="formErrorArea" class="form-error-area" style="display: none;">
                            <div class="error-message">
                                <i data-lucide="alert-circle" class="h-4 w-4"></i>
                                <span id="formErrorText"></span>
                            </div>
                        </div>

                        <!-- 必須フィールドセクション -->
                        <div class="form-section">
                            <h3 class="section-title">基本情報 <span class="required-badge">必須</span></h3>
                            
                            <!-- 投資信託名 -->
                            <div class="form-field">
                                <label for="assetName" class="field-label">
                                    投資信託名 <span class="required-mark">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="assetName" 
                                    name="name" 
                                    class="field-input" 
                                    placeholder="例: eMAXIS Slim 全世界株式"
                                    maxlength="100"
                                    required
                                >
                                <div class="field-error" id="nameError"></div>
                                <div class="field-help">1-100文字で入力してください</div>
                            </div>

                            <!-- 資産タイプ -->
                            <div class="form-field">
                                <label for="assetType" class="field-label">
                                    資産タイプ <span class="required-mark">*</span>
                                </label>
                                <select id="assetType" name="type" class="field-select" required>
                                    <option value="">選択してください</option>
                                    <option value="mutualFund">投資信託</option>
                                    <option value="stock">個別株式</option>
                                    <option value="bond">債券</option>
                                    <option value="reit">REIT</option>
                                    <option value="crypto">暗号資産</option>
                                    <option value="other">その他</option>
                                </select>
                                <div class="field-error" id="typeError"></div>
                            </div>

                            <!-- 総投資額 -->
                            <div class="form-field">
                                <label for="totalInvestment" class="field-label">
                                    総投資額 <span class="required-mark">*</span>
                                </label>
                                <div class="input-group">
                                    <input 
                                        type="number" 
                                        id="totalInvestment" 
                                        name="totalInvestment" 
                                        class="field-input" 
                                        placeholder="100000"
                                        min="1"
                                        step="1"
                                        required
                                    >
                                    <span class="input-suffix">円</span>
                                </div>
                                <div class="field-error" id="totalInvestmentError"></div>
                                <div class="field-help">購入に使った総額を入力してください</div>
                            </div>
                        </div>

                        <!-- オプションフィールドセクション -->
                        <div class="form-section">
                            <h3 class="section-title">詳細情報 <span class="optional-badge">任意</span></h3>
                            
                            <!-- 現在価値 -->
                            <div class="form-field">
                                <label for="currentValue" class="field-label">現在価値</label>
                                <div class="input-group">
                                    <input 
                                        type="number" 
                                        id="currentValue" 
                                        name="currentValue" 
                                        class="field-input" 
                                        placeholder="110000"
                                        min="0"
                                        step="1"
                                    >
                                    <span class="input-suffix">円</span>
                                </div>
                                <div class="field-error" id="currentValueError"></div>
                                <div class="field-help">現在の評価額（未入力時は総投資額と同じ値）</div>
                            </div>

                            <!-- 保有数量 -->
                            <div class="form-field">
                                <label for="quantity" class="field-label">保有数量</label>
                                <div class="input-group">
                                    <input 
                                        type="number" 
                                        id="quantity" 
                                        name="quantity" 
                                        class="field-input" 
                                        placeholder="1000"
                                        min="0"
                                        step="0.01"
                                    >
                                    <span class="input-suffix">口/株</span>
                                </div>
                                <div class="field-error" id="quantityError"></div>
                                <div class="field-help">保有している口数や株数</div>
                            </div>

                            <!-- 地域・通貨 -->
                            <div class="form-field-group">
                                <div class="form-field">
                                    <label for="region" class="field-label">地域</label>
                                    <select id="region" name="region" class="field-select">
                                        <option value="JP">日本</option>
                                        <option value="US">米国</option>
                                        <option value="EU">欧州</option>
                                        <option value="OTHER">その他</option>
                                    </select>
                                    <div class="field-error" id="regionError"></div>
                                </div>

                                <div class="form-field">
                                    <label for="currency" class="field-label">通貨</label>
                                    <select id="currency" name="currency" class="field-select">
                                        <option value="JPY">日本円 (JPY)</option>
                                        <option value="USD">米ドル (USD)</option>
                                        <option value="EUR">ユーロ (EUR)</option>
                                        <option value="OTHER">その他</option>
                                    </select>
                                    <div class="field-error" id="currencyError"></div>
                                </div>
                            </div>

                            <!-- セクター -->
                            <div class="form-field">
                                <label for="sector" class="field-label">セクター</label>
                                <input 
                                    type="text" 
                                    id="sector" 
                                    name="sector" 
                                    class="field-input" 
                                    placeholder="例: 全世界株式、新興国債券"
                                    maxlength="50"
                                >
                                <div class="field-error" id="sectorError"></div>
                                <div class="field-help">投資対象のセクターや分野</div>
                            </div>

                            <!-- 説明 -->
                            <div class="form-field">
                                <label for="description" class="field-label">説明・メモ</label>
                                <textarea 
                                    id="description" 
                                    name="description" 
                                    class="field-textarea" 
                                    placeholder="この投資に関するメモや説明を入力してください"
                                    maxlength="500"
                                    rows="3"
                                ></textarea>
                                <div class="field-error" id="descriptionError"></div>
                                <div class="field-help">0-500文字</div>
                            </div>
                        </div>

                        <!-- フォームフッター -->
                        <div class="form-footer">
                            <button type="button" class="btn btn-secondary" id="cancelBtn">
                                キャンセル
                            </button>
                            <button type="submit" class="btn btn-primary" id="submitBtn">
                                <span class="btn-text">追加する</span>
                                <div class="btn-loading" style="display: none;">
                                    <i data-lucide="loader" class="h-4 w-4 animate-spin"></i>
                                    保存中...
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * モーダル内のイベントを設定
     * @description モーダルの基本操作（閉じる、オーバーレイクリック等）のイベントリスナーを設定します
     * @returns {void}
     * @private
     */
    bindModalEvents() {
        // 閉じるボタン
        const closeBtn = this.modalElement.querySelector('#modalCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }

        // キャンセルボタン
        const cancelBtn = this.modalElement.querySelector('#cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }

        // オーバーレイクリック
        if (this.overlayElement) {
            this.overlayElement.addEventListener('click', (e) => {
                if (e.target === this.overlayElement) {
                    this.hideModal();
                }
            });
        }

        // ESCキー
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    /**
     * キーボードイベントハンドラー
     * @description ESCキーでモーダルを閉じる機能を提供します
     * @param {KeyboardEvent} event - キーボードイベント
     * @returns {void}
     * @private
     */
    handleKeydown(event) {
        if (event.key === 'Escape' && this.isVisible) {
            this.hideModal();
        }
    }

    /**
     * 最初のフィールドにフォーカス
     * @description モーダル表示時に最初の入力フィールドにフォーカスを設定します
     * @returns {void}
     * @private
     */
    focusFirstField() {
        const firstField = this.modalElement.querySelector('#assetName');
        if (firstField) {
            firstField.focus();
        }
    }

    /**
     * フィールドエラーを表示
     * @description 指定されたフィールドにエラーメッセージを表示します
     * @param {string} fieldName - フィールド名
     * @param {string} message - エラーメッセージ
     * @returns {void}
     * @example
     * formView.showFieldError('name', '投資信託名は必須です');
     */
    showFieldError(fieldName, message) {
        const errorElement = this.modalElement.querySelector(`#${fieldName}Error`);
        const fieldElement = this.modalElement.querySelector(`[name="${fieldName}"]`);
        
        if (errorElement && fieldElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            fieldElement.classList.add('field-error-state');
            
            console.log(`❌ Field error: ${fieldName} - ${message}`);
        }
    }

    /**
     * フィールドエラーをクリア
     * @description 指定されたフィールドのエラーメッセージを削除します
     * @param {string} fieldName - フィールド名
     * @returns {void}
     * @example
     * formView.clearFieldError('name');
     */
    clearFieldError(fieldName) {
        const errorElement = this.modalElement.querySelector(`#${fieldName}Error`);
        const fieldElement = this.modalElement.querySelector(`[name="${fieldName}"]`);
        
        if (errorElement && fieldElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
            fieldElement.classList.remove('field-error-state');
        }
    }

    /**
     * 全フィールドエラーをクリア
     * @description フォーム内の全てのエラーメッセージを削除します
     * @returns {void}
     * @example
     * formView.clearAllFieldErrors();
     */
    clearAllFieldErrors() {
        const errorElements = this.modalElement.querySelectorAll('.field-error');
        const fieldElements = this.modalElement.querySelectorAll('.field-error-state');
        
        errorElements.forEach(element => {
            element.style.display = 'none';
            element.textContent = '';
        });
        
        fieldElements.forEach(element => {
            element.classList.remove('field-error-state');
        });
        
        // フォーム全体のエラーもクリア
        this.hideFormError();
    }

    /**
     * フォーム全体エラーを表示
     * @description フォーム上部にエラーメッセージを表示します
     * @param {string} message - エラーメッセージ
     * @returns {void}
     * @example
     * formView.showFormError('同名の投資信託が既に登録されています');
     */
    showFormError(message) {
        const errorArea = this.modalElement.querySelector('#formErrorArea');
        const errorText = this.modalElement.querySelector('#formErrorText');
        
        if (errorArea && errorText) {
            errorText.textContent = message;
            errorArea.style.display = 'block';
            
            // エラーエリアにスクロール
            errorArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            console.log(`❌ Form error: ${message}`);
        }
    }

    /**
     * フォーム全体エラーを非表示
     * @description フォーム上部のエラーメッセージを非表示にします
     * @returns {void}
     * @example
     * formView.hideFormError();
     */
    hideFormError() {
        const errorArea = this.modalElement.querySelector('#formErrorArea');
        if (errorArea) {
            errorArea.style.display = 'none';
        }
    }

    /**
     * ローディング状態を表示
     * @description 送信ボタンをローディング状態にしてフォームを無効化します
     * @returns {void}
     * @example
     * formView.showLoading();
     */
    showLoading() {
        const submitBtn = this.modalElement.querySelector('#submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (submitBtn && btnText && btnLoading) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            
            // フォーム全体を無効化
            this.formElement.classList.add('form-loading');
        }
        
        console.log('⏳ Form loading state activated');
    }

    /**
     * ローディング状態を解除
     * @description 送信ボタンのローディング状態を解除してフォームを有効化します
     * @returns {void}
     * @example
     * formView.hideLoading();
     */
    hideLoading() {
        const submitBtn = this.modalElement.querySelector('#submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        if (submitBtn && btnText && btnLoading) {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            
            // フォーム全体の無効化を解除
            this.formElement.classList.remove('form-loading');
        }
        
        console.log('✅ Form loading state deactivated');
    }

    /**
     * 成功メッセージを表示
     * @description フォーム送信成功時のフィードバックを表示します
     * @param {string} message - 成功メッセージ
     * @returns {void}
     * @example
     * formView.showSuccessMessage('投資信託が正常に追加されました');
     */
    showSuccessMessage(message) {
        // 成功メッセージ用の要素を作成
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.innerHTML = `
            <div class="success-content">
                <i data-lucide="check-circle" class="h-5 w-5"></i>
                <span>${message}</span>
            </div>
        `;
        
        // モーダル内に一時的に表示
        const modalContainer = this.modalElement.querySelector('.modal-container');
        modalContainer.appendChild(successElement);
        
        // Lucideアイコンを初期化
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        
        console.log(`✅ Success: ${message}`);
        
        // 2秒後に自動でモーダルを閉じる
        setTimeout(() => {
            this.hideModal();
        }, 2000);
    }

    /**
     * フォームをリセット
     * @description フォームの全ての入力内容とエラー状態をクリアします
     * @returns {void}
     * @example
     * formView.resetForm();
     */
    resetForm() {
        if (this.formElement) {
            this.formElement.reset();
            this.clearAllFieldErrors();
            this.hideLoading();
            
            console.log('🔄 Form reset completed');
        }
    }

    /**
     * フォームデータを取得
     * @description 現在のフォーム入力値をオブジェクトとして取得します
     * @returns {Object} フォームデータオブジェクト
     * @example
     * const formData = formView.getFormData();
     * console.log(formData.name); // 投資信託名
     */
    getFormData() {
        if (!this.formElement) {
            return {};
        }
        
        const formData = new FormData(this.formElement);
        const data = {};
        
        // FormDataをオブジェクトに変換
        for (let [key, value] of formData.entries()) {
            // 数値フィールドの変換
            if (['totalInvestment', 'currentValue', 'quantity'].includes(key)) {
                data[key] = value ? Number(value) : 0;
            } else {
                data[key] = value || '';
            }
        }
        
        console.log('📋 Form data collected:', data);
        return data;
    }
}

export { AssetFormView };