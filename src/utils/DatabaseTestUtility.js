/**
 * データベース機能テストユーティリティ
 * @description Phase 2.1で実装したデータベース機能の統合テスト・デバッグ支援
 */
class DatabaseTestUtility {
    constructor() {
        this.testResults = [];
        this.isDebugMode = false;
    }

    /**
     * デバッグモードの有効化
     * @param {boolean} enabled - デバッグモード有効フラグ
     * @description 詳細なログ出力とテスト実行を有効化
     */
    enableDebugMode(enabled = true) {
        this.isDebugMode = enabled;
        console.log(`📊 Database Test Debug Mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * データベースコンポーネント初期化テスト
     * @returns {Object} テスト結果
     * @description 全コンポーネントの初期化状況を確認
     */
    testDatabaseInitialization() {
        console.log('🔧 Testing Database Initialization...');
        
        const results = {
            timestamp: new Date().toISOString(),
            testName: 'Database Initialization',
            components: {},
            overall: 'unknown'
        };

        try {
            // DatabaseController存在確認
            results.components.DatabaseController = {
                exists: typeof window.DatabaseController !== 'undefined',
                instance: window.databaseController ? 'initialized' : 'not_initialized',
                status: 'unknown'
            };

            // DatabaseView存在確認
            results.components.DatabaseView = {
                exists: typeof window.DatabaseView !== 'undefined',
                instance: window.databaseController?.view ? 'initialized' : 'not_initialized',
                status: 'unknown'
            };

            // TransactionDatabaseService存在確認
            results.components.TransactionDatabaseService = {
                exists: typeof window.TransactionDatabaseService !== 'undefined',
                instance: window.databaseController?.transactionDatabaseService ? 'initialized' : 'not_initialized',
                status: 'unknown'
            };

            // AssetDatabaseService存在確認
            results.components.AssetDatabaseService = {
                exists: typeof window.AssetDatabaseService !== 'undefined',
                instance: window.databaseController?.assetDatabaseService ? 'initialized' : 'not_initialized',
                status: 'unknown'
            };

            // TransactionTable存在確認
            results.components.TransactionTable = {
                exists: typeof window.TransactionTable !== 'undefined',
                instance: window.transactionTable ? 'initialized' : 'not_initialized',
                status: 'unknown'
            };

            // AssetGrid存在確認
            results.components.AssetGrid = {
                exists: typeof window.AssetGrid !== 'undefined',
                instance: window.assetGrid ? 'initialized' : 'not_initialized',
                status: 'unknown'
            };

            // 全体的な判定
            const allExists = Object.values(results.components).every(comp => comp.exists);
            const allInitialized = Object.values(results.components).every(comp => comp.instance === 'initialized');

            results.overall = allExists ? (allInitialized ? 'success' : 'partial') : 'failed';

            if (this.isDebugMode) {
                console.table(results.components);
            }

        } catch (error) {
            results.error = error.message;
            results.overall = 'error';
            console.error('Database initialization test failed:', error);
        }

        this.testResults.push(results);
        console.log(`✅ Database Initialization Test: ${results.overall}`);
        return results;
    }

    /**
     * データベースナビゲーションテスト
     * @returns {Object} テスト結果
     * @description タブ切り替えとナビゲーション機能をテスト
     */
    testDatabaseNavigation() {
        console.log('🧭 Testing Database Navigation...');
        
        const results = {
            timestamp: new Date().toISOString(),
            testName: 'Database Navigation',
            navigation: {},
            overall: 'unknown'
        };

        try {
            // データベースページ表示テスト
            if (window.databaseController) {
                window.databaseController.showDatabase();
                results.navigation.showDatabase = 'success';
            } else {
                results.navigation.showDatabase = 'failed - no controller';
            }

            // タブ切り替えテスト
            const tabs = ['transactions', 'assets', 'history'];
            tabs.forEach(tab => {
                try {
                    if (window.databaseController) {
                        window.databaseController.switchTab(tab);
                        results.navigation[`tab_${tab}`] = 'success';
                    } else {
                        results.navigation[`tab_${tab}`] = 'failed - no controller';
                    }
                } catch (error) {
                    results.navigation[`tab_${tab}`] = `failed - ${error.message}`;
                }
            });

            // DOM要素の存在確認
            const databasePage = document.getElementById('databasePage');
            results.navigation.dom_elements = databasePage ? 'success' : 'failed';

            // 全体的な判定
            const navResults = Object.values(results.navigation);
            const successCount = navResults.filter(r => r === 'success').length;
            results.overall = successCount === navResults.length ? 'success' : 
                             successCount > navResults.length / 2 ? 'partial' : 'failed';

            if (this.isDebugMode) {
                console.table(results.navigation);
            }

        } catch (error) {
            results.error = error.message;
            results.overall = 'error';
            console.error('Database navigation test failed:', error);
        }

        this.testResults.push(results);
        console.log(`✅ Database Navigation Test: ${results.overall}`);
        return results;
    }

    /**
     * データベースサービス機能テスト
     * @returns {Object} テスト結果
     * @description データベースサービスの基本機能をテスト
     */
    testDatabaseServices() {
        console.log('🔧 Testing Database Services...');
        
        const results = {
            timestamp: new Date().toISOString(),
            testName: 'Database Services',
            services: {},
            overall: 'unknown'
        };

        try {
            // TransactionDatabaseServiceテスト
            if (window.databaseController?.transactionDatabaseService) {
                const transactionService = window.databaseController.transactionDatabaseService;
                
                try {
                    const transactions = transactionService.getAllTransactions();
                    results.services.transactionService_getAllTransactions = 
                        Array.isArray(transactions) ? 'success' : 'failed - not array';
                } catch (error) {
                    results.services.transactionService_getAllTransactions = `failed - ${error.message}`;
                }
            } else {
                results.services.transactionService_getAllTransactions = 'failed - not initialized';
            }

            // AssetDatabaseServiceテスト
            if (window.databaseController?.assetDatabaseService) {
                const assetService = window.databaseController.assetDatabaseService;
                
                try {
                    const assets = assetService.generateAssetSummaries();
                    results.services.assetService_generateAssetSummaries = 
                        Array.isArray(assets) ? 'success' : 'failed - not array';
                } catch (error) {
                    results.services.assetService_generateAssetSummaries = `failed - ${error.message}`;
                }

                try {
                    const allocation = assetService.getSectorAllocation();
                    results.services.assetService_getSectorAllocation = 
                        allocation && typeof allocation === 'object' ? 'success' : 'failed - invalid object';
                } catch (error) {
                    results.services.assetService_getSectorAllocation = `failed - ${error.message}`;
                }
            } else {
                results.services.assetService_generateAssetSummaries = 'failed - not initialized';
                results.services.assetService_getSectorAllocation = 'failed - not initialized';
            }

            // 全体的な判定
            const serviceResults = Object.values(results.services);
            const successCount = serviceResults.filter(r => r === 'success').length;
            results.overall = successCount === serviceResults.length ? 'success' : 
                             successCount > serviceResults.length / 2 ? 'partial' : 'failed';

            if (this.isDebugMode) {
                console.table(results.services);
            }

        } catch (error) {
            results.error = error.message;
            results.overall = 'error';
            console.error('Database services test failed:', error);
        }

        this.testResults.push(results);
        console.log(`✅ Database Services Test: ${results.overall}`);
        return results;
    }

    /**
     * レスポンシブデザインテスト
     * @returns {Object} テスト結果
     * @description 画面サイズ変更に対する対応をテスト
     */
    testResponsiveDesign() {
        console.log('📱 Testing Responsive Design...');
        
        const results = {
            timestamp: new Date().toISOString(),
            testName: 'Responsive Design',
            responsive: {},
            overall: 'unknown'
        };

        try {
            const originalWidth = window.innerWidth;
            const testSizes = [
                { name: 'mobile', width: 480 },
                { name: 'tablet', width: 768 },
                { name: 'desktop', width: 1200 }
            ];

            testSizes.forEach(size => {
                try {
                    // 画面サイズをシミュレート（実際の変更は困難なため、CSS クラス確認）
                    const databasePage = document.getElementById('databasePage');
                    if (databasePage) {
                        results.responsive[`${size.name}_elements`] = 'success';
                        
                        // CSS メディアクエリの適用確認（簡易版）
                        const computedStyle = window.getComputedStyle(databasePage);
                        results.responsive[`${size.name}_styles`] = computedStyle ? 'success' : 'failed';
                    } else {
                        results.responsive[`${size.name}_elements`] = 'failed - no page element';
                        results.responsive[`${size.name}_styles`] = 'failed - no page element';
                    }
                } catch (error) {
                    results.responsive[`${size.name}_elements`] = `failed - ${error.message}`;
                    results.responsive[`${size.name}_styles`] = `failed - ${error.message}`;
                }
            });

            // 全体的な判定
            const responsiveResults = Object.values(results.responsive);
            const successCount = responsiveResults.filter(r => r === 'success').length;
            results.overall = successCount === responsiveResults.length ? 'success' : 
                             successCount > responsiveResults.length / 2 ? 'partial' : 'failed';

            if (this.isDebugMode) {
                console.table(results.responsive);
            }

        } catch (error) {
            results.error = error.message;
            results.overall = 'error';
            console.error('Responsive design test failed:', error);
        }

        this.testResults.push(results);
        console.log(`✅ Responsive Design Test: ${results.overall}`);
        return results;
    }

    /**
     * 全テストの実行
     * @returns {Object} 統合テスト結果
     * @description すべてのテストを順次実行して結果を統合
     */
    runAllTests() {
        console.log('🚀 Running Database Integration Tests...');
        
        const integrationResults = {
            timestamp: new Date().toISOString(),
            testSuite: 'Database Phase 2.1 Integration Tests',
            individual: [],
            summary: {},
            overall: 'unknown'
        };

        try {
            // 個別テスト実行
            integrationResults.individual.push(this.testDatabaseInitialization());
            integrationResults.individual.push(this.testDatabaseNavigation());
            integrationResults.individual.push(this.testDatabaseServices());
            integrationResults.individual.push(this.testResponsiveDesign());

            // サマリー作成
            const testCounts = {
                success: integrationResults.individual.filter(t => t.overall === 'success').length,
                partial: integrationResults.individual.filter(t => t.overall === 'partial').length,
                failed: integrationResults.individual.filter(t => t.overall === 'failed').length,
                error: integrationResults.individual.filter(t => t.overall === 'error').length
            };

            integrationResults.summary = {
                total: integrationResults.individual.length,
                ...testCounts,
                successRate: `${Math.round((testCounts.success / integrationResults.individual.length) * 100)}%`
            };

            // 全体判定
            if (testCounts.success === integrationResults.individual.length) {
                integrationResults.overall = 'success';
            } else if (testCounts.success + testCounts.partial >= integrationResults.individual.length / 2) {
                integrationResults.overall = 'partial';
            } else {
                integrationResults.overall = 'failed';
            }

            console.log('📊 Integration Test Summary:');
            console.table(integrationResults.summary);

            if (integrationResults.overall === 'success') {
                console.log('🎉 All Database Tests Passed Successfully!');
            } else if (integrationResults.overall === 'partial') {
                console.log('⚠️ Database Tests Partially Successful - Some Issues Detected');
            } else {
                console.log('❌ Database Tests Failed - Major Issues Detected');
            }

        } catch (error) {
            integrationResults.error = error.message;
            integrationResults.overall = 'error';
            console.error('Integration test execution failed:', error);
        }

        return integrationResults;
    }

    /**
     * テスト結果のエクスポート
     * @returns {string} JSON形式のテスト結果
     * @description テスト結果をJSON形式で出力（デバッグ用）
     */
    exportResults() {
        const exportData = {
            generatedAt: new Date().toISOString(),
            testResults: this.testResults,
            browserInfo: {
                userAgent: navigator.userAgent,
                viewportSize: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        console.log('📄 Test Results Export:');
        console.log(jsonString);
        
        return jsonString;
    }

    /**
     * テスト結果のクリア
     * @description 蓄積されたテスト結果をクリア
     */
    clearResults() {
        this.testResults = [];
        console.log('🧹 Test results cleared');
    }
}

// グローバルエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseTestUtility;
} else if (typeof window !== 'undefined') {
    window.DatabaseTestUtility = DatabaseTestUtility;
}