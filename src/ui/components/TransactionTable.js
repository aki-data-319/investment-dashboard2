/**
 * 取引履歴テーブル表示コンポーネント
 * @description フィルタリング機能付きの高度なテーブル表示
 */
class TransactionTable {
    constructor(transactionDatabaseService) {
        this.service = transactionDatabaseService;
        this.currentFilters = {
            type: '',
            region: '',
            currency: ''
        };
        this.searchKeyword = '';
        this.displayLimit = 50;
    }

    /**
     * 取引履歴テーブル全体のHTML生成
     * @returns {string} 完全なテーブルHTML
     */
    render() {
        return `
            <div class="transaction-database-container">
                <div class="database-section-header">
                    <h3>📈 取引履歴管理</h3>
                    <p class="section-description">全ての投資取引を統合表示・検索・フィルタリング</p>
                </div>
                ${this.renderStats()}
                ${this.renderFilters()}
                ${this.renderControls()}
                ${this.renderTable()}
            </div>
        `;
    }

    /**
     * 上部コントロールバーのHTML生成
     * @returns {string} コントロールHTML
     */
    renderControls() {
        return `
            <div class="database-controls">
                <div class="control-group">
                    <label for="displayLimit">表示件数:</label>
                    <select id="displayLimit" onchange="transactionTable.updateDisplayLimit(this.value)">
                        <option value="25" ${this.displayLimit === 25 ? 'selected' : ''}>25件</option>
                        <option value="50" ${this.displayLimit === 50 ? 'selected' : ''}>50件</option>
                        <option value="100" ${this.displayLimit === 100 ? 'selected' : ''}>100件</option>
                        <option value="0" ${this.displayLimit === 0 ? 'selected' : ''}>全件</option>
                    </select>
                </div>
                <div class="control-actions">
                    <button onclick="transactionTable.exportToCsv()" class="btn-export">
                        📤 CSV出力
                    </button>
                    <button onclick="transactionTable.refreshData()" class="btn-refresh">
                        🔄 更新
                    </button>
                    <button onclick="transactionTable.clearAllDatabase()" class="btn-clear-db">
                        🗑️ データクリア
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 統計情報表示のHTML生成
     * @returns {string} 統計HTML
     */
    renderStats() {
        const transactions = this.getFilteredTransactions();
        const stats = this.service.getTransactionStats(transactions);

        return `
            <div class="transaction-stats">
                <div class="stat-card">
                    <div class="stat-value">${stats.total.toLocaleString()}</div>
                    <div class="stat-label">総取引数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">¥${Math.round(stats.totalAmount).toLocaleString()}</div>
                    <div class="stat-label">総投資額</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Object.keys(stats.byType).length}</div>
                    <div class="stat-label">資産種別</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${Object.keys(stats.byRegion).length}</div>
                    <div class="stat-label">投資地域</div>
                </div>
            </div>
        `;
    }

    /**
     * フィルターバーのHTML生成
     * @returns {string} フィルターHTML
     */
    renderFilters() {
        return `
            <div class="filter-bar">
                <div class="filter-controls">
                    <div class="filter-group">
                        <label for="searchKeyword">🔍 検索</label>
                        <input 
                            type="text" 
                            id="searchKeyword" 
                            placeholder="銘柄名・ティッカー・セクターで検索"
                            value="${this.searchKeyword}"
                            onkeyup="transactionTable.handleSearch(event)"
                        >
                    </div>
                    <div class="filter-group">
                        <label for="typeFilter">種別</label>
                        <select id="typeFilter" onchange="transactionTable.handleFilterChange()">
                            <option value="">全種別</option>
                            <option value="mutualFund" ${this.currentFilters.type === 'mutualFund' ? 'selected' : ''}>投資信託</option>
                            <option value="stock" ${this.currentFilters.type === 'stock' ? 'selected' : ''}>個別株</option>
                            <option value="crypto" ${this.currentFilters.type === 'crypto' ? 'selected' : ''}>仮想通貨</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="regionFilter">地域</label>
                        <select id="regionFilter" onchange="transactionTable.handleFilterChange()">
                            <option value="">全地域</option>
                            <option value="JP" ${this.currentFilters.region === 'JP' ? 'selected' : ''}>日本</option>
                            <option value="US" ${this.currentFilters.region === 'US' ? 'selected' : ''}>米国</option>
                            <option value="Global" ${this.currentFilters.region === 'Global' ? 'selected' : ''}>Global</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="currencyFilter">通貨</label>
                        <select id="currencyFilter" onchange="transactionTable.handleFilterChange()">
                            <option value="">全通貨</option>
                            <option value="JPY" ${this.currentFilters.currency === 'JPY' ? 'selected' : ''}>円</option>
                            <option value="USD" ${this.currentFilters.currency === 'USD' ? 'selected' : ''}>USD</option>
                        </select>
                    </div>
                    <div class="filter-actions">
                        <!-- フィルタークリア機能を削除 - わかりにくさを避けるため -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * メインテーブルのHTML生成
     * @returns {string} テーブルHTML
     */
    renderTable() {
        const transactions = this.getFilteredTransactions();
        const displayTransactions = this.displayLimit > 0 ? 
            this.service.limitForDisplay(transactions, this.displayLimit) : 
            transactions;
        
        return `
            <div class="transaction-table-wrapper">
                <table class="transaction-table">
                    <thead>
                        <tr>
                            <th onclick="transactionTable.sortBy('date')" class="sortable">
                                日付 <span class="sort-indicator">↕️</span>
                            </th>
                            <th onclick="transactionTable.sortBy('name')" class="sortable">
                                銘柄名 <span class="sort-indicator">↕️</span>
                            </th>
                            <th onclick="transactionTable.sortBy('type')" class="sortable">
                                種別 <span class="sort-indicator">↕️</span>
                            </th>
                            <th onclick="transactionTable.sortBy('quantity')" class="sortable">
                                数量 <span class="sort-indicator">↕️</span>
                            </th>
                            <th onclick="transactionTable.sortBy('unitPrice')" class="sortable">
                                単価 <span class="sort-indicator">↕️</span>
                            </th>
                            <th onclick="transactionTable.sortBy('amount')" class="sortable">
                                金額 <span class="sort-indicator">↕️</span>
                            </th>
                            <th>地域</th>
                            <th>通貨</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayTransactions.length > 0 ? 
                            displayTransactions.map(transaction => this.renderTransactionRow(transaction)).join('') :
                            '<tr><td colspan="9" class="no-data">表示する取引データがありません</td></tr>'
                        }
                    </tbody>
                </table>
                <div class="table-info">
                    <span class="info-text">
                        表示: <strong>${displayTransactions.length}</strong>件 / 
                        フィルター結果: <strong>${transactions.length}</strong>件 / 
                        全取引: <strong>${this.service.getAllTransactions().length}</strong>件
                    </span>
                    ${displayTransactions.length < transactions.length ? 
                        `<button onclick="transactionTable.showMore()" class="btn-show-more">
                            📄 さらに表示 (+${transactions.length - displayTransactions.length}件)
                        </button>` : ''
                    }
                </div>
            </div>
        `;
    }

    /**
     * 取引行のHTML生成
     * @param {Object} transaction - 取引データ
     * @returns {string} 行HTML
     */
    renderTransactionRow(transaction) {
        const displayDate = new Date(transaction.date).toLocaleDateString('ja-JP');
        const displayName = transaction.ticker ? 
            `${transaction.name} (${transaction.ticker})` : transaction.name;
        
        const typeLabels = {
            mutualFund: '投資信託',
            stock: '個別株',
            crypto: '仮想通貨'
        };
        
        return `
            <tr data-transaction-id="${transaction.id}" class="transaction-row" onclick="transactionTable.selectRow(this)">
                <td class="date-cell">${displayDate}</td>
                <td class="asset-name">
                    <div class="name-container">
                        <span class="primary-name">${displayName}</span>
                        ${transaction.sector ? `<span class="sector-info">${transaction.sector}</span>` : ''}
                    </div>
                </td>
                <td class="asset-type">
                    <span class="type-badge type-${transaction.type}">
                        ${typeLabels[transaction.type]}
                    </span>
                </td>
                <td class="quantity">
                    ${transaction.quantity !== '-' && transaction.quantity !== '' ? 
                        transaction.quantity.toLocaleString() : '-'}
                </td>
                <td class="unit-price">
                    ${transaction.unitPrice !== '-' && transaction.unitPrice !== '' ? 
                        `${transaction.currency === 'USD' ? '$' : '¥'}${parseFloat(transaction.unitPrice).toLocaleString()}` : '-'}
                </td>
                <td class="amount">
                    ${transaction.currency === 'USD' ? '$' : '¥'}${parseFloat(transaction.amount).toLocaleString()}
                </td>
                <td class="region">
                    <span class="region-badge region-${transaction.region.toLowerCase()}">
                        ${transaction.region}
                    </span>
                </td>
                <td class="currency">${transaction.currency}</td>
                <td class="actions">
                    <div class="action-buttons">
                        <button 
                            onclick="event.stopPropagation(); transactionTable.showTransactionDetail('${transaction.id}')"
                            class="btn-action"
                            title="詳細表示"
                        >
                            👁️
                        </button>
                        <button 
                            onclick="event.stopPropagation(); transactionTable.editTransaction('${transaction.id}')"
                            class="btn-action"
                            title="編集"
                        >
                            ✏️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * フィルタリング済み取引データ取得
     * @returns {Array} フィルタリング済みデータ
     */
    getFilteredTransactions() {
        const allTransactions = this.service.getAllTransactions();
        return this.service.applyFilters(allTransactions, this.currentFilters, this.searchKeyword);
    }

    /**
     * 検索処理
     * @param {Event} event - キーボードイベント
     */
    handleSearch(event) {
        this.searchKeyword = event.target.value;
        this.debounceUpdate();
    }

    /**
     * フィルター変更処理
     */
    handleFilterChange() {
        this.currentFilters = {
            type: document.getElementById('typeFilter')?.value || '',
            region: document.getElementById('regionFilter')?.value || '',
            currency: document.getElementById('currencyFilter')?.value || ''
        };
        this.updateTable();
    }

    /**
     * フィルタークリア
     */
    clearFilters() {
        this.currentFilters = { type: '', region: '', currency: '' };
        this.searchKeyword = '';
        
        // フィルター要素をリセット
        const filterElements = ['typeFilter', 'regionFilter', 'currencyFilter', 'searchKeyword'];
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });
        
        this.updateTable();
    }

    /**
     * 表示件数変更
     * @param {string} value - 新しい表示件数
     */
    updateDisplayLimit(value) {
        this.displayLimit = parseInt(value) || 50;
        this.updateTable();
    }

    /**
     * さらに表示（表示件数を倍増）
     */
    showMore() {
        if (this.displayLimit > 0) {
            this.displayLimit *= 2;
        } else {
            this.displayLimit = 100;
        }
        this.updateTable();
    }

    /**
     * ソート処理
     * @param {string} column - ソート対象カラム
     */
    sortBy(column) {
        // 実装は簡易版として今回は省略
        console.log(`Sort by: ${column}`);
        this.showMessage(`${column}でのソート機能は実装予定です`, 'info');
    }

    /**
     * 行選択処理
     * @param {HTMLElement} row - 選択された行要素
     */
    selectRow(row) {
        // 既存の選択を解除
        document.querySelectorAll('.transaction-row.selected').forEach(r => {
            r.classList.remove('selected');
        });
        
        // 新しい行を選択
        row.classList.add('selected');
        
        const transactionId = row.dataset.transactionId;
        console.log(`Selected transaction: ${transactionId}`);
    }

    /**
     * 取引詳細表示
     * @param {string} transactionId - 取引ID
     */
    showTransactionDetail(transactionId) {
        const transaction = this.service.getTransactionById(transactionId);
        if (transaction) {
            // 詳細モーダルを表示（今回は簡易版）
            alert(`取引詳細:\n銘柄: ${transaction.name}\n金額: ${transaction.currency}${transaction.amount.toLocaleString()}\n日付: ${transaction.date}`);
        }
    }

    /**
     * 取引編集
     * @param {string} transactionId - 取引ID
     */
    editTransaction(transactionId) {
        console.log(`Edit transaction: ${transactionId}`);
        this.showMessage('取引編集機能は実装予定です', 'info');
    }

    /**
     * CSV出力
     */
    exportToCsv() {
        try {
            const transactions = this.getFilteredTransactions();
            const csvContent = this.service.exportToCsv(transactions);
            
            if (csvContent) {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                
                link.setAttribute('href', url);
                link.setAttribute('download', `取引履歴_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showMessage(`${transactions.length}件の取引データをCSVで出力しました`, 'success');
            } else {
                this.showMessage('CSVデータの生成に失敗しました', 'error');
            }
        } catch (error) {
            console.error('CSV export failed:', error);
            this.showMessage('CSV出力でエラーが発生しました', 'error');
        }
    }

    /**
     * データ更新
     */
    refreshData() {
        try {
            this.service.clearCache();
            this.updateTable();
            this.showMessage('取引データを更新しました', 'success');
        } catch (error) {
            console.error('Data refresh failed:', error);
            this.showMessage('データ更新でエラーが発生しました', 'error');
        }
    }

    /**
     * テーブル更新
     */
    updateTable() {
        const container = document.querySelector('.transaction-database-container');
        if (container) {
            container.innerHTML = this.render();
        }
    }

    /**
     * デバウンス付き更新（検索用）
     */
    debounceUpdate() {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.updateTable();
        }, 300);
    }

    /**
     * メッセージ表示
     * @param {string} message - メッセージ
     * @param {string} type - メッセージタイプ
     */
    showMessage(message, type) {
        // 既存のメッセージ表示機能を活用
        if (window.app && window.app.showMessage) {
            window.app.showMessage(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // 簡易通知として3秒間表示
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
                color: white;
                border-radius: 6px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }

    /**
     * データベース全削除機能
     * @description 3段階確認プロセスによる安全なデータ削除
     */
    clearAllDatabase() {
        console.log('🗑️ データベースクリア開始');
        
        // DataStoreManagerインスタンスの取得
        // 注入されたサービス経由でアクセス（CSVエクスポートと同じパターン）
        const dataManager = this.service.dataStoreManager;
        
        // デバッグ情報出力
        console.log('🔍 デバッグ情報:');
        console.log('this.service:', this.service);
        console.log('this.service.dataStoreManager:', this.service.dataStoreManager);
        console.log('dataManager:', dataManager);
        console.log('dataManager constructor:', dataManager?.constructor?.name);
        
        if (!dataManager) {
            console.error('❌ DataStoreManagerが見つかりません');
            this.showMessage('❌ データ管理システムが見つかりません', 'error');
            return;
        }
        
        // 第1段階: 基本警告
        const confirmed1 = confirm(`⚠️ データベース全削除の警告\n\nこの操作により、保存されている全ての投資データが完全に削除されます。\n\n【削除されるデータ】\n• 投資信託情報\n• 個別株情報\n• 仮想通貨情報\n• 取引履歴\n• 編集履歴\n\n⚠️ 一度削除されたデータは復元できません\n\n続行しますか？`);
        
        if (!confirmed1) {
            console.log('❌ データベースクリア中止 - 第1段階');
            return;
        }
        
        // 第2段階: データプレビュー
        const stats = this.getDatabaseStats(dataManager);
        const confirmed2 = confirm(`📊 削除対象データの確認\n\n現在保存されているデータ:\n投資信託: ${stats.mutualFunds}件\n個別株: ${stats.stocks}件\n仮想通貨: ${stats.cryptos}件\n取引履歴: ${stats.total}件\n\n⚠️ これらのデータが全て削除されます\n\n削除を実行しますか？`);
        
        if (!confirmed2) {
            console.log('❌ データベースクリア中止 - 第2段階');
            return;
        }
        
        // 最終確認（簡略化）
        const finalConfirmed = confirm(`🔴 最終確認 - データ完全削除\n\n本当にすべてのデータを削除しますか？\nこの操作は取り消しできません。`);
        
        if (!finalConfirmed) {
            console.log('❌ データベースクリア中止 - 最終確認');
            this.showMessage('データクリアがキャンセルされました', 'info');
            return;
        }
        
        // データ削除実行
        try {
            console.log('🔄 clearAllData() 実行中...');
            console.log('dataManager:', dataManager);
            console.log('clearAllData method:', typeof dataManager.clearAllData);
            
            const success = dataManager.clearAllData();
            
            console.log('✅ clearAllData() 実行結果:', success);
            
            if (success) {
                this.showMessage('✅ 全データの削除が完了しました', 'success');
                console.log('✅ データベースクリア完了');
                
                // スムーズな更新（リフレッシュなし）
                console.log('🔄 スムーズ更新開始...');
                
                // 1. サービスのキャッシュをクリア
                this.service.clearCache();
                
                // 2. テーブルを再描画（空状態になる）
                this.updateTableWithAnimation();
                
                // 3. 他のタブも更新（もしDatabaseControllerがアクセス可能なら）
                this.refreshOtherTabs();
                
                console.log('✅ スムーズ更新完了');
            } else {
                this.showMessage('❌ データ削除に失敗しました', 'error');
                console.error('❌ データベースクリア失敗');
            }
        } catch (error) {
            console.error('❌ データベースクリアエラー:', error);
            console.error('Error details:', error);
            this.showMessage('❌ データ削除中にエラーが発生しました', 'error');
        }
    }

    /**
     * データベース統計情報取得
     * @description データプレビュー表示用の統計情報を取得
     * @param {DataStoreManager} dataManager - データマネージャー
     * @returns {Object} 統計情報
     * @example
     * const stats = transactionTable.getDatabaseStats(dataManager);
     * console.log(`投資信託: ${stats.mutualFunds}件`);
     */
    getDatabaseStats(dataManager) {
        try {
            // TransactionDatabaseService経由でデータを取得（表示と同じデータソース）
            const allTransactions = this.service.getAllTransactions();
            
            // 種別ごとに分類
            const mutualFunds = allTransactions.filter(t => t.type === 'mutualFund');
            const stocks = allTransactions.filter(t => t.type === 'stock');
            const cryptos = allTransactions.filter(t => t.type === 'crypto');
            
            return {
                mutualFunds: mutualFunds.length,
                stocks: stocks.length,
                cryptos: cryptos.length,
                total: allTransactions.length
            };
        } catch (error) {
            console.error('統計情報取得エラー:', error);
            return {
                mutualFunds: 0,
                stocks: 0,
                cryptos: 0,
                total: 0
            };
        }
    }

    /**
     * アニメーション付きでテーブルを更新
     * @description データクリア後のスムーズな画面遷移
     */
    updateTableWithAnimation() {
        const container = document.querySelector('.transaction-database-container');
        if (container) {
            // フェードアウト
            container.style.opacity = '0.3';
            container.style.transition = 'opacity 0.3s ease';
            
            // 少し待ってから更新
            setTimeout(() => {
                this.updateTable();
                
                // フェードイン
                container.style.opacity = '1';
                console.log('✅ アニメーション付き更新完了');
            }, 150);
        } else {
            // フォールバック：通常更新
            this.updateTable();
        }
    }

    /**
     * 他のタブも更新する
     * @description データクリア後に銘柄情報タブなども空状態にする
     */
    refreshOtherTabs() {
        try {
            // DatabaseControllerにアクセスして他のタブも更新
            if (window.databaseController && typeof window.databaseController.refreshAllTabs === 'function') {
                window.databaseController.refreshAllTabs();
                console.log('✅ 他のタブも更新しました');
            } else {
                console.log('ℹ️ DatabaseController経由での更新はスキップ');
            }
        } catch (error) {
            console.warn('⚠️ 他のタブ更新でエラー:', error);
            // エラーが発生してもメイン処理は継続
        }
    }
}

// グローバルエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionTable;
} else if (typeof window !== 'undefined') {
    window.TransactionTable = TransactionTable;
}