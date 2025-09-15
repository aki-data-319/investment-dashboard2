/**
 * DashboardView - ダッシュボード画面の描画を担当
 * 責任: DOM要素の作成・更新のみ（データの取得やロジックは含まない）
 */
//１つ目のクラス。メインコンテンツの描画を担当している
class DashboardView {
    constructor() {
        this.container = document.getElementById('mainContent');
        console.log('📱 DashboardView initialized');
    }

    /**
     * ダッシュボード全体を描画する
     * @param {Object} data - 表示用データ
     */
    render(data) {
        console.log('🎨 DashboardView.render() called with data:', data);
        
        if (!this.container) {
            console.error('❌ Main content container not found');
            return;
        }

        // HTMLテンプレートを作成
        const template = this.createTemplate(data);
        
        // DOM に挿入
        this.container.innerHTML = template;
        
        // Lucideアイコンを初期化
        this.initializeIcons();
        
        console.log('✅ Dashboard rendered successfully');
    }

    /**
     * HTMLテンプレートを作成（参照ファイルのデザインを採用）
     * @param {Object} data - 表示用データ
     * @returns {string} - HTMLテンプレート
     */
    createTemplate(data) {
        return `
            <div class="mx-auto max-w-md space-y-6">
                <!-- Header -->
                <div class="text-center">
                    <h1 class="text-2xl font-bold">投資ダッシュボード</h1>
                    <p class="text-sm text-muted mt-1">資産状況とパフォーマンス</p>
                </div>

                <!-- Monthly Performance Chart -->
                <div class="card rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold">月次パフォーマンス</h2>
                    </div>
                    <!-- Period Selection Tabs -->
                    <div class="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                        <button class="flex-1 py-2 px-3 text-sm rounded-md bg-white shadow-sm font-medium">3ヶ月</button>
                        <button class="flex-1 py-2 px-3 text-sm rounded-md text-muted">6ヶ月</button>
                        <button class="flex-1 py-2 px-3 text-sm rounded-md text-muted">1年</button>
                        <button class="flex-1 py-2 px-3 text-sm rounded-md text-muted">2年</button>
                    </div>
                    <!-- Chart Area -->
                    <div class="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                        <canvas id="monthlyChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- Sector Allocation Chart -->
                <div class="card rounded-lg p-4">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold">セクター配分</h2>
                    </div>
                    <!-- Sector Type Tabs -->
                    <div class="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                        <button class="flex-1 py-2 px-3 text-sm rounded-md bg-white shadow-sm font-medium">地域別</button>
                        <button class="flex-1 py-2 px-3 text-sm rounded-md text-muted">業種別</button>
                        <button class="flex-1 py-2 px-3 text-sm rounded-md text-muted">資産別</button>
                    </div>
                    <!-- Chart Area -->
                    <div class="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                        <canvas id="sectorChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <!-- Summary Card -->
                <div class="card rounded-lg p-4">
                    <h3 class="text-lg font-bold mb-3">資産サマリー</h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-xs text-muted">総投資額</p>
                            <p class="text-lg font-bold">¥${data.totalAmount.toLocaleString('ja-JP')}</p>
                        </div>
                        <div>
                            <p class="text-xs text-muted">月額積立</p>
                            <p class="text-lg font-bold">¥${data.monthlyAmount.toLocaleString('ja-JP')}</p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t">
                        <span class="text-sm text-muted">評価損益</span>
                        <div class="flex items-center gap-2">
                            <i data-lucide="trending-up" class="h-4 w-4 text-accent"></i>
                            <span class="font-bold text-accent">¥${data.profitLoss.toLocaleString('ja-JP')} (+${data.profitLossRate}%)</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="grid grid-cols-2 gap-3">
                    <button class="btn-primary h-16 flex flex-col gap-1 rounded-lg border">
                        <i data-lucide="database" class="h-5 w-5"></i>
                        <span class="text-xs">保有銘柄管理</span>
                    </button>
                    <button class="btn-secondary h-16 flex flex-col gap-1 rounded-lg border" id="addAssetBtn">
                        <i data-lucide="plus" class="h-5 w-5"></i>
                        <span class="text-xs">銘柄追加</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Lucideアイコンを初期化（再描画後に必要）
     */
    initializeIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
            console.log('🎨 Lucide icons initialized');
        }
    }

    /**
     * エラー表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="error-state">
                <h2>⚠️ エラーが発生しました</h2>
                <p>${message}</p>
            </div>
        `;
        console.error('❌ DashboardView error:', message);
    }

    /**
     * ローディング表示
     */
    showLoading() {
        this.container.innerHTML = `
            <div class="loading-state">
                <p>📊 データを読み込み中...</p>
            </div>
        `;
        console.log('⏳ DashboardView loading...');
    }
}

export { DashboardView };