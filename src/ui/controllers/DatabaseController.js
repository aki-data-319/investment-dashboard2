/**
 * データベース画面の制御クラス
 * @description ナビゲーション・タブ切り替え・データ連携を管理
 */
class DatabaseController {
    constructor(dataStoreManager) {
        this.dataStoreManager = dataStoreManager;
        this.view = new DatabaseView();
        this.currentTab = 'transactions';
        this.transactionTable = null;
        this.assetGrid = null;
        this.isInitialized = false;
    }

    /**
     * データベース画面を初期化
     * @description 必要なサービス・コンポーネントを初期化
     */
    initialize() {
        if (this.isInitialized) return;

        try {
            // 依存サービスの初期化
            this.transactionDatabaseService = new TransactionDatabaseService(this.dataStoreManager);
            this.assetDatabaseService = new AssetDatabaseService(this.dataStoreManager);
            
            // コンポーネントの初期化
            this.transactionTable = new TransactionTable(this.transactionDatabaseService);
            this.assetGrid = new AssetGrid(this.assetDatabaseService);
            
            this.isInitialized = true;
            console.log('DatabaseController initialized successfully');
        } catch (error) {
            console.error('DatabaseController initialization failed:', error);
            this.isInitialized = false;
        }
    }

    /**
     * データベースページを表示
     * @description メインダッシュボードから遷移
     */
    showDatabase() {
        try {
            // main-content コンテナを取得
            const mainContent = document.getElementById('mainContent');
            if (!mainContent) {
                console.error('❌ Main content container not found');
                return;
            }
            
            // main-content内にデータベースコンテンツを描画
            mainContent.innerHTML = this.view.render();
            
            // 初期化
            this.initialize();
            
            // デフォルトで取引履歴タブを表示
            this.loadTransactionsTab();
            
            console.log('Database page displayed successfully in main-content');
        } catch (error) {
            console.error('Failed to show database page:', error);
            this.showMessage('データベースページの表示に失敗しました', 'error');
        }
    }

    /**
     * 全ページを非表示にする（非推奨 - main-content統一により不要）
     * @description Router.jsが main-content の管理を行うため、このメソッドは使用しない
     * @deprecated この方法は使用せず、Router.js による統一管理を採用
     */
    hideAllPages() {
        // Router.js による統一管理のため、このメソッドは使用しない
        console.log('ℹ️ hideAllPages() is deprecated - Router.js handles view management');
    }

    /**
     * タブ切り替え処理
     * @param {string} tabName - 切り替え先タブ名
     */
    switchTab(tabName) {
        try {
            // アクティブタブの切り替え
            this.view.setActiveTab(tabName);
            this.currentTab = tabName;
            
            // タブ別コンテンツ読み込み
            this.loadTabContent(tabName);
            
            console.log(`Switched to tab: ${tabName}`);
        } catch (error) {
            console.error(`Failed to switch to tab ${tabName}:`, error);
            this.view.showError(tabName, 'タブの切り替えに失敗しました');
        }
    }
    
    /**
     * タブ別コンテンツ読み込み
     * @param {string} tabName - 読み込み対象タブ
     */
    loadTabContent(tabName) {
        switch (tabName) {
            case 'transactions':
                this.loadTransactionsTab();
                break;
            case 'assets':
                this.loadAssetsTab();
                break;
            case 'history':
                this.loadHistoryTab();
                break;
            default:
                console.warn(`Unknown tab: ${tabName}`);
                this.view.showError(tabName, '不明なタブです');
        }
    }

    /**
     * 取引履歴タブの読み込み
     */
    loadTransactionsTab() {
        try {
            this.view.showLoading('transactions', '取引履歴を読み込み中...');
            
            // TransactionTable使用版
            setTimeout(() => {
                if (this.transactionTable) {
                    const transactionContent = this.transactionTable.render();
                    this.view.updateTabContent('transactions', transactionContent);
                    
                    // グローバルにアクセス可能にする（イベントハンドリング用）
                    window.transactionTable = this.transactionTable;
                } else {
                    // サービスが初期化されていない場合は暫定表示
                    const tempContent = this.generateTemporaryTransactionsContent();
                    this.view.updateTabContent('transactions', tempContent);
                }
            }, 500);
            
        } catch (error) {
            console.error('Failed to load transactions tab:', error);
            this.view.showError('transactions', '取引履歴の読み込みに失敗しました');
        }
    }

    /**
     * 銘柄情報タブの読み込み
     */
    loadAssetsTab() {
        try {
            this.view.showLoading('assets', '銘柄情報を読み込み中...');
            
            // AssetGrid使用版
            setTimeout(() => {
                if (this.assetGrid) {
                    const assetContent = this.assetGrid.render();
                    this.view.updateTabContent('assets', assetContent);
                    
                    // グローバルにアクセス可能にする（イベントハンドリング用）
                    window.assetGrid = this.assetGrid;
                } else {
                    // サービスが初期化されていない場合は暫定表示
                    const tempContent = this.generateTemporaryAssetsContent();
                    this.view.updateTabContent('assets', tempContent);
                }
            }, 500);
            
        } catch (error) {
            console.error('Failed to load assets tab:', error);
            this.view.showError('assets', '銘柄情報の読み込みに失敗しました');
        }
    }

    /**
     * 編集履歴タブの読み込み
     */
    loadHistoryTab() {
        try {
            this.view.showLoading('history', '編集履歴を読み込み中...');
            
            // 暫定的なコンテンツ表示
            setTimeout(() => {
                const tempContent = this.generateTemporaryHistoryContent();
                this.view.updateTabContent('history', tempContent);
            }, 500);
            
        } catch (error) {
            console.error('Failed to load history tab:', error);
            this.view.showError('history', '編集履歴の読み込みに失敗しました');
        }
    }

    /**
     * 暫定的な取引履歴コンテンツ生成
     * @returns {string} 暫定コンテンツHTML
     */
    generateTemporaryTransactionsContent() {
        return `
            <div class="temp-content">
                <div class="content-header">
                    <h3>📈 取引履歴データベース</h3>
                    <p class="status-info">✅ 基盤実装完了 - 詳細機能は Task 2.1.2 で実装予定</p>
                </div>
                
                <div class="feature-preview">
                    <h4>実装予定機能：</h4>
                    <ul class="feature-list">
                        <li>✅ 全取引データ統合表示（投資信託・個別株・仮想通貨）</li>
                        <li>✅ 高度フィルタリング（種別・地域・通貨・キーワード検索）</li>
                        <li>✅ リアルタイム検索機能</li>
                        <li>✅ 最新50件表示制限</li>
                        <li>✅ 既存詳細モーダルとの連携</li>
                    </ul>
                </div>

                <div class="mock-table">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                <th>日付</th>
                                <th>銘柄名</th>
                                <th>種別</th>
                                <th>数量</th>
                                <th>単価</th>
                                <th>金額</th>
                                <th>地域</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>2025-09-15</td>
                                <td>Apple Inc. (AAPL)</td>
                                <td><span class="type-badge type-stock">個別株</span></td>
                                <td>100</td>
                                <td>$150.25</td>
                                <td>$15,025</td>
                                <td><span class="region-badge region-us">US</span></td>
                                <td><button class="btn-action">👁️</button></td>
                            </tr>
                            <tr>
                                <td>2025-09-14</td>
                                <td>eMAXIS Slim 全世界株式</td>
                                <td><span class="type-badge type-mutualfund">投資信託</span></td>
                                <td>-</td>
                                <td>-</td>
                                <td>¥50,000</td>
                                <td><span class="region-badge region-jp">JP</span></td>
                                <td><button class="btn-action">👁️</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * 暫定的な銘柄情報コンテンツ生成
     * @returns {string} 暫定コンテンツHTML
     */
    generateTemporaryAssetsContent() {
        return `
            <div class="temp-content">
                <div class="content-header">
                    <h3>🏢 銘柄情報データベース</h3>
                    <p class="status-info">✅ 基盤実装完了 - 詳細機能は Task 2.1.3 で実装予定</p>
                </div>
                
                <div class="feature-preview">
                    <h4>実装予定機能：</h4>
                    <ul class="feature-list">
                        <li>✅ 銘柄別統合表示（同一ティッカーの統合）</li>
                        <li>✅ セクター編集機能（インライン編集）</li>
                        <li>✅ 検索・フィルタリング（名前・セクター・地域）</li>
                        <li>✅ カード形式のリッチな表示</li>
                        <li>✅ 編集モードの切り替え</li>
                    </ul>
                </div>

                <div class="mock-grid">
                    <div class="asset-card-preview">
                        <div class="card-header">
                            <h4>Apple Inc.</h4>
                            <span class="ticker">AAPL</span>
                        </div>
                        <div class="card-metrics">
                            <div class="metric">
                                <label>保有数量</label>
                                <span>300株</span>
                            </div>
                            <div class="metric">
                                <label>平均取得価格</label>
                                <span>$148.25</span>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="btn-action">📊 詳細分析</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 暫定的な編集履歴コンテンツ生成
     * @returns {string} 暫定コンテンツHTML
     */
    generateTemporaryHistoryContent() {
        return `
            <div class="temp-content">
                <div class="content-header">
                    <h3>📝 編集履歴</h3>
                    <p class="status-info">✅ 基盤実装完了 - 詳細機能は後のタスクで実装予定</p>
                </div>
                
                <div class="history-preview">
                    <div class="history-item">
                        <div class="history-time">2025-09-15 14:30</div>
                        <div class="history-action">銘柄追加</div>
                        <div class="history-detail">Apple Inc. (AAPL) を追加しました</div>
                    </div>
                    <div class="history-item">
                        <div class="history-time">2025-09-15 14:25</div>
                        <div class="history-action">セクター変更</div>
                        <div class="history-detail">MSFT のセクターを「テクノロジー」に変更しました</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * タブの再読み込み
     * @param {string} tabName - 再読み込み対象タブ
     */
    retryLoadTab(tabName) {
        console.log(`Retrying to load tab: ${tabName}`);
        this.loadTabContent(tabName);
    }

    /**
     * 取引詳細表示
     * @param {string} transactionId - 取引ID
     */
    showTransactionDetail(transactionId) {
        console.log(`Show transaction detail: ${transactionId}`);
        // 既存の詳細表示機能と連携予定
        this.showMessage('取引詳細表示機能は実装予定です', 'info');
    }

    /**
     * メッセージ表示
     * @param {string} message - メッセージ
     * @param {string} type - メッセージタイプ
     */
    showMessage(message, type = 'info') {
        // 既存のメッセージ表示機能を活用
        if (window.app && window.app.showMessage) {
            window.app.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * 現在のタブを取得
     * @returns {string} 現在のアクティブタブ
     */
    getCurrentTab() {
        return this.currentTab;
    }

    /**
     * データベースコントローラーの状態確認
     * @returns {boolean} 初期化済みかどうか
     */
    isReady() {
        return this.isInitialized;
    }
}

// ES6モジュールエクスポート（Router.jsでの import { DatabaseController } 用）
// ES6モジュールとしてのexportは行わない（ブラウザ直読みとの両立のため）

// グローバルエクスポート（従来の互換性保持）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseController;
} else if (typeof window !== 'undefined') {
    window.DatabaseController = DatabaseController;
}
