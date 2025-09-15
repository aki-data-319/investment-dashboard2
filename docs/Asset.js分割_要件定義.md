# Asset.js分割設計 - 要件定義書

**作成日**: 2025年9月11日  
**対象機能**: BusinessLayer Asset.js の定義系・計算系分離  
**アーキテクチャ**: レイヤードアーキテクチャ

## 📋 背景と目的

### 現状の課題
- 現在のAsset.jsが単一ファイルで600行超と肥大化
- データ定義とビジネス計算ロジックが混在
- 保守性・可読性・テスト性の向上が必要
- 単一責任原則（SRP）に基づく適切な分離が求められる

### 分割の目的
1. **保守性向上**: 関心事の分離による理解しやすさ
2. **再利用性向上**: 計算ロジックの独立した利用
3. **テスト性向上**: 単位テストの実装容易性
4. **拡張性向上**: 新機能追加時の影響範囲最小化

## 🏗 分割設計

### 分割方針
Asset.jsを以下の2つのクラスに分離：

#### 1. AssetEntity.js (定義系)
**責任**: データ構造定義とCRUD操作
- データプロパティの定義
- コンストラクタとバリデーション
- JSON変換・シリアライゼーション
- ファクトリーメソッド
- 基本的なゲッター・セッター

#### 2. AssetCalculator.js (計算系)  
**責任**: ビジネス計算とドメインロジック
- 損益計算ロジック
- 利益率計算
- 統計・分析計算
- 比較・評価ロジック

## 📁 ファイル構成計画

### 新しいディレクトリ構造
```
src/business/models/
├── AssetEntity.js          # 新規：データ定義・CRUD
├── AssetCalculator.js      # 新規：計算・分析ロジック
└── Asset.js               # 削除予定（移行後）
```

### インポート関係
```
AssetEntity ←─ AssetCalculator
     ↑              ↑
UI Controllers ──────┘
     ↑
Validators
```

## 🔧 詳細仕様

### 1. AssetEntity.js 仕様

#### クラス定義
```javascript
/**
 * AssetEntity - 投資資産のデータエンティティ
 * @description 資産の基本データ構造とCRUD操作を提供
 */
class AssetEntity {
    // データプロパティ定義
    constructor(data = {})
    
    // バリデーション
    validate()
    
    // CRUD操作
    updateCurrentValue(newValue)
    addInvestment(amount, quantity)
    
    // シリアライゼーション
    toJSON()
    getSummary()
    clone()
    
    // ファクトリーメソッド
    static fromJSON(json)
    static createFromForm(formData)
    
    // ビジネス定数
    static get VALID_TYPES()
    static get VALID_REGIONS()
    static get VALID_CURRENCIES()
    
    // ヘルパーメソッド
    static getTypeDisplayName(type)
    static getRegionDisplayName(region)
    static checkDuplicate(name, existingAssets)
    
    // 比較・判定
    equals(other)
    toString()
}
```

#### 主な責任範囲
- ✅ データプロパティの管理
- ✅ 基本的なバリデーション
- ✅ JSON変換・ファクトリー
- ✅ ビジネス定数の提供
- ❌ 計算ロジック（AssetCalculatorに移譲）

### 2. AssetCalculator.js 仕様

#### クラス定義
```javascript
/**
 * AssetCalculator - 投資資産の計算・分析エンジン
 * @description AssetEntityを受け取り各種計算を実行する静的クラス
 */
class AssetCalculator {
    // 基本計算
    static getUnrealizedGainLoss(asset)
    static getReturnPercentage(asset)
    static getAveragePrice(asset)
    
    // 拡張計算（今後実装予定）
    static getVolatility(asset, priceHistory)
    static getCompoundAnnualGrowthRate(asset, years)
    static getDrawdown(asset, priceHistory)
    
    // ポートフォリオ計算
    static getTotalValue(assets)
    static getPortfolioAllocation(assets)
    static getPortfolioPerformance(assets)
    
    // 比較・ランキング
    static comparePerformance(asset1, asset2)
    static rankAssetsByPerformance(assets)
    static getTopPerformers(assets, count)
    
    // リスク分析
    static calculateRiskMetrics(asset, benchmark)
    static getSharpeRatio(asset, riskFreeRate)
    static getBeta(asset, market)
}
```

#### 主な責任範囲
- ✅ 全ての数値計算ロジック
- ✅ ポートフォリオ分析
- ✅ パフォーマンス比較
- ✅ リスク指標計算
- ❌ データ管理（AssetEntityが担当）

## 🔄 移行戦略

### Phase 1: 新クラス作成（Week 1）
1. AssetEntity.jsの基本構造作成
2. AssetCalculator.jsの基本構造作成
3. 既存Asset.jsから機能移行
4. 基本テストケース作成

### Phase 2: 統合テスト（Week 2）
1. 既存コントローラーとの連携確認
2. AssetFormValidator.jsとの整合性確認
3. リファクタリング対象の特定
4. パフォーマンステスト実行

### Phase 3: 切り替え（Week 3）
1. 全インポート文の更新
2. 既存Asset.jsの削除
3. ドキュメント更新
4. 最終テスト実行

## 🎯 使用例

### 移行前（現状）
```javascript
// 全てがAssetクラスに集約
const asset = new Asset(data);
const gainLoss = asset.getUnrealizedGainLoss();
const returnPct = asset.getReturnPercentage();
```

### 移行後（新設計）
```javascript
// 責任分離された設計
const entity = new AssetEntity(data);
const gainLoss = AssetCalculator.getUnrealizedGainLoss(entity);
const returnPct = AssetCalculator.getReturnPercentage(entity);

// 拡張計算も利用可能
const portfolio = [entity1, entity2, entity3];
const totalValue = AssetCalculator.getTotalValue(portfolio);
const allocation = AssetCalculator.getPortfolioAllocation(portfolio);
```

## 📊 メリット・デメリット分析

### ✅ メリット
1. **単一責任**: 各クラスが明確な責任を持つ
2. **テスト容易性**: 計算ロジックの独立テスト可能
3. **再利用性**: 計算機能の他コンポーネントでの利用
4. **拡張性**: 新しい計算機能の追加が容易
5. **保守性**: コード変更時の影響範囲が明確

### ⚠️ デメリット・注意点
1. **複雑性増加**: ファイル数の増加
2. **インポート増加**: 複数クラスのインポートが必要
3. **移行コスト**: 既存コード修正の工数
4. **学習コスト**: 新しい設計の理解が必要

### 🛡️ リスク軽減策
- 段階的移行による影響最小化
- 充実したテストケースによる品質担保
- 詳細なドキュメント作成
- 既存APIの互換性維持（可能な限り）

## 🧪 テスト戦略

### 1. AssetEntity テストケース
```javascript
describe('AssetEntity', () => {
    test('データプロパティ設定', () => {
        const entity = new AssetEntity({ name: 'テスト', totalInvestment: 100000 });
        expect(entity.name).toBe('テスト');
    });
    
    test('JSON変換', () => {
        const entity = new AssetEntity(testData);
        const json = entity.toJSON();
        expect(json).toMatchObject(testData);
    });
});
```

### 2. AssetCalculator テストケース
```javascript
describe('AssetCalculator', () => {
    test('損益計算', () => {
        const entity = new AssetEntity({ totalInvestment: 100000, currentValue: 110000 });
        const gainLoss = AssetCalculator.getUnrealizedGainLoss(entity);
        expect(gainLoss).toBe(10000);
    });
    
    test('利益率計算', () => {
        const entity = new AssetEntity({ totalInvestment: 100000, currentValue: 110000 });
        const returnPct = AssetCalculator.getReturnPercentage(entity);
        expect(returnPct).toBe(10.0);
    });
});
```

## 📋 実装チェックリスト

### 設計段階
- [ ] AssetEntity.js の詳細設計完了
- [ ] AssetCalculator.js の詳細設計完了
- [ ] インターフェース定義完了
- [ ] テストケース設計完了

### 実装段階
- [ ] AssetEntity.js の実装完了
- [ ] AssetCalculator.js の実装完了
- [ ] 基本テストケース実装完了
- [ ] 統合テスト実行完了

### 移行段階
- [ ] 既存コントローラーの更新完了
- [ ] インポート文の更新完了
- [ ] Asset.js の削除完了
- [ ] ドキュメント更新完了

この分割により、投資ダッシュボードのBusinessLayerがより保守しやすく、拡張可能な構造となります。