# Phase 2.1 統合テスト・デバッグスクリプト

## 概要
Phase 2.1で実装したデータベース機能の統合テスト・デバッグを行うためのスクリプト集です。

## ブラウザコンソールでの実行方法

### 1. 基本動作確認

```javascript
// データベースユーティリティ初期化
const dbTest = new DatabaseTestUtility();
dbTest.enableDebugMode(true);

// 全テスト実行
const results = dbTest.runAllTests();
console.log('Phase 2.1 Test Results:', results);
```

### 2. 個別コンポーネントテスト

```javascript
// 初期化テスト
dbTest.testDatabaseInitialization();

// ナビゲーションテスト
dbTest.testDatabaseNavigation();

// サービステスト
dbTest.testDatabaseServices();

// レスポンシブテスト
dbTest.testResponsiveDesign();
```

### 3. 手動機能確認

```javascript
// データベースページへの遷移
if (window.databaseController) {
    databaseController.showDatabase();
    console.log('✅ Database page displayed');
}

// タブ切り替えテスト
['transactions', 'assets', 'history'].forEach(tab => {
    databaseController.switchTab(tab);
    console.log(`✅ Switched to ${tab} tab`);
});

// 編集モード切り替え（銘柄情報タブで）
if (window.assetGrid) {
    assetGrid.toggleEditMode();
    console.log('✅ Edit mode toggled');
}
```

### 4. データ生成・確認

```javascript
// 取引データ取得
if (window.databaseController?.transactionDatabaseService) {
    const transactions = databaseController.transactionDatabaseService.getAllTransactions();
    console.log('Transaction data:', transactions);
}

// 銘柄データ取得
if (window.databaseController?.assetDatabaseService) {
    const assets = databaseController.assetDatabaseService.generateAssetSummaries();
    console.log('Asset data:', assets);
    
    const sectors = databaseController.assetDatabaseService.getSectorAllocation();
    console.log('Sector allocation:', sectors);
}
```

### 5. エラー状況の確認

```javascript
// コンポーネント状態確認
console.log('DatabaseController:', window.databaseController);
console.log('DatabaseView:', window.databaseController?.view);
console.log('TransactionTable:', window.transactionTable);
console.log('AssetGrid:', window.assetGrid);

// DOM要素確認
console.log('Database Page:', document.getElementById('databasePage'));
console.log('Tab Contents:', {
    transactions: document.getElementById('transactionsTab'),
    assets: document.getElementById('assetsTab'),
    history: document.getElementById('historyTab')
});
```

### 6. CSS・レスポンシブ確認

```javascript
// レスポンシブクラス確認
const databasePage = document.getElementById('databasePage');
if (databasePage) {
    console.log('Page computed style:', window.getComputedStyle(databasePage));
    
    // 画面幅による CSS 適用確認
    console.log('Current viewport:', {
        width: window.innerWidth,
        height: window.innerHeight
    });
}
```

## 期待される結果

### 成功時の出力例
```
📊 Database Test Debug Mode: ENABLED
🔧 Testing Database Initialization...
✅ Database Initialization Test: success
🧭 Testing Database Navigation...
✅ Database Navigation Test: success
🔧 Testing Database Services...
✅ Database Services Test: success
📱 Testing Responsive Design...
✅ Responsive Design Test: success
🎉 All Database Tests Passed Successfully!
```

### 部分成功時の対処

1. **Initialization が partial の場合**
   - コンポーネントが一部未初期化
   - Router.js でのDatabaseController登録を確認

2. **Navigation が failed の場合**
   - DOM要素の生成に問題
   - DatabaseView.js のrender()メソッドを確認

3. **Services が error の場合**
   - データ取得に問題
   - DataStoreManager の動作を確認

## デバッグ用コマンド

### 強制的なデータベース初期化
```javascript
if (window.router) {
    // ルーターがDatabaseControllerを登録しているか確認
    console.log('Router routes:', window.router.routes);
    
    // 強制初期化
    window.databaseController = new DatabaseController(window.dataStoreManager);
    window.databaseController.initialize();
}
```

### コンポーネント状態のリセット
```javascript
// ページをクリーンアップしてから再表示
const databaseContainer = document.getElementById('databaseContainer');
if (databaseContainer) {
    databaseContainer.remove();
}
databaseController.showDatabase();
```

### CSS読み込み確認
```javascript
// DatabaseView.css の読み込み確認
const stylesheets = Array.from(document.styleSheets);
const databaseCSS = stylesheets.find(sheet => 
    sheet.href && sheet.href.includes('DatabaseView.css')
);
console.log('DatabaseView.css loaded:', !!databaseCSS);
```

## 既知の問題と対処法

### 1. タブが表示されない
- **原因**: CSS読み込み不完了
- **対処**: ページリロード後に再テスト

### 2. データが空で表示される
- **原因**: DataStoreManager にテストデータが不足
- **対処**: 既存の資産追加機能でデータを追加

### 3. 編集モードが機能しない
- **原因**: AssetGrid の初期化不完了
- **対処**: 銘柄情報タブに切り替え後に編集モード切り替え

## Phase 2.1 完了確認チェックリスト

- [ ] データベースページが正常に表示される
- [ ] 3つのタブ（取引履歴・銘柄情報・編集履歴）が切り替え可能
- [ ] 取引履歴テーブルが表示される（データがある場合）
- [ ] 銘柄情報グリッドが表示される（データがある場合）
- [ ] 編集モードの切り替えが機能する
- [ ] レスポンシブデザインが適用される
- [ ] エラー処理が適切に動作する
- [ ] 統合テストが success または partial で完了する

すべてのチェックが完了すれば、Phase 2.1の実装は成功です。