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
                ${this.renderControls()}
                ${this.renderStats()}
                ${this.renderFilters()}
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
                        <button onclick="transactionTable.clearFilters()" class="btn-secondary">
                            🔄 クリア
                        </button>
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
}

// グローバルエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionTable;
} else if (typeof window !== 'undefined') {
    window.TransactionTable = TransactionTable;
}