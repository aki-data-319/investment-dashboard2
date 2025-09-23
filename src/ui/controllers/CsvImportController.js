import { CsvImportView } from '../views/CsvImportView.js';
import { CsvImportService } from '../../services/CsvImportService.js';

/**
 * CsvImportController - CSV取り込み画面の制御
 * 責務: ViewとServiceの仲介、ユーザー操作の処理、結果の表示/ダッシュボード更新
 */
class CsvImportController {
  /**
   * @param {import('../../data/repositories/AssetRepository.js').AssetRepository} assetRepository
   * @param {import('./DashboardController.js').DashboardController} [dashboardController]
   */
  constructor(assetRepository, dashboardController) {
    this.view = new CsvImportView();
    this.assetRepository = assetRepository;
    this.dashboardController = dashboardController;
    this.service = new CsvImportService({ assetRepository });

    this.currentFile = null;
    this.lastPreview = null;
  }

  async initialize() {
    this.view.render();
    this.bindEvents();
  }

  bindEvents() {
    this.view.onFileSelected(async (file) => {
      this.currentFile = file;
      this.lastPreview = null;
      
      // スムーズUX: ファイル選択と同時に自動プレビューを実行
      console.log('📁 ファイル選択完了、自動プレビュー開始:', file.name);
      
      try {
        // まず空のプレビューを表示（即座にフィードバック）
        this.view.showPreview({ transactions: [], warnings: [], format: 'UNKNOWN' });
        
        // ローディング表示してプレビュー解析を実行
        this.view.showLoading('プレビュー解析中...');
        
        // 少し待ってからプレビュー実行（スムーズな遷移のため）
        setTimeout(async () => {
          try {
            const preview = await this.service.parseAndPreview(this.currentFile);
            this.lastPreview = preview;
            
            // フェードアニメーション付きでプレビュー表示
            this.updatePreviewWithAnimation(preview);
            this.view.hideLoading('プレビュー完了');
            
            console.log('✅ 自動プレビュー完了:', preview.transactions.length, '件');
          } catch (error) {
            console.error('❌ 自動プレビューエラー:', error?.message || error);
            this.view.hideLoading('解析に失敗しました');
            this.view.showPreview({ transactions: [], warnings: [`解析エラー: ${error?.message || '不明なエラー'}`], format: 'ERROR' });
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ ファイル選択処理エラー:', error);
        this.view.hideLoading('ファイル処理に失敗しました');
      }
    });


    this.view.onImport(async (options) => {
      if (!this.currentFile) {
        this.view.hideLoading('CSVファイルを選択してください');
        return;
      }
      try {
        this.view.showLoading('インポート中...');
        const { upsert } = await this.service.parseAndImport(this.currentFile, null, null, options);
        const resultForView = { imported: upsert.inserted || 0, skipped: upsert.skipped || 0, errors: [] };
        this.view.showResult(resultForView);
        this.view.hideLoading(options?.dryRun ? 'ドライラン完了' : 'インポート完了');

        // 実インポート時はダッシュボードを更新
        if (!options?.dryRun && this.dashboardController && typeof this.dashboardController.refreshData === 'function') {
          await this.dashboardController.refreshData();
        }

        // ナビゲーションのハイライト整合: ダッシュボードへ遷移
        if (!options?.dryRun && window.app && window.app.router && typeof window.app.router.navigate === 'function') {
          await window.app.router.navigate('dashboard');
        }
      } catch (e) {
        console.error('[CsvImportController.js] onImport エラー:', e?.message || e);
        this.view.hideLoading('インポートに失敗しました');
      }
    });
  }

  /**
   * アニメーション付きプレビュー更新
   * @description データクリア機能と同じスムーズUXでプレビューを更新
   * @param {Object} preview - プレビューデータ
   */
  updatePreviewWithAnimation(preview) {
    // プレビューコンテナを取得
    const previewContainer = document.querySelector('.csv-preview-container, .preview-container');
    
    if (previewContainer) {
      // フェードアウト
      previewContainer.style.opacity = '0.3';
      previewContainer.style.transition = 'opacity 0.3s ease';
      
      // 少し待ってからプレビュー更新
      setTimeout(() => {
        this.view.showPreview(preview);
        
        // フェードイン
        setTimeout(() => {
          previewContainer.style.opacity = '1';
          console.log('✅ プレビューアニメーション完了');
        }, 50);
      }, 150);
    } else {
      // フォールバック：通常更新
      this.view.showPreview(preview);
    }
  }

  destroy() {
    // 必要ならリスナーの解除等
  }
}

export { CsvImportController };
export default CsvImportController;
