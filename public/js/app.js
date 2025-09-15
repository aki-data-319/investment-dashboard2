import { DashboardController } from '../../src/ui/controllers/DashboardController.js';
import { Router } from '../../src/ui/Router.js';

/**
 * アプリケーション初期化 - Phase 1.1 ナビゲーション統合版
 * @description RouterとDashboardControllerを統合した新しいアプリケーション構成
 */
class App {
    constructor() {
        console.log('🚀 Investment Dashboard v2 - Phase 1.1 Navigation Integration');
        this.router = null;
        this.dashboardController = null;
    }

    /**
     * アプリケーション開始 - Router統合版
     * @description Router中心のアプリケーション構成で、ナビゲーション機能を提供
     * @returns {Promise<void>}
     */
    async start() {
        try {
            console.log('📱 Starting app with navigation...');
            
            // デバッグ情報更新
            this.updateDebugInfo('Router初期化中...');
            
            // Router初期化（自動的にDashboardControllerとAssetFormControllerを管理）
            console.log('🧭 Initializing Router...');
            this.router = new Router();
            
            // ルーター初期化完了後、Lucide Iconsを再初期化
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                    console.log('🔄 Lucide Icons refreshed for navigation');
                }
            }, 100);
            
            // デバッグ情報更新
            this.updateDebugInfo('Phase 1.1 ナビゲーション実装完了 ✅');
            
            console.log('🎉 App started successfully with navigation!');
            console.log('📍 Current routes:', this.router.getRoutes());
            
        } catch (error) {
            console.error('❌ App startup failed:', error);
            this.updateDebugInfo(`エラー: ${error.message}`);
        }
    }

    /**
     * デバッグ情報を更新
     */
    updateDebugInfo(message) {
        const debugElement = document.getElementById('debugInfo');
        if (debugElement) {
            debugElement.textContent = message;
        }
    }
    
    /**
     * Routerインスタンスを取得（デバッグ用）
     * @returns {Router|null} Routerインスタンス
     */
    getRouter() {
        return this.router;
    }
    
    /**
     * 現在のナビゲーション状態を取得（デバッグ用）
     * @returns {Object} ナビゲーション状態
     */
    getNavigationState() {
        if (!this.router) return null;
        
        return {
            currentPath: this.router.getCurrentPath(),
            availableRoutes: this.router.getRoutes(),
            timestamp: new Date().toISOString()
        };
    }
}

// DOM読み込み完了後にアプリケーション開始
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.start();
    
    // グローバルにアクセス可能にする（デバッグ用）
    window.app = app;
});