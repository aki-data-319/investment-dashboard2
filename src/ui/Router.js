import { DashboardController } from './controllers/DashboardController.js';
import { AssetFormController } from './controllers/AssetFormController.js';

/**
 * Router - 統合ルーティング・ナビゲーション管理
 * @description DashboardViewとAssetFormView間のシームレスな遷移を提供する統合ルーター
 * YAGNI原則に基づき、必要最小限の機能を1つのクラスに統合
 * 責任: ルーティング、ナビゲーション、ビュー管理、履歴管理
 */
export class Router {
    /**
     * Routerクラスのコンストラクタ
     * @description ルート設定、コントローラー管理、ナビゲーションUIの初期化
     * @example
     * const router = new Router();
     * // 自動でルートが初期化され、現在のURLに基づいてビューが表示される
     */
    constructor() {
        console.log('🚀 Router initialized - Starting navigation setup...');
        
        // ルートとコントローラーの管理
        this.routes = new Map();
        this.controllers = new Map();
        this.currentView = null;
        this.currentPath = null;
        
        // ナビゲーション状態
        this.isNavigating = false;
        
        // ルート登録（宣言的で拡張しやすい設計）
        this.registerRoute('dashboard', DashboardController, {
            title: 'ダッシュボード',
            icon: 'bar-chart-2',
            description: '投資ポートフォリオの概要表示'
        });
        
        this.registerRoute('add-asset', AssetFormController, {
            title: '資産追加',
            icon: 'plus-circle',
            description: '新しい投資信託の追加'
        });
        
        // 初期化実行
        this.init();
        
        console.log('✅ Router setup completed');
    }

    /**
     * ルーターの初期化
     * @description イベントリスナー設定、ナビゲーションUI作成、初期ルート処理
     * @returns {void}
     * @private
     */
    init() {
        console.log('🔧 Initializing router components...');
        
        // ナビゲーションUIを作成
        this.createNavigationUI();
        
        // ブラウザ履歴イベントの設定
        window.addEventListener('hashchange', this.handleHashChange.bind(this));
        window.addEventListener('load', this.handleInitialRoute.bind(this));
        
        // 初期ルートの処理
        this.handleInitialRoute();
        
        console.log('🔧 Router initialization completed');
    }

    /**
     * ルート登録
     * @description 新しいルートとコントローラーを登録します
     * @param {string} path - ルートパス（例: 'dashboard', 'add-asset'）
     * @param {Class} ControllerClass - コントローラークラス
     * @param {Object} config - ルート設定（title, icon, description）
     * @returns {void}
     * @example
     * router.registerRoute('settings', SettingsController, {
     *   title: '設定', icon: 'settings', description: 'アプリケーション設定'
     * });
     */
    registerRoute(path, ControllerClass, config = {}) {
        this.routes.set(path, {
            ControllerClass,
            config: {
                title: config.title || path,
                icon: config.icon || 'file',
                description: config.description || ''
            }
        });
        
        console.log(`📝 Route registered: ${path} -> ${ControllerClass.name}`);
    }

    /**
     * プログラムによるナビゲーション
     * @description 指定されたパスにナビゲートし、オプションでデータを渡します
     * @param {string} path - 遷移先のパス
     * @param {Object} [data=null] - 遷移時に渡すデータ
     * @param {boolean} [updateHistory=true] - ブラウザ履歴を更新するか
     * @returns {Promise<boolean>} ナビゲーション成功フラグ
     * @example
     * // ダッシュボードに遷移
     * router.navigate('dashboard');
     * 
     * // 資産追加画面に遷移してデータを渡す
     * router.navigate('add-asset', { prefillData: assetData });
     */
    async navigate(path, data = null, updateHistory = true) {
        if (this.isNavigating) {
            console.warn('⚠️ Navigation already in progress, skipping...');
            return false;
        }
        
        if (!this.routes.has(path)) {
            console.error(`❌ Route not found: ${path}`);
            return false;
        }
        
        console.log(`🧭 Navigating to: ${path}`, data ? `with data: ${JSON.stringify(data)}` : '');
        
        try {
            this.isNavigating = true;
            
            // 現在のビューを非表示
            await this.#hideCurrentView();
            
            // 新しいビューを表示
            await this.#showView(path, data);
            
            // ブラウザ履歴を更新
            if (updateHistory && window.location.hash !== `#${path}`) {
                window.location.hash = path;
            }
            
            // ナビゲーション状態を更新
            this.currentPath = path;
            this.#updateNavigationUI();
            
            console.log(`✅ Navigation completed: ${path}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Navigation failed: ${path}`, error);
            return false;
            
        } finally {
            this.isNavigating = false;
        }
    }

    /**
     * Hash変更時のハンドラー
     * @description URLハッシュ変更時に適切なビューに遷移します
     * @returns {Promise<void>}
     * @private
     */
    async handleHashChange() {
        const hash = window.location.hash.slice(1); // #を除去
        const path = hash || 'dashboard'; // デフォルトはダッシュボード
        
        console.log(`🔗 Hash changed to: ${path}`);
        
        if (path !== this.currentPath) {
            await this.navigate(path, null, false); // 履歴更新は不要
        }
    }

    /**
     * 初期ルート処理
     * @description ページ読み込み時の初期ルートを処理します
     * @returns {Promise<void>}
     * @private
     */
    async handleInitialRoute() {
        console.log('🚀 Processing initial route...');
        
        const hash = window.location.hash.slice(1);
        const initialPath = hash || 'dashboard'; // デフォルトはダッシュボード
        
        console.log(`🎯 Initial path: ${initialPath}`);
        await this.navigate(initialPath, null, false);
    }

    /**
     * ナビゲーションUI作成
     * @description アプリケーション上部にタブ式ナビゲーションヘッダーを作成します
     * @returns {void}
     * @private
     */
    createNavigationUI() {
        console.log('🎨 Creating navigation UI...');
        
        // 既存のナビゲーションUIがあれば削除
        const existingNav = document.querySelector('.app-navigation');
        if (existingNav) {
            existingNav.remove();
        }
        
        // ナビゲーションコンテナ作成
        const navContainer = document.createElement('div');
        navContainer.className = 'app-navigation';
        navContainer.innerHTML = this.#createNavigationTemplate();
        
        // メインコンテンツの前に挿入
        const appContainer = document.querySelector('.app-container');
        const mainContent = document.querySelector('.main-content');
        
        if (appContainer && mainContent) {
            appContainer.insertBefore(navContainer, mainContent);
        } else {
            console.warn('⚠️ App container or main content not found, appending navigation to body');
            document.body.appendChild(navContainer);
        }
        
        // ナビゲーションイベントを設定
        this.#bindNavigationEvents();
        
        console.log('✅ Navigation UI created');
    }

    /**
     * ナビゲーションHTMLテンプレート作成
     * @description タブ式ナビゲーションのHTMLテンプレートを生成します
     * @returns {string} ナビゲーションHTML
     * @private
     */
    #createNavigationTemplate() {
        const tabsHTML = Array.from(this.routes.entries())
            .map(([path, route]) => {
                const { config } = route;
                return `
                    <button 
                        class="nav-tab" 
                        data-path="${path}"
                        title="${config.description}"
                        aria-label="${config.title}に移動"
                    >
                        <i data-lucide="${config.icon}" class="nav-icon"></i>
                        <span class="nav-text">${config.title}</span>
                    </button>
                `;
            })
            .join('');
        
        return `
            <nav class="navigation-header" role="navigation" aria-label="メインナビゲーション">
                <div class="nav-container">
                    <div class="nav-brand">
                        <i data-lucide="trending-up" class="brand-icon"></i>
                        <span class="brand-text">投資ダッシュボード</span>
                    </div>
                    <div class="nav-tabs" role="tablist">
                        ${tabsHTML}
                    </div>
                </div>
            </nav>
        `;
    }

    /**
     * ナビゲーションイベント設定
     * @description ナビゲーションタブのクリックイベントを設定します
     * @returns {void}
     * @private
     */
    #bindNavigationEvents() {
        const navTabs = document.querySelectorAll('.nav-tab');
        
        navTabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                event.preventDefault();
                const path = tab.dataset.path;
                
                if (path) {
                    this.navigate(path);
                }
            });
        });
        
        console.log(`🔗 Navigation events bound to ${navTabs.length} tabs`);
    }

    /**
     * ナビゲーションUI更新
     * @description 現在のパスに基づいてナビゲーションタブのアクティブ状態を更新します
     * @returns {void}
     * @private
     */
    #updateNavigationUI() {
        const navTabs = document.querySelectorAll('.nav-tab');
        
        navTabs.forEach(tab => {
            const tabPath = tab.dataset.path;
            const isActive = tabPath === this.currentPath;
            
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive.toString());
        });
        
        console.log(`🎨 Navigation UI updated, active tab: ${this.currentPath}`);
    }

    /**
     * ビュー表示処理
     * @description 指定されたパスのビューを表示し、コントローラーを初期化します
     * @param {string} path - 表示するビューのパス
     * @param {Object} [data=null] - ビューに渡すデータ
     * @returns {Promise<void>}
     * @private
     */
    async #showView(path, data = null) {
        console.log(`👁️ Showing view: ${path}`);
        
        try {
            // コントローラーを取得または作成
            const controller = await this.#getOrCreateController(path);
            
            if (!controller) {
                throw new Error(`Controller not found for path: ${path}`);
            }
            
            // メインコンテンツエリアを表示
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.display = 'block';
                mainContent.classList.remove('view-hidden');
                mainContent.classList.add('view-visible');
            }
            
            // コントローラー固有の表示処理
            if (path === 'dashboard') {
                // ダッシュボードの場合は初期化または更新
                if (typeof controller.initialize === 'function') {
                    await controller.initialize(data);
                } else if (typeof controller.refreshData === 'function') {
                    await controller.refreshData();
                }
            } else if (path === 'add-asset') {
                // 資産追加フォームの場合は開く
                if (typeof controller.openForm === 'function') {
                    controller.openForm(data);
                }
            }
            
            // 現在のビューを更新
            this.currentView = path;
            
            console.log(`✅ View displayed: ${path}`);
            
        } catch (error) {
            console.error(`❌ Failed to show view: ${path}`, error);
            throw error;
        }
    }

    /**
     * 現在のビュー非表示処理
     * @description 現在表示中のビューを非表示にします
     * @returns {Promise<void>}
     * @private
     */
    async #hideCurrentView() {
        if (!this.currentView) {
            console.log('ℹ️ No current view to hide');
            return;
        }
        
        console.log(`👁️‍🗨️ Hiding current view: ${this.currentView}`);
        
        try {
            // 資産追加フォームの場合は閉じる
            if (this.currentView === 'add-asset') {
                const controller = this.controllers.get(this.currentView);
                if (controller && typeof controller.closeForm === 'function') {
                    controller.closeForm();
                }
            }
            
            // ビューのクリーンアップ処理があれば実行
            const controller = this.controllers.get(this.currentView);
            if (controller && typeof controller.cleanup === 'function') {
                await controller.cleanup();
            }
            
            console.log(`✅ View hidden: ${this.currentView}`);
            
        } catch (error) {
            console.error(`❌ Failed to hide view: ${this.currentView}`, error);
        }
    }

    /**
     * コントローラー取得または作成
     * @description 指定されたパスのコントローラーを取得し、存在しない場合は作成します
     * @param {string} path - コントローラーのパス
     * @returns {Promise<Object>} コントローラーインスタンス
     * @private
     */
    async #getOrCreateController(path) {
        console.log(`🎮 Getting or creating controller for: ${path}`);
        
        // 既存のコントローラーがあれば返す
        if (this.controllers.has(path)) {
            console.log(`♻️ Using existing controller: ${path}`);
            return this.controllers.get(path);
        }
        
        // ルート情報を取得
        const route = this.routes.get(path);
        if (!route) {
            console.error(`❌ Route not found: ${path}`);
            return null;
        }
        
        try {
            // 新しいコントローラーを作成
            const { ControllerClass } = route;
            console.log(`🏭 Creating new controller: ${ControllerClass.name}`);
            
            let controller;
            
            // コントローラータイプに応じて適切に初期化
            if (ControllerClass === DashboardController) {
                // DashboardControllerは引数なしで初期化
                controller = new ControllerClass();
            } else if (ControllerClass === AssetFormController) {
                // AssetFormControllerは依存関係を注入
                // 注意: 実際にはDashboardControllerから取得する必要があるが、
                // 簡単のため、必要時に遅延初期化する設計にする
                const dashboardController = this.controllers.get('dashboard');
                if (dashboardController) {
                    controller = new ControllerClass(
                        dashboardController.assetRepository,
                        dashboardController
                    );
                } else {
                    console.warn('⚠️ DashboardController not found, creating AssetFormController without dependencies');
                    return null; // 依存関係が不足している場合は作成しない
                }
            }
            
            if (controller) {
                this.controllers.set(path, controller);
                console.log(`✅ Controller created and cached: ${path}`);
                return controller;
            } else {
                console.error(`❌ Failed to create controller: ${path}`);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Error creating controller for ${path}:`, error);
            return null;
        }
    }

    /**
     * 現在のパスを取得
     * @description 現在アクティブなルートパスを返します
     * @returns {string|null} 現在のパス
     * @example
     * const currentPath = router.getCurrentPath(); // 'dashboard' or 'add-asset'
     */
    getCurrentPath() {
        return this.currentPath;
    }

    /**
     * 登録済みルートを取得
     * @description 登録されている全ルートの情報を返します
     * @returns {Array<Object>} ルート情報の配列
     * @example
     * const routes = router.getRoutes();
     * // [{ path: 'dashboard', title: 'ダッシュボード', ... }, ...]
     */
    getRoutes() {
        return Array.from(this.routes.entries()).map(([path, route]) => ({
            path,
            title: route.config.title,
            icon: route.config.icon,
            description: route.config.description
        }));
    }

    /**
     * ルーターのクリーンアップ
     * @description イベントリスナーの削除とリソースのクリーンアップを行います
     * @returns {void}
     * @example
     * router.destroy(); // アプリケーション終了時
     */
    destroy() {
        console.log('🧹 Cleaning up router...');
        
        // イベントリスナーを削除
        window.removeEventListener('hashchange', this.handleHashChange.bind(this));
        window.removeEventListener('load', this.handleInitialRoute.bind(this));
        
        // コントローラーのクリーンアップ
        this.controllers.forEach((controller, path) => {
            if (typeof controller.destroy === 'function') {
                controller.destroy();
            }
        });
        
        // ナビゲーションUIを削除
        const navElement = document.querySelector('.app-navigation');
        if (navElement) {
            navElement.remove();
        }
        
        // 参照をクリア
        this.routes.clear();
        this.controllers.clear();
        this.currentView = null;
        this.currentPath = null;
        
        console.log('✅ Router cleanup completed');
    }
}

export default Router;