クロードコードを使って作成するときの原則を記述したマークダウンファイルです。

ユーザーは初心者なので、段階的、詳細な解説を求めます。

優しく丁寧な日本語で常に返答するようにしてください。

ファイルなどを変更し終えて、タスクを終了したら、簡易サマリーとして、どこに変更があったのかファイルを列挙して、その内容を教えるようにしてください


各メソッドにはからなず詳細なJSdocを記述するようにしてください。
  - メソッドの説明（@description）
  - パラメータ情報（@param）
  - 戻り値情報（@returns）
  - 例外情報（@throws）
  - 使用例（@example）
  - 静的メソッドの場合は@static

＝＝＝
ファイルアーキテクチャは、HTML＋レイヤードアーキテクチャになっています。
chatGPTとは下記のように整理をしました

'''
investment-dashboard-pwa/
├── public/                 
│   ├── index.html          # UI層: 画面の土台
│   ├── styles.css          # UI層: 共通スタイル
│   ├── manifest.json       # PWA設定
│   └── sw.js               # Service Worker
├── src/
│   ├── ui/                 # Presentation Layer
│   │   ├── components/     # UIコンポーネント (ボタン/カード/グラフ)
│   │   ├── controllers/    # ページやイベント制御 (DashboardController等)
│   │   └── views/          # HTMLテンプレート/描画ロジック
│   ├── application/        # Application Layer
│   │   ├── PortfolioService.js
│   │   ├── TransactionService.js
│   │   └── SectorService.js
│   ├── domain/             # Domain Layer
│   │   ├── Stock.js
│   │   ├── MutualFund.js
│   │   ├── CryptoAsset.js
│   │   └── Portfolio.js
│   ├── infrastructure/     # Infrastructure Layer
│   │   ├── LocalStorageRepository.js
│   │   ├── CsvRepository.js
│   │   └── ExternalApiRepository.js (将来用)
│   ├── utils/              # 共通ユーティリティ
│   └── main.js             # エントリーポイント (初期化処理)
└── docs/                   # ドキュメント群
'''