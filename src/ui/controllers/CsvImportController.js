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
      this.view.showPreview({ transactions: [], warnings: [], format: 'UNKNOWN' });
      this.view.hideLoading('ファイルを選択しました');
    });

    this.view.onParse(async () => {
      if (!this.currentFile) {
        this.view.hideLoading('CSVファイルを選択してください');
        return;
      }
      try {
        this.view.showLoading('プレビュー解析中...');
        const preview = await this.service.parseAndPreview(this.currentFile);
        this.lastPreview = preview;
        this.view.showPreview(preview);
        this.view.hideLoading('プレビュー完了');
      } catch (e) {
        console.error('[CsvImportController.js] onParse エラー:', e?.message || e);
        this.view.hideLoading('解析に失敗しました');
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

  destroy() {
    // 必要ならリスナーの解除等
  }
}

export { CsvImportController };
export default CsvImportController;
