# UI層優先実装ガイド - 段階的MVP

## 🎯 実装方針

**「見た目から動作確認」アプローチ**
- まずUIが表示できることを確認
- Controller ↔ View の連携を体感
- ダミーデータで動作フローを理解
- 後からデータ層を段階的に追加

---

## 📁 Step 1: ディレクトリ構造作成

### 完成形構造
```
investment-dashboard-v2/
├── public/                 
│   ├── index.html          # エントリーポイント
│   ├── css/
│   │   ├── global.css      # 共通スタイル
│   │   └── components.css  # UIコンポーネント用スタイル
│   └── js/
│       └── app.js          # 初期化スクリプト
└── src/
    ├── ui/                 # Presentation Layer
    │   ├── components/     # UIコンポーネント
    │   ├── controllers/    # ページ制御
    │   └── views/          # HTML要素操作・描画
    ├── business/           # Business Layer（後で追加）
    ├── data/               # Data Layer（後で追加）
    └── infrastructure/     # Infrastructure Layer（後で追加）
```

### 作成コマンド
```bash
cd investment-dashboard-v2

# ディレクトリ作成
mkdir -p public/css public/js
mkdir -p src/ui/{components,controllers,views}
mkdir -p src/{business,data,infrastructure}

# 空のファイル作成（後で編集用）
touch public/css/global.css
touch public/css/components.css
touch public/js/app.js
touch src/ui/views/DashboardView.js
touch src/ui/controllers/DashboardController.js
```

---

## 📄 Step 2: HTML・CSS基盤作成

### `public/index.html` - エントリーポイント
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投資ダッシュボード v2 - UI優先MVP</title>
    
    <!-- CSS読み込み -->
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/components.css">
    
    <!-- 外部ライブラリ（Chart.js、Lucide Icons） -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
</head>
<body>
    <div class="app-container">
        <!-- ヘッダー -->
        <header class="app-header">
            <h1 class="app-title">💰 投資ダッシュボード v2</h1>
            <p class="app-subtitle">UI層優先実装 - MVP</p>
        </header>

        <!-- メインコンテンツエリア -->
        <main class="main-content" id="mainContent">
            <!-- ここにDashboardViewの内容が動的に挿入される -->
            
            <!-- 初期表示（JavaScript読み込み前） -->
            <div class="loading-state">
                <p>📊 ダッシュボードを読み込み中...</p>
            </div>
        </main>

        <!-- デバッグ情報（開発中のみ表示） -->
        <footer class="debug-footer">
            <p>🔧 開発モード: UI層優先実装</p>
            <p id="debugInfo">JavaScript未読み込み</p>
        </footer>
    </div>

    <!-- JavaScript読み込み（ES6 modules） -->
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

### `public/css/global.css` - 共通スタイル
```css
/* CSS変数（v0のカラーパレット活用） */
:root {
    /* カラーパレット - シアン系 + アンバー系 */
    --primary: #164e63;      /* シアン系メイン */
    --accent: #d97706;       /* アンバー系アクセント */
    --background: #ffffff;   /* 背景 */
    --surface: #f8fafc;      /* カード背景 */
    --text-primary: #1e293b; /* メインテキスト */
    --text-secondary: #64748b; /* セカンダリテキスト */
    --success: #10b981;      /* 成功色 */
    --error: #ef4444;        /* エラー色 */
    --border: #e2e8f0;       /* ボーダー */
    
    /* スペーシングシステム */
    --space-xs: 0.25rem;     /* 4px */
    --space-sm: 0.5rem;      /* 8px */
    --space-md: 1rem;        /* 16px */
    --space-lg: 1.5rem;      /* 24px */
    --space-xl: 2rem;        /* 32px */
    --space-2xl: 3rem;       /* 48px */
    
    /* ボーダーラディウス */
    --radius-sm: 0.375rem;   /* 6px */
    --radius-md: 0.5rem;     /* 8px */
    --radius-lg: 0.75rem;    /* 12px */
    
    /* シャドウ */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    
    /* フォントファミリー */
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* リセット・基本スタイル */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: var(--font-sans);
    line-height: 1.6;
    color: var(--text-primary);
    background-color: var(--background);
}

.app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.app-header {
    background-color: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: var(--space-lg) var(--space-xl);
    text-align: center;
}

.app-title {
    font-size: 1.875rem;   /* 30px */
    font-weight: 700;
    color: var(--primary);
    margin-bottom: var(--space-sm);
}

.app-subtitle {
    color: var(--text-secondary);
    font-size: 0.875rem;   /* 14px */
}

.main-content {
    flex: 1;
    padding: var(--space-xl);
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

.loading-state {
    text-align: center;
    padding: var(--space-2xl);
    color: var(--text-secondary);
}

.debug-footer {
    background-color: var(--surface);
    border-top: 1px solid var(--border);
    padding: var(--space-md);
    text-align: center;
    font-size: 0.75rem;    /* 12px */
    color: var(--text-secondary);
}

/* レスポンシブ */
@media (max-width: 768px) {
    .main-content {
        padding: var(--space-md);
    }
    
    .app-title {
        font-size: 1.5rem;
    }
}
```

### `public/css/components.css` - UIコンポーネント用
```css
/* ダッシュボード用コンポーネント */

/* サマリーカード */
.summary-section {
    margin-bottom: var(--space-xl);
}

.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-lg);
}

.summary-card {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;
}

.summary-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.card-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-sm);
}

.card-value {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: var(--space-xs);
}

.card-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
}

/* アセット一覧 */
.asset-section {
    margin-bottom: var(--space-xl);
}

.section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-sm);
    border-bottom: 2px solid var(--accent);
}

.asset-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.asset-item {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
}

.asset-item:hover {
    background-color: white;
    box-shadow: var(--shadow-sm);
}

.asset-name {
    font-weight: 500;
    color: var(--text-primary);
}

.asset-amount {
    font-weight: 600;
    color: var(--accent);
    font-size: 1.125rem;
}

/* ボタン */
.btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.btn-primary {
    background-color: var(--primary);
    color: white;
}

.btn-primary:hover {
    background-color: color-mix(in srgb, var(--primary), black 10%);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

/* 空状態 */
.empty-state {
    text-align: center;
    padding: var(--space-2xl);
    color: var(--text-secondary);
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: var(--space-md);
    opacity: 0.5;
}

/* レスポンシブ */
@media (max-width: 768px) {
    .summary-cards {
        grid-template-columns: 1fr;
    }
    
    .asset-item {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
    }
}
```

---

## 🎮 Step 3: View層実装

### `src/ui/views/DashboardView.js` - 画面描画専用
```javascript
/**
 * DashboardView - ダッシュボード画面の描画を担当
 * 責任: DOM要素の作成・更新のみ（データの取得やロジックは含まない）
 */
class DashboardView {
    constructor() {
        this.container = document.getElementById('mainContent');
        console.log('📱 DashboardView initialized');
    }

    /**
     * ダッシュボード全体を描画する
     * @param {Object} data - 表示用データ
     */
    render(data) {
        console.log('🎨 DashboardView.render() called with data:', data);
        
        if (!this.container) {
            console.error('❌ Main content container not found');
            return;
        }

        // HTMLテンプレートを作成
        const template = this.createTemplate(data);
        
        // DOM に挿入
        this.container.innerHTML = template;
        
        console.log('✅ Dashboard rendered successfully');
    }

    /**
     * HTMLテンプレートを作成
     * @param {Object} data - 表示用データ
     * @returns {string} - HTMLテンプレート
     */
    createTemplate(data) {
        return `
            <!-- サマリーセクション -->
            <section class="summary-section">
                <div class="summary-cards">
                    ${this.createSummaryCard('総投資額', data.totalAmount, '円')}
                    ${this.createSummaryCard('銘柄数', data.assetCount, '件')}
                    ${this.createSummaryCard('月額積立', data.monthlyAmount, '円')}
                </div>
            </section>

            <!-- 投資一覧セクション -->
            <section class="asset-section">
                <h2 class="section-title">💰 保有投資信託</h2>
                <div class="asset-list">
                    ${this.createAssetList(data.assets)}
                </div>
            </section>

            <!-- アクションセクション -->
            <section class="action-section">
                <button class="btn btn-primary" id="addAssetBtn">
                    ➕ 投資信託を追加
                </button>
            </section>
        `;
    }

    /**
     * サマリーカードのHTMLを作成
     */
    createSummaryCard(title, value, unit) {
        const formattedValue = typeof value === 'number' ? 
            value.toLocaleString('ja-JP') : value;
        
        return `
            <div class="summary-card">
                <div class="card-title">${title}</div>
                <div class="card-value">${formattedValue}${unit}</div>
                <div class="card-description">最新の状況</div>
            </div>
        `;
    }

    /**
     * アセット一覧のHTMLを作成
     */
    createAssetList(assets) {
        if (!assets || assets.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>投資信託が登録されていません</p>
                    <p>上の「追加」ボタンから登録してみましょう</p>
                </div>
            `;
        }

        return assets.map(asset => `
            <div class="asset-item">
                <div class="asset-name">${asset.name}</div>
                <div class="asset-amount">¥${asset.amount.toLocaleString('ja-JP')}</div>
            </div>
        `).join('');
    }

    /**
     * エラー表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="error-state">
                <h2>⚠️ エラーが発生しました</h2>
                <p>${message}</p>
            </div>
        `;
        console.error('❌ DashboardView error:', message);
    }

    /**
     * ローディング表示
     */
    showLoading() {
        this.container.innerHTML = `
            <div class="loading-state">
                <p>📊 データを読み込み中...</p>
            </div>
        `;
        console.log('⏳ DashboardView loading...');
    }
}

export { DashboardView };
```

---

## 🎮 Step 4: Controller層実装

### `src/ui/controllers/DashboardController.js` - 制御ロジック
```javascript
import { DashboardView } from '../views/DashboardView.js';

/**
 * DashboardController - ダッシュボード画面の制御を担当
 * 責任: ユーザー操作の処理、データとViewの仲介
 */
class DashboardController {
    constructor() {
        this.view = new DashboardView();
        console.log('🎮 DashboardController initialized');
    }

    /**
     * ダッシュボードを初期化・表示
     */
    async initialize() {
        console.log('🚀 DashboardController.initialize() called');
        
        try {
            // ローディング表示
            this.view.showLoading();
            
            // ダミーデータを取得（後でRepositoryに置き換え）
            const data = await this.getDummyData();
            
            // ビューに表示
            this.view.render(data);
            
            // イベントリスナーを設定
            this.bindEvents();
            
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.view.showError('ダッシュボードの初期化に失敗しました');
        }
    }

    /**
     * ダミーデータを取得（開発・テスト用）
     * 後でAssetRepository.getAllAssets()に置き換え
     */
    async getDummyData() {
        console.log('🎭 Getting dummy data...');
        
        // 非同期処理をシミュレート（実際のAPI呼び出しっぽく）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const dummyAssets = [
            { id: '1', name: 'eMAXIS Slim 全世界株式', amount: 450000 },
            { id: '2', name: '楽天・全米株式インデックス', amount: 320000 },
            { id: '3', name: 'SBI・先進国株式インデックス', amount: 280000 }
        ];
        
        const totalAmount = dummyAssets.reduce((sum, asset) => sum + asset.amount, 0);
        
        return {
            assets: dummyAssets,
            totalAmount: totalAmount,
            assetCount: dummyAssets.length,
            monthlyAmount: 85000  // 月額積立（ダミー）
        };
    }

    /**
     * イベントリスナーを設定
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
     */
    handleAddAsset() {
        console.log('➕ Add asset button clicked');
        
        // 仮の処理（後でモーダル表示やフォーム処理に置き換え）
        alert('投資信託追加機能は次のフェーズで実装予定です！\n\n現在はUI層の動作確認中です。');
        
        // デバッグ用：ダミーデータを追加して再描画テスト
        this.addDummyAssetForTesting();
    }

    /**
     * テスト用：ダミーデータ追加（動作確認用）
     */
    async addDummyAssetForTesting() {
        console.log('🧪 Adding dummy asset for testing...');
        
        const currentData = await this.getDummyData();
        
        // ダミーアセットを追加
        const newAsset = {
            id: Date.now().toString(),
            name: `テスト投資信託 ${new Date().getSeconds()}`,
            amount: Math.floor(Math.random() * 500000) + 100000
        };
        
        currentData.assets.push(newAsset);
        currentData.assetCount = currentData.assets.length;
        currentData.totalAmount = currentData.assets.reduce((sum, asset) => sum + asset.amount, 0);
        
        // 再描画
        this.view.render(currentData);
        this.bindEvents();  // イベントリスナーを再設定
        
        console.log('🎉 Dummy asset added and view updated');
    }

    /**
     * クリーンアップ処理
     */
    destroy() {
        console.log('🧹 DashboardController cleanup');
        // イベントリスナーの削除等（必要に応じて）
    }
}

export { DashboardController };
```

---

## ⚡ Step 5: アプリケーション初期化

### `public/js/app.js` - エントリーポイント
```javascript
import { DashboardController } from '../src/ui/controllers/DashboardController.js';

/**
 * アプリケーション初期化
 */
class App {
    constructor() {
        console.log('🚀 Investment Dashboard v2 - UI First Implementation');
        this.dashboardController = null;
    }

    /**
     * アプリケーション開始
     */
    async start() {
        try {
            console.log('📱 Starting app...');
            
            // デバッグ情報更新
            this.updateDebugInfo('UI層初期化中...');
            
            // DashboardController初期化
            this.dashboardController = new DashboardController();
            await this.dashboardController.initialize();
            
            // デバッグ情報更新
            this.updateDebugInfo('UI層実装完了 ✅');
            
            console.log('🎉 App started successfully!');
            
        } catch (error) {
            console.error('❌ App startup failed:', error);
            this.updateDebugInfo(`エラー: ${error.message}`);
        }
    }

    /**
     * デバッグ情報を更新
     */
    updateDebugInfo(message) {
        const debugElement = document.getElementById('debugInfo');
        if (debugElement) {
            debugElement.textContent = message;
        }
    }
}

// DOM読み込み完了後にアプリケーション開始
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.start();
    
    // グローバルにアクセス可能にする（デバッグ用）
    window.app = app;
});
```

---

## ✅ 動作確認チェックリスト

### Step 1: 基本表示確認
- [ ] `http://localhost:8003/` でページが表示される
- [ ] ヘッダー・フッターが表示される
- [ ] CSS スタイルが適用されている

### Step 2: JavaScript動作確認
- [ ] ブラウザ開発者ツールでエラーが出ていない
- [ ] コンソールに初期化ログが表示される
- [ ] 「投資信託を追加」ボタンが表示される

### Step 3: UI動作確認
- [ ] ダミーデータが3件表示される
- [ ] 合計金額が正しく表示される
- [ ] 「追加」ボタンを押すとアラートが表示される
- [ ] 「追加」ボタンを押すとダミーデータが追加される

### Step 4: レスポンシブ確認
- [ ] モバイルサイズでも正しく表示される
- [ ] カードレイアウトが適切に調整される

---

## 🎯 完成後の次のステップ

### Phase 2: データ層統合
1. LocalStorageAdapter追加
2. AssetRepository追加
3. ダミーデータを実データに置き換え

### Phase 3: 機能拡張
1. フォーム実装（投資信託追加）
2. 編集・削除機能
3. バリデーション強化

---

**このStep 1-5が完了すれば、UI層の基本的な流れを体感できます！**  
**まずはクロードコードでこの構造を作成してみてください 🚀**