/**
 * CsvImportView - CSV取り込み画面（View）
 * 責務: 画面の描画、DOM操作、ユーザー入力の受け付け（イベントコールバックの登録）
 * 取込処理自体はController/Service側で行う
 */
export class CsvImportView {
  constructor() {
    this.container = document.getElementById('mainContent');
    this.callbacks = {
      onImport: null,
      onFileSelected: null
    };
  }

  /**
   * 画面描画
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = this.#template();
    this.#bindDomRefs();
    this.#bindEvents();

    // Lucideアイコン初期化
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * コールバック登録
   */
  onImport(handler) { this.callbacks.onImport = handler; }
  onFileSelected(handler) { this.callbacks.onFileSelected = handler; }

  /**
   * オプション取得（重複スキップ、ドライラン）
   */
  getOptions() {
    return {
      dedupe: !!(this.dedupeCheckbox && this.dedupeCheckbox.checked),
      dryRun: !!(this.dryRunCheckbox && this.dryRunCheckbox.checked)
    };
  }

  /**
   * プレビュー表示
   * @param {{ transactions: object[], warnings: string[], format: string }} result
   */
  showPreview(result) {
    if (!this.previewArea) return;

    const { transactions = [], warnings = [], format = 'UNKNOWN' } = result || {};
    const count = transactions.length;
    const sample = transactions.slice(0, 10);

    const warningHtml = warnings.length
      ? `<div class="text-destructive text-sm mb-2">⚠ ${warnings.join(', ')}</div>`
      : '';

    const rowsHtml = sample.map((t) => `
      <tr class="border-b">
        <td class="px-2 py-1">${t.executedAt || ''}</td>
        <td class="px-2 py-1">${t.market || ''}</td>
        <td class="px-2 py-1">${t.symbol || ''}</td>
        <td class="px-2 py-1">${t.side || ''}</td>
        <td class="px-2 py-1 text-right">${t.quantity ?? ''}</td>
        <td class="px-2 py-1 text-right">${t.price ?? ''}</td>
        <td class="px-2 py-1 text-right">${t.amount ?? ''}</td>
        <td class="px-2 py-1">${t.currency || ''}</td>
      </tr>
    `).join('');

    this.previewArea.innerHTML = `
      <div class="card rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold">プレビュー</h3>
          <div class="text-sm text-muted">形式: <span class="font-mono">${format}</span> / 件数: <b>${count}</b></div>
        </div>
        ${warningHtml}
        <div class="overflow-auto rounded border">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-2 py-1 text-left">日付</th>
                <th class="px-2 py-1 text-left">市場</th>
                <th class="px-2 py-1 text-left">銘柄/シンボル</th>
                <th class="px-2 py-1 text-left">売買</th>
                <th class="px-2 py-1 text-right">数量</th>
                <th class="px-2 py-1 text-right">価格</th>
                <th class="px-2 py-1 text-right">金額</th>
                <th class="px-2 py-1 text-left">通貨</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td class="px-2 py-3 text-center" colspan="8">表示する行がありません</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * インポート結果表示
   */
  showResult(result) {
    if (!this.resultArea) return;
    const { imported = 0, skipped = 0, errors = [] } = result || {};
    const hasError = errors.length > 0;
    this.resultArea.innerHTML = `
      <div class="card rounded-lg p-4 ${hasError ? 'border border-red-300' : ''}">
        <h3 class="text-lg font-bold mb-2">インポート結果</h3>
        <div class="text-sm mb-2">追加: <b>${imported}</b> / スキップ: <b>${skipped}</b></div>
        ${hasError ? `<div class="text-destructive text-sm">エラー: ${errors.join(', ')}</div>` : '<div class="text-sm text-accent">成功しました</div>'}
      </div>
    `;
  }

  showLoading(message = '処理中...') {
    if (this.statusArea) {
      this.statusArea.innerHTML = `<div class="text-sm">⏳ ${message}</div>`;
    }
    if (this.importBtn) this.importBtn.disabled = true;
  }

  hideLoading(message = '') {
    if (this.statusArea) {
      this.statusArea.innerHTML = message ? `<div class="text-sm">${message}</div>` : '';
    }
    if (this.importBtn) this.importBtn.disabled = false;
  }

  // ===============================
  // private
  // ===============================
  #bindDomRefs() {
    this.dropZone = this.container.querySelector('#dropZone');
    this.fileInput = this.container.querySelector('#csvFile');
    this.importBtn = this.container.querySelector('#importBtn');
    this.previewArea = this.container.querySelector('#previewArea');
    this.resultArea = this.container.querySelector('#resultArea');
    this.statusArea = this.container.querySelector('#statusArea');
    this.dedupeCheckbox = this.container.querySelector('#optDedupe');
    this.dryRunCheckbox = this.container.querySelector('#optDryRun');
  }

  #bindEvents() {
    if (this.dropZone) {
      ;['dragenter','dragover'].forEach(ev => this.dropZone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        this.dropZone.classList.add('ring-2','ring-blue-400');
      }));
      ;['dragleave','drop'].forEach(ev => this.dropZone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        this.dropZone.classList.remove('ring-2','ring-blue-400');
      }));
      this.dropZone.addEventListener('drop', async (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file && this.callbacks.onFileSelected) this.callbacks.onFileSelected(file);
      });
    }

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file && this.callbacks.onFileSelected) this.callbacks.onFileSelected(file);
      });
    }

    if (this.importBtn) {
      this.importBtn.addEventListener('click', () => {
        if (this.callbacks.onImport) this.callbacks.onImport(this.getOptions());
      });
    }
  }

  #template() {
    return `
      <div class="mx-auto max-w-2xl space-y-6">
        <div class="text-center">
          <h1 class="text-2xl font-bold">CSV取り込み</h1>
          <p class="text-sm text-muted mt-1">楽天証券の取引履歴（JP/US/投信）を取り込みます</p>
        </div>

        <div class="card rounded-lg p-4">
          <div class="mb-3 font-medium">ファイル選択</div>
          <div id="dropZone" class="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 cursor-pointer">
            <i data-lucide="upload" class="h-6 w-6 mx-auto mb-2"></i>
            <div class="text-sm">ここにCSVをドラッグ&ドロップ</div>
            <div class="text-xs text-muted">または</div>
            <div class="mt-2">
              <input id="csvFile" type="file" accept=".csv,text/csv" class="text-sm" />
            </div>
          </div>

          <div class="mt-4 flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm">
              <input id="optDedupe" type="checkbox" class="accent-blue-600" checked>
              重複（同名資産）をスキップ
            </label>
            <label class="flex items-center gap-2 text-sm">
              <input id="optDryRun" type="checkbox" class="accent-blue-600">
              ドライラン（保存しない）
            </label>
          </div>

          <div class="mt-4 flex gap-2">
            <button id="importBtn" class="btn btn-primary rounded-md px-3 py-2 flex items-center gap-2">
              <i data-lucide="check-circle" class="h-4 w-4"></i>
              インポート
            </button>
            <div id="statusArea" class="ml-auto text-sm"></div>
          </div>
        </div>

        <div id="previewArea"></div>
        <div id="resultArea"></div>
      </div>
    `;
  }
}

export default CsvImportView;

