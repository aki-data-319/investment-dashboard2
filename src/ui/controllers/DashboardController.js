import { DashboardView } from '../views/DashboardView.js';
import { AssetRepository } from '../../data/repositories/AssetRepository.js';
import { LocalStorageAdapter } from '../../infrastructure/LocalStorageAdapter.js';
import { AssetFormController } from './AssetFormController.js';
import { DataStoreManager } from '../../data/managers/DataStoreManager.js';
import { PortfolioAnalysisService } from '../../services/PortfolioAnalysisService.js';

/**
 * DashboardController - ダッシュボード画面の制御を担当
 * @description ダッシュボード画面のUI制御、ユーザー操作処理、データとViewの仲介を行うコントローラークラス
 * 責任: ユーザー操作の処理、データとViewの仲介、チャート管理、イベントハンドリング
 */
class DashboardController {
    /**
     * DashboardControllerのコンストラクタ
     * @description DashboardViewとAssetRepositoryを初期化し、データレイヤーとの連携を確立します
     * @example
     * const controller = new DashboardController();
     * await controller.initialize();
     */
    constructor() {
        this.view = new DashboardView();
        
        // データレイヤーの初期化
        const storageAdapter = new LocalStorageAdapter();
        this.assetRepository = new AssetRepository(storageAdapter);
        this.analysisService = new PortfolioAnalysisService({});
        
        // DataStoreManagerの初期化（DatabaseController用）
        this.dataStoreManager = new DataStoreManager(storageAdapter);
        
        // フォームコントローラー初期化
        this.assetFormController = new AssetFormController(this.assetRepository, this);
        
        console.log('🎮 DashboardController initialized with data layers, DataStoreManager, and form controller');
    }

    /**
     * ダッシュボードを初期化・表示
     * @description ダッシュボードの完全な初期化を行い、データ取得、表示、イベント設定、チャート初期化を実行します
     * @returns {Promise<void>} 初期化完了を示すPromise
     * @throws {Error} データベース初期化エラー、データ取得エラー、描画エラー
     * @example
     * try {
     *   await dashboardController.initialize();
     *   console.log('ダッシュボード初期化完了');
     * } catch (error) {
     *   console.error('初期化失敗:', error);
     * }
     */
    async initialize() {
        console.log('🚀 DashboardController.initialize() called');
        
        try {
            // ローディング表示
            this.view.showLoading();
            
            // データベース初期化
            await this.assetRepository.initializeDatabase();
            
            // 実際のデータを取得
            const data = await this.getPortfolioData();
            
            // ビューに表示
            this.view.render(data);
            
            // イベントリスナーを設定
            this.bindEvents();
            
            // チャートを初期化
            this.initializeCharts();
            
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('[DashboardController.js] initialize エラー:', error?.message || error);
            this.view.showError('ダッシュボードの初期化に失敗しました');
        }
    }

    /**
     * ポートフォリオデータを取得（実データ使用）
     * @description AssetRepositoryから実際のポートフォリオデータを取得し、UI表示用の形式に変換します
     * @returns {Promise<Object>} ポートフォリオデータオブジェクト
     * @returns {Array<Object>} returns.assets - 資産一覧
     * @returns {number} returns.totalAmount - 総投資額
     * @returns {number} returns.assetCount - 資産数
     * @returns {number} returns.monthlyAmount - 月額積立額
     * @returns {number} returns.profitLoss - 評価損益
     * @returns {number} returns.profitLossRate - 利益率
     * @returns {Object} returns.summary - サマリー情報
     * @throws {Error} データ取得エラー時（ダミーデータにフォールバック）
     * @example
     * const data = await controller.getPortfolioData();
     * console.log(`総資産: ${data.totalAmount}円`);
     */
    async getPortfolioData() {
        console.log('📊 Getting portfolio data from repository...');
        
        try {
            // リポジトリからアクティブな資産を取得
            const activeAssets = await this.assetRepository.getActiveAssets();
            console.log(`Found ${activeAssets.length} active assets`);
            
            // ポートフォリオサマリーを取得
            const summary = await this.assetRepository.getPortfolioSummary();
            
            // UIで使用する形式に変換
            const assets = activeAssets.map(asset => ({
                id: asset.id,
                name: asset.name,
                amount: asset.currentValue,
                type: asset.type,
                region: asset.region,
                returnPercentage: asset.getReturnPercentage(),
                profitLoss: asset.getUnrealizedGainLoss()
            }));
            
            return {
                assets: assets,
                totalAmount: summary.totalCurrentValue,
                assetCount: summary.totalAssets,
                monthlyAmount: 85000, // TODO: 実際の月額積立額を計算
                profitLoss: summary.totalUnrealizedGainLoss,
                profitLossRate: summary.averageReturnPercentage,
                summary: summary
            };
            
        } catch (error) {
            console.error('Error getting portfolio data:', error);
            // エラー時はダミーデータにフォールバック
            return await this.getDummyDataFallback();
        }
    }

    /**
     * フォールバック用ダミーデータ
     * @description 実データの取得に失敗した場合に使用するダミーデータを生成します
     * @returns {Promise<Object>} ダミーポートフォリオデータ
     * @returns {Array<Object>} returns.assets - ダミー資産データ（3件）
     * @returns {number} returns.totalAmount - ダミー総投資額
     * @returns {number} returns.assetCount - ダミー資産数
     * @returns {number} returns.monthlyAmount - ダミー月額積立額
     * @returns {number} returns.profitLoss - ダミー評価損益
     * @returns {number} returns.profitLossRate - ダミー利益率
     * @example
     * const fallbackData = await controller.getDummyDataFallback();
     * // エラー時の安全なデータ表示
     */
    async getDummyDataFallback() {
        console.log('⚠️ Using fallback dummy data...');
        
        const dummyAssets = [
            { id: '1', name: 'eMAXIS Slim 全世界株式', amount: 450000, type: 'mutualFund', region: 'OTHER' },
            { id: '2', name: '楽天・全米株式インデックス', amount: 320000, type: 'mutualFund', region: 'US' },
            { id: '3', name: 'SBI・先進国株式インデックス', amount: 280000, type: 'mutualFund', region: 'OTHER' }
        ];
        
        const totalAmount = dummyAssets.reduce((sum, asset) => sum + asset.amount, 0);
        
        return {
            assets: dummyAssets,
            totalAmount: totalAmount,
            assetCount: dummyAssets.length,
            monthlyAmount: 85000,
            profitLoss: 168500,
            profitLossRate: 6.5
        };
    }

    /**
     * イベントリスナーを設定
     * @description ダッシュボード内の各種ボタンやUIエレメントにイベントリスナーを設定します
     * @returns {void}
     * @example
     * controller.bindEvents();
     * // 各種ボタンのクリックイベントが有効になる
     */
    bindEvents() {
        console.log('🔗 Binding events...');
        
        // 「投資信託を追加」ボタン
        const addBtn = document.getElementById('addAssetBtn');
        if (addBtn) {
            addBtn.addEventListener('click', this.handleAddAsset.bind(this));
            console.log('✅ Add asset button event bound');
        }
    }

    /**
     * 「投資信託を追加」ボタンが押された時の処理
     * @description 投資信託追加ボタンのクリック時に投資信託追加フォームモーダルを表示します
     * @returns {void}
     * @example
     * // ボタンクリック時に自動実行
     * // controller.handleAddAsset(); // 直接呼び出す場合
     */
    handleAddAsset() {
        console.log('➕ Add asset button clicked - Opening form modal');
        
        try {
            // フォームモーダルを表示
            this.assetFormController.openForm();
            
        } catch (error) {
            console.error('❌ Failed to open asset form:', error);
            alert('フォームの表示に失敗しました。ページを再読み込みしてお試しください。');
        }
    }

    /**
     * テスト用：ダミーデータ追加（動作確認用）
     * @description 開発・動作確認用のダミー資産をリポジトリに追加し、ダッシュボードを更新します
     * @returns {Promise<void>} 追加処理完了を示すPromise
     * @throws {Error} 資産追加失敗時
     * @example
     * try {
     *   await controller.addDummyAssetForTesting();
     *   console.log('テスト資産が追加されました');
     * } catch (error) {
     *   console.error('追加失敗:', error);
     * }
     */
    async addDummyAssetForTesting() {
        console.log('🧪 Adding dummy asset for testing...');
        
        try {
            // リポジトリに新しい資産を追加
            const newAssetData = {
                name: `テスト投資信託 ${new Date().toLocaleTimeString()}`,
                type: 'mutualFund',
                region: Math.random() > 0.5 ? 'US' : 'JP',
                currency: 'JPY',
                totalInvestment: Math.floor(Math.random() * 400000) + 100000,
                currentValue: Math.floor(Math.random() * 500000) + 120000,
                sector: 'テスト'
            };
            
            const newAsset = await this.assetRepository.addAsset(newAssetData);
            console.log('✅ New asset added:', newAsset.name);
            
            // データを再取得して再描画
            const updatedData = await this.getPortfolioData();
            this.view.render(updatedData);
            this.bindEvents();
            this.initializeCharts();
            
            console.log('🎉 Asset added and view updated with real data');
            
        } catch (error) {
            console.error('[DashboardController.js] handleAddAsset エラー:', error?.message || error);
            alert(`資産追加エラー: ${error.message}`);
        }
    }

    /**
     * Chart.jsを初期化
     * @description ダッシュボードの全チャート（月次パフォーマンス、セクター配分）を初期化します
     * @returns {void}
     * @example
     * controller.initializeCharts();
     * // 月次チャートとセクターチャートが描画される
     */
    initializeCharts() {
        console.log('📊 Initializing charts...');
        
        // 月次パフォーマンスチャート
        this.initializeMonthlyChart();
        
        // セクター配分チャート
        this.initializeSectorChart();
    }
    
    /**
     * 月次パフォーマンスチャート初期化
     * @description Chart.jsを使用して月次パフォーマンス表示用の線グラフを初期化します
     * @returns {void}
     * @example
     * controller.initializeMonthlyChart();
     * // 月次パフォーマンス線グラフが描画される
     */
    initializeMonthlyChart() {
        const monthlyCtx = document.getElementById('monthlyChart');
        if (monthlyCtx) {
            new Chart(monthlyCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['1月', '2月', '3月', '4月', '5月'],
                    datasets: [{
                        label: '累計投資額',
                        data: [200000, 450000, 720000, 900000, 1050000],
                        borderColor: 'rgb(212, 119, 6)',
                        backgroundColor: 'rgba(212, 119, 6, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '¥' + value.toLocaleString('ja-JP');
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Monthly chart initialized');
        }
    }
    
    /**
     * セクター配分チャート初期化
     * @description Chart.jsを使用してセクター配分表示用のドーナツチャートを初期化します
     * @returns {void}
     * @example
     * controller.initializeSectorChart();
     * // セクター配分ドーナツチャートが描画される
     */
    async initializeSectorChart() {
        const sectorCtx = document.getElementById('sectorChart');
        if (sectorCtx) {
            // v3 exposure を取得
            let labels = ['Unclassified'];
            let values = [1];
            try {
                const { exposure } = await this.analysisService.analyze();
                const top = (exposure?.sector || []).slice(0, 8);
                labels = top.map((x) => x.key);
                values = top.map((x) => Number(x.percentage || 0));
                if (labels.length === 0) {
                    labels = ['Unclassified']; values = [100];
                }
            } catch (e) {
                console.warn('⚠️ exposure取得に失敗。デフォルトを使用します', e);
                labels = ['Unclassified']; values = [100];
            }

            new Chart(sectorCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: [
                            'rgb(22, 78, 99)',     // シアン
                            'rgb(212, 119, 6)',    // アンバー
                            'rgb(236, 254, 255)'   // ライトシアン
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
            console.log('✅ Sector chart initialized');
        }
    }

    /**
     * ダッシュボードデータを更新
     * @description 新しい資産追加後などにダッシュボードのデータを再取得して表示を更新します
     * @returns {Promise<void>} 更新完了を示すPromise
     * @throws {Error} データ取得エラー、描画エラー
     * @example
     * await dashboardController.refreshData();
     * // ダッシュボードが最新データで更新される
     */
    async refreshData() {
        console.log('🔄 Refreshing dashboard data...');
        
        try {
            // 最新データを取得
            const data = await this.getPortfolioData();
            
            // ビューを更新
            this.view.render(data);
            
            // イベントリスナーを再設定
            this.bindEvents();
            
            // チャートを再初期化
            this.initializeCharts();
            
            console.log('✅ Dashboard data refreshed successfully');
            
        } catch (error) {
            console.error('[DashboardController.js] refreshData エラー:', error?.message || error);
            this.view.showError('データの更新に失敗しました');
        }
    }

    /**
     * クリーンアップ処理
     * @description コントローラーのクリーンアップを行い、メモリリークを防止します
     * @returns {void}
     * @example
     * controller.destroy();
     * // イベントリスナーやリソースが適切に解放される
     */
    destroy() {
        console.log('🧹 DashboardController cleanup');
        
        // フォームコントローラーのクリーンアップ
        if (this.assetFormController) {
            this.assetFormController.destroy();
        }
        
        // イベントリスナーの削除等（必要に応じて）
    }
}

export { DashboardController };
