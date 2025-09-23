# control-actions内データベースクリア機能 実装計画書

**作成日**: 2025-09-23  
**対象**: TransactionTable.js の control-actions エリア内  
**目的**: CSV出力・更新ボタンと同列のデータベースクリアボタン実装  

## 1. 実装概要

### 1.1 実装方針
- **配置場所**: `class="control-actions"`内の既存ボタンと横並び
- **既存メソッド活用**: `DataStoreManager.clearAllData()`を直接呼び出し
- **ラッパーメソッド**: 不要（直接呼び出しで実装）
- **安全性**: 3段階確認モーダルで誤操作防止

### 1.2 実装対象ファイル
1. **TransactionTable.js** - ボタン追加とメソッド実装
2. **CSS** - .btn-clear-dbスタイル追加（上下マージン調整含む）

## 2. 詳細実装手順

### 2.1 Phase 1: ボタンの追加

#### TransactionTable.js - renderControls()メソッド修正

**修正箇所**: `src/ui/components/TransactionTable.js` 40-62行目

```javascript
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
                <!-- 新規追加: データベースクリアボタン -->
                <button onclick="transactionTable.clearAllDatabase()" class="btn-clear-db">
                    🗑️ データクリア
                </button>
            </div>
        </div>
    `;
}
```

### 2.2 Phase 2: メソッド実装

#### TransactionTable.js - clearAllDatabase()メソッド追加

**追加位置**: `src/ui/components/TransactionTable.js` 最後尾（495行目付近）

```javascript
/**
 * データベース全削除機能
 * @description 3段階確認プロセスによる安全なデータ削除
 */
clearAllDatabase() {
    console.log('🗑️ データベースクリア開始');
    
    // DataStoreManagerインスタンスの取得
    const dataManager = window.dataStoreManager || new DataStoreManager();
    
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
    
    // 第3段階: 最終確認
    const confirmText = prompt(`🔴 最終確認 - データ完全削除\n\n本当にすべてのデータを削除しますか？\nこの操作は取り消しできません。\n\n削除を実行するには「DELETE」と入力してください:`);
    
    if (confirmText !== 'DELETE') {
        console.log('❌ データベースクリア中止 - 最終確認');
        this.showMessage('データクリアがキャンセルされました', 'info');
        return;
    }
    
    // データ削除実行
    try {
        const success = dataManager.clearAllData();
        
        if (success) {
            this.showMessage('✅ 全データの削除が完了しました', 'success');
            console.log('✅ データベースクリア完了');
            
            // ページリフレッシュ
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            this.showMessage('❌ データ削除に失敗しました', 'error');
            console.error('❌ データベースクリア失敗');
        }
    } catch (error) {
        console.error('❌ データベースクリアエラー:', error);
        this.showMessage('❌ データ削除中にエラーが発生しました', 'error');
    }
}

/**
 * データベース統計情報取得
 * @param {DataStoreManager} dataManager - データマネージャー
 * @returns {Object} 統計情報
 */
getDatabaseStats(dataManager) {
    try {
        const mutualFunds = dataManager.getMutualFunds();
        const stocks = dataManager.getStocks();
        const cryptos = dataManager.getCryptoAssets();
        
        return {
            mutualFunds: mutualFunds.length,
            stocks: stocks.length,
            cryptos: cryptos.length,
            total: mutualFunds.length + stocks.length + cryptos.length
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
```

### 2.3 Phase 3: スタイル追加

#### CSS - database-controlsマージン調整とボタンスタイル

**対象ファイル**: `public/styles.css` または該当CSSファイル

```css
/* database-controlsの上下マージン調整 */
.database-controls {
    margin-top: 1.5rem;    /* 上側マージン追加 */
    margin-bottom: 1.5rem; /* 既存の下側マージンと同サイズ */
}

/* データクリアボタンのスタイル */
.btn-clear-db {
    background: linear-gradient(135deg, #dc3545, #c82333);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.btn-clear-db:hover {
    background: linear-gradient(135deg, #c82333, #bd2130);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

.btn-clear-db:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(220, 53, 69, 0.2);
}

/* control-actions内のボタン間隔調整 */
.control-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}
```

## 3. 実装順序

### Phase 1: HTML構造変更
1. TransactionTable.js の renderControls() メソッドにボタン追加

### Phase 2: JavaScript機能実装
1. clearAllDatabase() メソッド実装
2. getDatabaseStats() ヘルパーメソッド実装

### Phase 3: スタイル調整
1. database-controls の上側マージン追加
2. btn-clear-db スタイル定義
3. control-actions のレイアウト調整

## 4. 安全性確保

### 4.1 3段階確認プロセス
1. **第1段階**: 基本警告 - confirm()
2. **第2段階**: データプレビュー - confirm()
3. **第3段階**: テキスト入力確認 - prompt('DELETE')

### 4.2 エラーハンドリング
- DataStoreManager取得エラー
- clearAllData()実行エラー
- 統計情報取得エラー

### 4.3 ユーザーフィードバック
- 処理中メッセージ表示
- 完了/失敗通知
- 2秒後の自動ページリフレッシュ

## 5. テスト項目

### 5.1 機能テスト
- [ ] ボタン表示確認
- [ ] 3段階確認の動作確認
- [ ] データ削除の実行確認
- [ ] ページリフレッシュ確認

### 5.2 安全性テスト
- [ ] キャンセル時の動作確認
- [ ] 間違ったテキスト入力時の動作
- [ ] エラー時の適切な表示

### 5.3 UI/UXテスト
- [ ] ボタンのレイアウト確認
- [ ] ホバー効果確認
- [ ] マージンの適切な表示確認

---

**実装完了条件**: 3段階確認プロセスによる安全なデータ削除機能が、control-actions内に適切に配置され、正常に動作すること。