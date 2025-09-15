# Phase 1.2 ver1 Services統合実装方針

**作成日**: 2025年9月15日  
**対象フェーズ**: Phase 1.1 ナビゲーション完了後の ver1 Services統合  
**実装期間**: Week 1-2 (Phase 1.1完了後)

## 📋 統合対象 ver1 Services 概要

### 🎯 統合する4つのコアサービス

#### 1. DataManager.js
**機能**: 拡張版LocalStorage管理とCRUD操作  
**重要性**: 🔥 **最高** - 既存のAssetRepositoryとの統合が必要  
**データ型**: 投資信託、個別株、仮想通貨、履歴管理  

**主要機能**:
- 高度なバリデーション（金額・セクター配分・日付など）
- マイグレーション対応（旧データ形式からの移行）
- 詳細財務情報管理（含み損益、平均単価、保有口数）
- エラーハンドリング強化
- セクター・国別配分管理
- 簡易履歴記録システム

#### 2. RakutenCsvParser.js  
**機能**: 楽天証券CSV（JP株・US株・投資信託）の完全対応パーサー  
**重要性**: 🔥 **最高** - 新規CSV取り込み機能の核  
**対応形式**: 日本株、米国株、投資信託の3種類のCSV  

**主要機能**:
- Shift-JIS正常読み込み（文字化け対策）
- 28列（JP）/18列（US）/14列（投信）の正確な列マッピング
- 売買区分の正規化（買/売 → buy/sell）
- 通貨・為替レート対応（円決済・USドル決済）
- エラーハンドリングと不正データ検出
- ファイル形式自動判定

#### 3. SectorManager.js
**機能**: 東証33業種・GICS分類によるセクター管理  
**重要性**: 🔥 **高** - セクター分析・分散投資分析用  
**対応範囲**: 日本株（東証33業種）、米国株（GICS）、ETF

**主要機能**:
- 380+銘柄のセクターマスターデータ
- カスタムセクター設定（ユーザー定義）
- HHI指数による集中リスク分析
- セクター配分・地域×セクターマトリックス
- ポートフォリオ分散度分析

#### 4. PortfolioAggregator.js
**機能**: CSV取引履歴の銘柄別集約・ポートフォリオ統計  
**重要性**: 🔥 **高** - 楽天CSV連携の集約処理  
**集約範囲**: 同一銘柄の複数取引を統合

**主要機能**:
- 銘柄別集約（同一ticker/codeの取引統合）
- 売買相殺（買付 - 売却 = 純保有）
- 平均取得単価計算
- 実保有銘柄抽出（売却済み除外）
- ポートフォリオサマリー生成

## 🏗️ 統合アーキテクチャ戦略

### アーキテクチャ統合方針

```
現在のv2アーキテクチャ
├── src/business/models/
│   ├── AssetEntity.js      ←→ DataManager統合
│   └── AssetCalculator.js  ←→ PortfolioAggregator統合
├── src/data/repositories/
│   └── AssetRepository.js  ←→ DataManager統合
└── src/data/adapters/
    └── LocalStorageAdapter.js ←→ 強化版DataManager統合

新規追加 ver1 Services
├── src/services/           🆕 新規ディレクトリ
│   ├── DataManager.js      🆕 強化版LocalStorage管理
│   ├── RakutenCsvParser.js 🆕 CSV取り込み機能
│   ├── SectorManager.js    🆕 セクター分析
│   └── PortfolioAggregator.js 🆕 ポートフォリオ集約
└── src/ui/controllers/     🆕 新規機能追加
    └── CsvImportController.js 🆕 CSV取り込みUI制御
```

### 統合レベル分類

#### **Level 1: Drop-in統合** (DataManager, SectorManager)
- 既存コードを最小変更で統合
- 既存機能を拡張・強化する方式
- リスク: **低**

#### **Level 2: 新機能追加** (RakutenCsvParser, PortfolioAggregator)  
- 完全に新しい機能として追加
- 既存機能に影響を与えない独立実装
- リスク: **中**

#### **Level 3: UI統合** (CsvImportController)
- 新規ナビゲーションタブの追加
- Router.jsへの新ルート登録
- リスク: **低**

## 📅 段階的実装プラン

### **Week 1: コアサービス統合**

#### **Day 1-2: DataManager統合** (Level 1)
**目標**: 既存AssetRepositoryをDataManager強化版に置き換え

**実装ステップ**:
1. `/src/services/DataManager.js` 作成（ver1から移植）
2. AssetRepository.js更新 → DataManager.jsメソッド使用
3. AssetEntity.js拡張 → ver1財務情報フィールド追加
4. 既存データのマイグレーション確認
5. バリデーション強化テスト

**成果物**:
- DataManager.js (1932行 → v2統合版)
- AssetRepository.js更新版
- AssetEntity.js拡張版

#### **Day 3-4: SectorManager統合** (Level 1)  
**目標**: セクター分析機能をAssetEntityに統合

**実装ステップ**:
1. `/src/services/SectorManager.js` 作成（ver1から移植）
2. AssetEntity.js → セクター付与メソッド追加
3. AssetCalculator.js → セクター集約計算追加
4. 380+銘柄のマスターデータ確認
5. カスタムセクター設定機能テスト

**成果物**:
- SectorManager.js (425行 → v2統合版)
- AssetEntity.js セクター対応版
- AssetCalculator.js セクター分析機能

#### **Day 5: 統合テスト**
**目標**: Week 1統合機能の動作確認

**テスト項目**:
- DataManager → 既存資産データの読み込み確認
- SectorManager → セクター自動付与確認
- AssetRepository → CRUD操作の正常動作確認
- 既存ナビゲーション → 既存機能の非破壊確認

### **Week 2: CSV取り込み機能実装**

#### **Day 1-2: CSV Parser統合** (Level 2)
**目標**: RakutenCsvParser.jsの完全統合

**実装ステップ**:
1. `/src/services/RakutenCsvParser.js` 作成（ver1から移植）
2. Papa Parse CDN追加（HTML）
3. CSV形式判定・パース機能確認
4. 3種類CSV（JP株・US株・投信）の動作確認
5. Shift-JIS読み込み・日本語処理確認

**成果物**:
- RakutenCsvParser.js (522行 → v2統合版)
- Papa Parse統合
- CSV形式自動判定機能

#### **Day 3-4: ポートフォリオ集約統合** (Level 2)
**目標**: PortfolioAggregator.jsによる銘柄別統合

**実装ステップ**:
1. `/src/services/PortfolioAggregator.js` 作成（ver1から移植）
2. DataManager → CSV取り込み連携機能追加
3. 銘柄別集約 → 同一ticker/codeの取引統合
4. 売買相殺 → 純保有数量計算
5. 実保有銘柄フィルタリング

**成果物**:
- PortfolioAggregator.js (369行 → v2統合版)
- DataManager CSV連携機能
- 銘柄別統合表示機能

#### **Day 5: CSV取り込みUI実装** (Level 3)
**目標**: CSV取り込み画面の新規追加

**実装ステップ**:
1. CsvImportView.js 作成（新規）
2. CsvImportController.js 作成（新規）
3. Router.js → 'import-csv' ルート追加
4. ナビゲーション → CSV取り込みタブ追加
5. ドラッグ&ドロップUI実装

**成果物**:
- CsvImportView.js (新規作成)
- CsvImportController.js (新規作成)
- Router.js 3タブ対応版
- navigation.css更新

## 🔧 技術実装詳細

### 必要なライブラリ追加

```html
<!-- public/index.html に追加 -->
<script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
```

### Router.js 拡張（3タブ対応）

```javascript
// src/ui/Router.js 更新
this.registerRoute('dashboard', DashboardController, {
    title: 'ダッシュボード', icon: 'bar-chart-2'
});
this.registerRoute('add-asset', AssetFormController, {
    title: '資産追加', icon: 'plus-circle'
});
this.registerRoute('import-csv', CsvImportController, {
    title: 'CSV取り込み', icon: 'upload'
});
```

### DataManager統合パターン

```javascript
// src/data/repositories/AssetRepository.js 更新例
import { DataManager } from '../../services/DataManager.js';

class AssetRepository {
    constructor() {
        this.dataManager = new DataManager();
    }
    
    // 既存メソッドをDataManagerに委任
    async getAllAssets() {
        return this.dataManager.getStocks(); // 強化版機能使用
    }
    
    async saveAsset(asset) {
        return this.dataManager.addStock(asset); // バリデーション強化版
    }
}
```

### SectorManager統合パターン

```javascript
// src/business/models/AssetEntity.js 拡張例
import { SectorManager } from '../../services/SectorManager.js';

class AssetEntity {
    // 既存機能 + セクター自動付与
    static createFromForm(formData) {
        const assetEntity = new AssetEntity(formData);
        
        // セクター情報を自動付与
        const sectorManager = new SectorManager();
        const enrichedAsset = sectorManager.assignSectorToStock(assetEntity);
        
        return enrichedAsset;
    }
}
```

## 📊 CSV取り込み機能設計

### UI/UX フロー

```
1. ナビゲーション「CSV取り込み」タブクリック
   ↓
2. CSV取り込み画面表示
   - ドラッグ&ドロップエリア
   - ファイル形式選択（JP株/US株/投信）
   - プレビューエリア
   ↓
3. CSVファイル選択・アップロード
   - ファイル検証
   - エンコーディング判定（Shift-JIS優先）
   - 形式判定（列数・ヘッダー確認）
   ↓
4. データプレビュー表示
   - パース結果確認
   - エラー行表示
   - 取り込み対象件数表示
   ↓
5. インポート実行
   - 進捗表示
   - 銘柄別集約処理
   - セクター自動付与
   ↓
6. 結果表示・ダッシュボード更新
   - 成功件数表示
   - エラー詳細表示
   - ダッシュボードに反映
```

### データフロー設計

```
CSVファイル
    ↓ RakutenCsvParser.js
パースされた取引データ
    ↓ DataManager.addStock()
バリデーション済み個別株データ
    ↓ SectorManager.assignSectorToStock()
セクター情報付き資産データ
    ↓ PortfolioAggregator.aggregateStocksByTicker()
銘柄別集約済みポートフォリオ
    ↓ LocalStorage保存
ダッシュボード更新
```

## 🔍 必要なver1ファイル確認事項

現在確認済み：
- ✅ **dataManager.js** (1932行) - 完全確認済み
- ✅ **rakutenCsvParser.js** (522行) - 完全確認済み  
- ✅ **sectorManager.js** (425行) - 完全確認済み
- ✅ **portfolioAggregator.js** (369行) - 完全確認済み

### 追加で必要な可能性があるファイル

1. **Papa Parse設定ファイル** 
   - CSVパース設定
   - エンコーディング設定

2. **セクターマスターデータファイル**
   - 追加の銘柄コード→セクター対応表
   - ETF・REIT分類データ

3. **CSV取り込みサンプルファイル**
   - 楽天証券CSV形式の実際のサンプル
   - テスト用データセット

4. **エラーハンドリング設定**
   - CSV取り込みエラーメッセージ定義
   - バリデーションルール詳細

## ⚠️ リスク評価と対策

### **高リスク**: DataManager統合
**リスク**: 既存データ形式との非互換  
**対策**: 
- マイグレーション機能の実装
- 既存データのバックアップ機能
- Rollback機能の準備

### **中リスク**: CSV取り込み機能
**リスク**: 楽天証券CSVフォーマット変更  
**対策**:
- 柔軟な列名検索機能
- CSV形式バージョン管理
- エラー時の手動補正機能

### **低リスク**: UI統合
**リスク**: ナビゲーション複雑化  
**対策**:
- レスポンシブデザイン対応
- アクセシビリティ確保
- シンプルなUX設計

## 🎯 成功指標

### Week 1完了時
- ✅ DataManager統合完了（既存機能正常動作）
- ✅ SectorManager統合完了（セクター自動付与動作）
- ✅ 既存ナビゲーション機能保持
- ✅ データ整合性確保

### Week 2完了時  
- ✅ CSV取り込み機能完全動作
- ✅ 3種類CSV（JP/US/投信）対応
- ✅ 銘柄別集約表示機能
- ✅ ダッシュボード統合更新

### 全体成功指標
- ✅ ver1の高度機能をv2アーキテクチャに完全統合
- ✅ CSV取り込み→集約→セクター分析の完全なワークフロー実現
- ✅ 楽天証券データを活用した実用的な投資管理ツール完成

## 🚀 Phase 1.2完了後の展望

### **Phase 2.1**: セクター分析ダッシュボード
- セクター配分円グラフ
- 業種別パフォーマンス分析
- 分散投資レコメンデーション

### **Phase 2.2**: 高度なポートフォリオ分析
- リスク分析（ベータ値・シャープレシオ）
- 相関分析
- 最適化提案

### **Phase 2.3**: レポート機能
- 月次・年次レポート自動生成
- 税務申告用データ出力
- パフォーマンストラッキング

---

## 📝 実装開始準備

**次回作業**: Week 1 Day 1-2のDataManager統合から開始

**必要事項確認**:
1. ✅ 4つのver1 servicesファイル確認完了
2. ⏳ Papa Parse CDNの動作確認
3. ⏳ Shift-JIS読み込みテスト
4. ⏳ 既存データのバックアップ

**実装推奨順序**:
1. DataManager.js → AssetRepository.js統合
2. SectorManager.js → AssetEntity.js統合  
3. RakutenCsvParser.js → 新規機能追加
4. PortfolioAggregator.js → CSV連携機能
5. CsvImportController.js → UI統合

Phase 1.2完了により、投資ダッシュボードv2は楽天証券データを活用した本格的な投資管理ツールとして完成する見込みです。