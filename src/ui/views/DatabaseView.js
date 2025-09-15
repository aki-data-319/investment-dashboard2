/**
 * データベース画面のメインビュークラス
 * @description 取引履歴・銘柄情報・編集履歴の3タブ統合管理
 */
class DatabaseView {
    constructor() {
        this.activeTab = 'transactions';
        this.initializeElements();
        this.setupEventListeners();
    }

    /**
     * UI要素の初期化
     * @description DOM要素への参照を設定
     */
    initializeElements() {
        // DOM要素は動的生成のため、render後に参照取得
    }

    /**
     * イベントリスナーの設定
     * @description タブ切り替えなどのイベント処理を設定
     */
    setupEventListeners() {
        // イベントリスナーは動的生成後に設定
    }

    /**
     * データベース画面のHTML構造を生成
     * @returns {string} 完全なHTML構造
     */
    render() {
        return `
            <div id="databasePage" class="page-content database-page page-enter">
                <div class="database-header">
                    <h1>🗂️ 投資データベース</h1>
                    <div class="navigation-actions">
                        <button onclick="router.showDashboard()" class="btn-back" title="ダッシュボードに戻る">
                            ← ダッシュボードに戻る
                        </button>
                    </div>
                    <div class="database-tabs">
                        <button class="tab-btn active tooltip" data-tab="transactions" 
                                data-tooltip="取引履歴の統合管理"
                                onclick="databaseController.switchTab('transactions')">
                            📈 取引履歴
                        </button>
                        <button class="tab-btn tooltip" data-tab="assets" 
                                data-tooltip="銘柄情報の詳細管理"
                                onclick="databaseController.switchTab('assets')">
                            🏢 銘柄情報
                        </button>
                        <button class="tab-btn tooltip" data-tab="history" 
                                data-tooltip="データ変更の履歴追跡"
                                onclick="databaseController.switchTab('history')">
                            📝 編集履歴
                        </button>
                    </div>
                </div>
                <div class="database-content">
                    <div id="transactionsTab" class="tab-content active">
                        ${this.renderTransactionsTabPlaceholder()}
                    </div>
                    <div id="assetsTab" class="tab-content">
                        ${this.renderAssetsTabPlaceholder()}
                    </div>
                    <div id="historyTab" class="tab-content">
                        ${this.renderHistoryTabPlaceholder()}
                    </div>
                </div>
                
                <!-- 編集モードインジケーター -->
                <div id="editModeIndicator" class="edit-mode-indicator" style="display: none;">
                    ✏️ 編集モード有効
                </div>
            </div>
        `;
    }

    /**
     * 取引履歴タブの初期プレースホルダー
     * @returns {string} プレースホルダーHTML
     */
    renderTransactionsTabPlaceholder() {
        return `
            <div class="tab-placeholder">
                <div class="loading-indicator">
                    <div class="loading-skeleton skeleton-card"></div>
                    <div class="loading-skeleton skeleton-card"></div>
                    <div class="loading-skeleton skeleton-card"></div>
                    <p style="margin-top: 1rem;">取引履歴を読み込み中...</p>
                </div>
            </div>
        `;
    }

    /**
     * 銘柄情報タブの初期プレースホルダー
     * @returns {string} プレースホルダーHTML
     */
    renderAssetsTabPlaceholder() {
        return `
            <div class="tab-placeholder">
                <div class="loading-indicator">
                    <div class="loading-skeleton skeleton-card"></div>
                    <div class="loading-skeleton skeleton-card"></div>
                    <div class="loading-skeleton skeleton-card"></div>
                    <p style="margin-top: 1rem;">銘柄情報を読み込み中...</p>
                </div>
            </div>
        `;
    }

    /**
     * 編集履歴タブの初期プレースホルダー
     * @returns {string} プレースホルダーHTML
     */
    renderHistoryTabPlaceholder() {
        return `
            <div class="tab-placeholder">
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <p>編集履歴を読み込み中...</p>
                </div>
            </div>
        `;
    }

    /**
     * タブコンテンツを更新
     * @param {string} tabName - 更新対象タブ名
     * @param {string} content - 新しいコンテンツHTML
     */
    updateTabContent(tabName, content) {
        const tabElement = document.getElementById(`${tabName}Tab`);
        if (tabElement) {
            tabElement.innerHTML = content;
        }
    }

    /**
     * アクティブタブを設定
     * @param {string} tabName - アクティブにするタブ名
     */
    setActiveTab(tabName) {
        // タブボタンのアクティブ状態更新
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // タブコンテンツのアクティブ状態更新
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        this.activeTab = tabName;
    }

    /**
     * ローディング表示
     * @param {string} tabName - ローディング対象タブ
     * @param {string} message - ローディングメッセージ
     */
    showLoading(tabName, message = '読み込み中...') {
        const content = `
            <div class="tab-placeholder">
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        this.updateTabContent(tabName, content);
    }

    /**
     * エラー表示
     * @param {string} tabName - エラー対象タブ
     * @param {string} errorMessage - エラーメッセージ
     */
    showError(tabName, errorMessage = 'エラーが発生しました') {
        const content = `
            <div class="tab-placeholder error-state">
                <div class="error-indicator">
                    <div class="error-icon">⚠️</div>
                    <p class="error-message">${errorMessage}</p>
                    <button onclick="databaseController.retryLoadTab('${tabName}')" class="btn-retry">
                        🔄 再試行
                    </button>
                </div>
            </div>
        `;
        this.updateTabContent(tabName, content);
    }

    /**
     * 現在のアクティブタブを取得
     * @returns {string} アクティブタブ名
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * データベースページの表示状態を確認
     * @returns {boolean} 表示中かどうか
     */
    isVisible() {
        const databasePage = document.getElementById('databasePage');
        return databasePage && databasePage.style.display !== 'none';
    }

    /**
     * 編集モードインジケーターの表示制御
     * @param {boolean} show - 表示するかどうか
     * @description 編集モード状態を視覚的に示すインジケーターの制御
     */
    showEditModeIndicator(show) {
        const indicator = document.getElementById('editModeIndicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * 空状態の表示
     * @param {string} tabName - 対象タブ名
     * @param {string} title - タイトル
     * @param {string} message - メッセージ
     * @param {string} actionText - アクションボタンテキスト
     * @param {string} actionCallback - アクションコールバック
     * @description データが存在しない場合の空状態表示
     */
    showEmptyState(tabName, title, message, actionText = null, actionCallback = null) {
        const actionButton = actionText && actionCallback ? 
            `<button onclick="${actionCallback}" class="btn-empty-action">${actionText}</button>` : '';

        const content = `
            <div class="empty-state">
                <div class="empty-state-icon">📄</div>
                <h3>${title}</h3>
                <p>${message}</p>
                ${actionButton}
            </div>
        `;
        this.updateTabContent(tabName, content);
    }

    /**
     * プログレスバー付きローディング表示
     * @param {string} tabName - ローディング対象タブ
     * @param {string} message - ローディングメッセージ
     * @param {number} progress - 進捗率（0-100）
     * @description より詳細な進捗情報を示すローディング表示
     */
    showProgressLoading(tabName, message, progress = 0) {
        const content = `
            <div class="tab-placeholder">
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <p>${message}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.max(0, Math.min(100, progress))}%"></div>
                    </div>
                    <small>${progress}% 完了</small>
                </div>
            </div>
        `;
        this.updateTabContent(tabName, content);
    }

    /**
     * 成功メッセージの一時表示
     * @param {string} message - 成功メッセージ
     * @param {number} duration - 表示時間（ミリ秒）
     * @description 処理成功時の一時的なフィードバック表示
     */
    showSuccessMessage(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'notification notification-success';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
    }
}

// グローバルエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseView;
} else if (typeof window !== 'undefined') {
    window.DatabaseView = DatabaseView;
}