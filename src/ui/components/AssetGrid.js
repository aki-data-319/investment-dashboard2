/**
 * 銘柄情報グリッド表示コンポーネント
 * @description カード形式での銘柄情報表示・編集機能
 */
class AssetGrid {
    constructor(assetDatabaseService) {
        this.service = assetDatabaseService;
        this.editMode = false;
        this.currentFilters = {
            search: '',
            sector: '',
            region: '',
            type: ''
        };
        this.sortBy = 'totalInvestment';
        this.sortDirection = 'desc';
    }

    /**
     * 銘柄情報グリッド全体のHTML生成
     * @returns {string} 完全なグリッドHTML
     */
    render() {
        const assets = this.getFilteredAndSortedAssets();
        
        return `
            <div class="asset-database-container">
                <div class="database-section-header">
                    <h3>🏢 銘柄情報管理</h3>
                    <p class="section-description">保有銘柄の詳細情報・セクター管理・パフォーマンス分析</p>
                </div>
                ${this.renderControls()}
                ${this.renderStats(assets)}
                ${this.renderFilters()}
                ${this.renderGrid(assets)}
            </div>
        `;
    }

    /**
     * コントロールバーのHTML生成
     * @returns {string} コントロールHTML
     */
    renderControls() {
        return `
            <div class="asset-controls">
                <div class="control-group">
                    <label for="sortSelect">ソート:</label>
                    <select id="sortSelect" onchange="assetGrid.updateSort(this.value)">
                        <option value="totalInvestment" ${this.sortBy === 'totalInvestment' ? 'selected' : ''}>投資額順</option>
                        <option value="gainPercent" ${this.sortBy === 'gainPercent' ? 'selected' : ''}>収益率順</option>
                        <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>銘柄名順</option>
                        <option value="sector" ${this.sortBy === 'sector' ? 'selected' : ''}>セクター順</option>
                        <option value="lastUpdated" ${this.sortBy === 'lastUpdated' ? 'selected' : ''}>更新日順</option>
                    </select>
                    <button onclick="assetGrid.toggleSortDirection()" class="btn-sort-direction" title="並び順切り替え">
                        ${this.sortDirection === 'desc' ? '↓' : '↑'}
                    </button>
                </div>
                <div class="control-actions">
                    <button onclick="assetGrid.toggleEditMode()" class="btn-toggle ${this.editMode ? 'active' : ''}">
                        ${this.editMode ? '📝 編集中' : '✏️ 編集モード'}
                    </button>
                    <button onclick="assetGrid.exportAssetData()" class="btn-export">
                        📤 データ出力
                    </button>
                    <button onclick="assetGrid.analyzeDuplicates()" class="btn-analyze">
                        🔍 重複チェック
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 統計カードのHTML生成
     * @param {Array} assets - 銘柄データ
     * @returns {string} 統計HTML
     */
    renderStats(assets) {
        const stats = this.calculateAssetStats(assets);
        
        return `
            <div class="asset-stats">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalAssets}</div>
                    <div class="stat-label">保有銘柄数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">¥${Math.round(stats.totalInvestment).toLocaleString()}</div>
                    <div class="stat-label">総投資額</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">¥${Math.round(stats.totalCurrentValue).toLocaleString()}</div>
                    <div class="stat-label">総評価額</div>
                </div>
                <div class="stat-card ${stats.totalGainPercent >= 0 ? 'gain-positive' : 'gain-negative'}">
                    <div class="stat-value">${stats.totalGainPercent >= 0 ? '+' : ''}${stats.totalGainPercent.toFixed(2)}%</div>
                    <div class="stat-label">総合収益率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.sectorCount}</div>
                    <div class="stat-label">セクター数</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.regionCount}</div>
                    <div class="stat-label">投資地域数</div>
                </div>
            </div>
        `;
    }

    /**
     * フィルター部分のHTML生成
     * @returns {string} フィルターHTML
     */
    renderFilters() {
        const sectorOptions = this.getAvailableSectors();
        const regionOptions = this.getAvailableRegions();
        
        return `
            <div class="asset-filters">
                <div class="filter-row">
                    <div class="filter-group">
                        <input type="text" 
                               placeholder="🔍 銘柄名・ティッカーで検索" 
                               value="${this.currentFilters.search}"
                               onkeyup="assetGrid.handleSearch(event)">
                    </div>
                    <div class="filter-group">
                        <select onchange="assetGrid.handleTypeFilter(event)">
                            <option value="">全種別</option>
                            <option value="stock" ${this.currentFilters.type === 'stock' ? 'selected' : ''}>個別株</option>
                            <option value="mutualFund" ${this.currentFilters.type === 'mutualFund' ? 'selected' : ''}>投資信託</option>
                            <option value="crypto" ${this.currentFilters.type === 'crypto' ? 'selected' : ''}>仮想通貨</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <select onchange="assetGrid.handleSectorFilter(event)">
                            <option value="">全セクター</option>
                            ${sectorOptions.map(sector => 
                                `<option value="${sector}" ${this.currentFilters.sector === sector ? 'selected' : ''}>${sector}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <select onchange="assetGrid.handleRegionFilter(event)">
                            <option value="">全地域</option>
                            ${regionOptions.map(region => 
                                `<option value="${region}" ${this.currentFilters.region === region ? 'selected' : ''}>${region}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="filter-actions">
                        <button onclick="assetGrid.clearFilters()" class="btn-clear">
                            🔄 クリア
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 銘柄グリッドのHTML生成
     * @param {Array} assets - 銘柄データ
     * @returns {string} グリッドHTML
     */
    renderGrid(assets) {
        if (assets.length === 0) {
            return `
                <div class="no-assets">
                    <div class="no-data-message">
                        <h4>表示する銘柄がありません</h4>
                        <p>フィルター条件を変更するか、新しい銘柄を追加してください。</p>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="asset-grid">
                ${assets.map(asset => this.renderAssetCard(asset)).join('')}
            </div>
        `;
    }

    /**
     * 銘柄カードのHTML生成
     * @param {Object} asset - 銘柄データ
     * @returns {string} カードHTML
     */
    renderAssetCard(asset) {
        const gainClass = asset.gainPercent >= 0 ? 'gain-positive' : 'gain-negative';
        const gainIcon = asset.gainPercent >= 0 ? '📈' : '📉';
        
        return `
            <div class="asset-card" data-asset-id="${asset.id}" data-type="${asset.type}">
                <div class="card-header">
                    <div class="asset-title">
                        <h4>${asset.name}</h4>
                        <div class="ticker-info">
                            <span class="ticker">${asset.ticker}</span>
                            <span class="type-badge type-${asset.type}">
                                ${this.getTypeLabel(asset.type)}
                            </span>
                        </div>
                    </div>
                    <div class="asset-badges">
                        <span class="region-badge region-${asset.region.toLowerCase()}">${asset.region}</span>
                        ${asset.market ? `<span class="market-badge">${asset.market}</span>` : ''}
                    </div>
                </div>
                
                <div class="card-metrics">
                    ${asset.type !== 'mutualFund' ? `
                        <div class="metric-row">
                            <div class="metric">
                                <label>保有数量</label>
                                <span class="value">${asset.totalQuantity !== '-' ? asset.totalQuantity.toLocaleString() : '-'}</span>
                            </div>
                            <div class="metric">
                                <label>平均取得価格</label>
                                <span class="value">
                                    ${asset.averagePrice !== '-' ? 
                                        `${asset.currency === 'USD' ? '$' : '¥'}${parseFloat(asset.averagePrice).toLocaleString()}` : '-'}
                                </span>
                            </div>
                        </div>
                    ` : ''}
                    <div class="metric-row">
                        <div class="metric">
                            <label>投資額</label>
                            <span class="value amount">
                                ${asset.currency === 'USD' ? '$' : '¥'}${Math.round(asset.totalInvestment).toLocaleString()}
                            </span>
                        </div>
                        <div class="metric">
                            <label>評価額</label>
                            <span class="value amount">
                                ${asset.currency === 'USD' ? '$' : '¥'}${Math.round(asset.currentValue).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div class="metric-row gain-row">
                        <div class="metric">
                            <label>評価損益</label>
                            <span class="value gain ${gainClass}">
                                ${gainIcon} ${asset.currency === 'USD' ? '$' : '¥'}${Math.round(asset.unrealizedGain).toLocaleString()} 
                                (${asset.gainPercent >= 0 ? '+' : ''}${asset.gainPercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="card-details">
                    <div class="detail-item">
                        <label>セクター:</label>
                        ${this.editMode ? 
                            `<select onchange="assetGrid.updateSector('${asset.id}', this.value)" class="sector-edit">
                                <option value="${asset.sector}" selected>${asset.sector}</option>
                                <option value="テクノロジー">テクノロジー</option>
                                <option value="ヘルスケア">ヘルスケア</option>
                                <option value="金融">金融</option>
                                <option value="一般消費財">一般消費財</option>
                                <option value="エネルギー">エネルギー</option>
                                <option value="その他">その他</option>
                            </select>` :
                            `<span class="sector-badge">${asset.sector}</span>`
                        }
                    </div>
                    <div class="detail-item">
                        <label>取引回数:</label>
                        <span>${asset.transactions}回</span>
                    </div>
                    ${asset.monthlyAmount ? 
                        `<div class="detail-item">
                            <label>月次積立:</label>
                            <span>¥${asset.monthlyAmount.toLocaleString()}</span>
                        </div>` : ''}
                    ${asset.customTags && asset.customTags.length > 0 ? 
                        `<div class="detail-item custom-tags">
                            <label>タグ:</label>
                            <div class="tag-list">
                                ${asset.customTags.map(tag => 
                                    `<span class="custom-tag">
                                        ${tag}
                                        ${this.editMode ? 
                                            `<button onclick="assetGrid.removeTag('${asset.id}', '${tag}')" class="tag-remove">×</button>` : ''}
                                    </span>`
                                ).join('')}
                            </div>
                        </div>` : ''}
                </div>
                
                <div class="card-actions">
                    <button onclick="assetGrid.showAssetDetail('${asset.id}')" class="btn-action">
                        📊 詳細分析
                    </button>
                    <button onclick="assetGrid.showTransactionHistory('${asset.id}')" class="btn-action">
                        📜 取引履歴
                    </button>
                    ${this.editMode ? 
                        `<button onclick="assetGrid.showEditModal('${asset.id}')" class="btn-edit">
                            ✏️ 編集
                        </button>
                        <button onclick="assetGrid.showTagModal('${asset.id}')" class="btn-tag">
                            🏷️ タグ
                        </button>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * フィルタリング・ソート済み銘柄データ取得
     * @returns {Array} フィルタリング・ソート済みデータ
     */
    getFilteredAndSortedAssets() {
        let assets = this.service.generateAssetSummaries();
        
        // フィルタリング
        if (this.currentFilters.search) {
            const keyword = this.currentFilters.search.toLowerCase();
            assets = assets.filter(asset => 
                asset.name.toLowerCase().includes(keyword) ||
                (asset.ticker && asset.ticker.toLowerCase().includes(keyword)) ||
                (asset.sector && asset.sector.toLowerCase().includes(keyword))
            );
        }
        
        if (this.currentFilters.type) {
            assets = assets.filter(asset => asset.type === this.currentFilters.type);
        }
        
        if (this.currentFilters.sector) {
            assets = assets.filter(asset => asset.sector === this.currentFilters.sector);
        }
        
        if (this.currentFilters.region) {
            assets = assets.filter(asset => asset.region === this.currentFilters.region);
        }
        
        // ソート
        assets.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'totalInvestment':
                    aValue = a.totalInvestment;
                    bValue = b.totalInvestment;
                    break;
                case 'gainPercent':
                    aValue = a.gainPercent;
                    bValue = b.gainPercent;
                    break;
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'sector':
                    aValue = a.sector.toLowerCase();
                    bValue = b.sector.toLowerCase();
                    break;
                case 'lastUpdated':
                    aValue = new Date(a.lastUpdated);
                    bValue = new Date(b.lastUpdated);
                    break;
                default:
                    return 0;
            }
            
            if (this.sortDirection === 'desc') {
                return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
            } else {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            }
        });
        
        return assets;
    }

    /**
     * 統計情報計算
     * @param {Array} assets - 銘柄データ
     * @returns {Object} 統計情報
     */
    calculateAssetStats(assets) {
        if (!assets || assets.length === 0) {
            return {
                totalAssets: 0,
                totalInvestment: 0,
                totalCurrentValue: 0,
                totalGainPercent: 0,
                sectorCount: 0,
                regionCount: 0
            };
        }
        
        const totalInvestment = assets.reduce((sum, asset) => sum + asset.totalInvestment, 0);
        const totalCurrentValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
        const totalGainPercent = totalInvestment > 0 ? ((totalCurrentValue - totalInvestment) / totalInvestment) * 100 : 0;
        
        const sectors = new Set(assets.map(asset => asset.sector));
        const regions = new Set(assets.map(asset => asset.region));
        
        return {
            totalAssets: assets.length,
            totalInvestment: totalInvestment,
            totalCurrentValue: totalCurrentValue,
            totalGainPercent: totalGainPercent,
            sectorCount: sectors.size,
            regionCount: regions.size
        };
    }

    /**
     * 利用可能なセクター一覧取得
     * @returns {Array} セクター一覧
     */
    getAvailableSectors() {
        const assets = this.service.generateAssetSummaries();
        const sectors = new Set(assets.map(asset => asset.sector));
        return Array.from(sectors).sort();
    }

    /**
     * 利用可能な地域一覧取得
     * @returns {Array} 地域一覧
     */
    getAvailableRegions() {
        const assets = this.service.generateAssetSummaries();
        const regions = new Set(assets.map(asset => asset.region));
        return Array.from(regions).sort();
    }

    /**
     * 資産タイプのラベル取得
     * @param {string} type - 資産タイプ
     * @returns {string} 表示ラベル
     */
    getTypeLabel(type) {
        const labels = {
            stock: '株式',
            mutualFund: '投信',
            crypto: '暗号資産'
        };
        return labels[type] || type;
    }

    // イベントハンドラー
    handleSearch(event) {
        this.currentFilters.search = event.target.value;
        this.debounceUpdate();
    }

    handleTypeFilter(event) {
        this.currentFilters.type = event.target.value;
        this.updateGrid();
    }

    handleSectorFilter(event) {
        this.currentFilters.sector = event.target.value;
        this.updateGrid();
    }

    handleRegionFilter(event) {
        this.currentFilters.region = event.target.value;
        this.updateGrid();
    }

    clearFilters() {
        this.currentFilters = { search: '', sector: '', region: '', type: '' };
        this.updateGrid();
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        
        // 編集モードインジケーターの表示制御
        if (window.databaseController && window.databaseController.view) {
            window.databaseController.view.showEditModeIndicator(this.editMode);
        }
        
        this.updateGrid();
        
        // 編集モード変更の通知
        const message = this.editMode ? '編集モードが有効になりました' : '編集モードが無効になりました';
        this.showMessage(message, this.editMode ? 'success' : 'info');
    }

    updateSort(sortBy) {
        this.sortBy = sortBy;
        this.updateGrid();
    }

    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'desc' ? 'asc' : 'desc';
        this.updateGrid();
    }

    updateSector(assetId, newSector) {
        const success = this.service.updateAssetSector(assetId, newSector);
        if (success) {
            this.showMessage('セクター情報を更新しました', 'success');
            this.updateGrid();
        } else {
            this.showMessage('セクター更新に失敗しました', 'error');
        }
    }

    removeTag(assetId, tag) {
        const success = this.service.removeCustomTag(assetId, tag);
        if (success) {
            this.showMessage(`タグ「${tag}」を削除しました`, 'success');
            this.updateGrid();
        } else {
            this.showMessage('タグ削除に失敗しました', 'error');
        }
    }

    showAssetDetail(assetId) {
        const performance = this.service.analyzeAssetPerformance(assetId);
        if (performance) {
            // 詳細分析モーダルを表示（簡易版）
            alert(`銘柄詳細分析:\n銘柄: ${performance.name}\n総合収益率: ${performance.totalReturnPercent.toFixed(2)}%\nシャープレシオ: ${performance.sharpeRatio.toFixed(2)}`);
        }
    }

    showTransactionHistory(assetId) {
        console.log(`Show transaction history for asset: ${assetId}`);
        this.showMessage('取引履歴表示機能は実装予定です', 'info');
    }

    showEditModal(assetId) {
        console.log(`Show edit modal for asset: ${assetId}`);
        this.showMessage('銘柄編集機能は実装予定です', 'info');
    }

    showTagModal(assetId) {
        const tagName = prompt('追加するタグを入力してください:');
        if (tagName && tagName.trim()) {
            const success = this.service.addCustomTag(assetId, tagName.trim());
            if (success) {
                this.showMessage(`タグ「${tagName}」を追加しました`, 'success');
                this.updateGrid();
            } else {
                this.showMessage('タグ追加に失敗しました', 'error');
            }
        }
    }

    exportAssetData() {
        try {
            const assets = this.getFilteredAndSortedAssets();
            const csvContent = this.generateAssetCsv(assets);
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `銘柄データ_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage(`${assets.length}件の銘柄データをCSVで出力しました`, 'success');
        } catch (error) {
            console.error('Asset data export failed:', error);
            this.showMessage('データ出力でエラーが発生しました', 'error');
        }
    }

    analyzeDuplicates() {
        const duplicates = this.service.detectDuplicateAssets();
        if (duplicates.length > 0) {
            let message = `${duplicates.length}件の重複可能性が検出されました:\n\n`;
            duplicates.forEach((dup, index) => {
                message += `${index + 1}. ${dup.assets[0].name} と ${dup.assets[1].name} (類似度: ${(dup.similarity * 100).toFixed(1)}%)\n`;
            });
            alert(message);
        } else {
            this.showMessage('重複する銘柄は検出されませんでした', 'info');
        }
    }

    generateAssetCsv(assets) {
        const headers = [
            '銘柄名', 'ティッカー', '種別', 'セクター', '地域', '通貨',
            '投資額', '評価額', '損益', '損益率', '取引回数', '最終更新'
        ];
        
        const rows = assets.map(asset => [
            `"${asset.name}"`,
            asset.ticker || '',
            this.getTypeLabel(asset.type),
            asset.sector || '',
            asset.region,
            asset.currency,
            Math.round(asset.totalInvestment),
            Math.round(asset.currentValue),
            Math.round(asset.unrealizedGain),
            asset.gainPercent.toFixed(2),
            asset.transactions,
            asset.lastUpdated.split('T')[0]
        ]);
        
        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }

    updateGrid() {
        const container = document.querySelector('.asset-database-container');
        if (container) {
            container.innerHTML = this.render();
        }
    }

    debounceUpdate() {
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.updateGrid();
        }, 300);
    }

    showMessage(message, type) {
        if (window.app && window.app.showMessage) {
            window.app.showMessage(message, type);
        } else {
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
    module.exports = AssetGrid;
} else if (typeof window !== 'undefined') {
    window.AssetGrid = AssetGrid;
}