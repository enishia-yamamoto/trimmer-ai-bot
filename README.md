# トリマーAIボット - LINE Bot with Subscription

トリミングサロン・トリマー向けのLINE AIチャットボットです。サブスクリプション機能を搭載し、無料/有料プランで利用制限を管理します。

## 機能

- 🤖 Dify連携によるAI応答
- 💳 Stripe決済によるサブスクリプション管理
- 📊 Googleスプレッドシートでのユーザー管理
- 🔄 月次利用回数の自動リセット
- 📱 LINEリッチメニュー対応

## 技術スタック

- **バックエンド**: Netlify Functions (Node.js/TypeScript)
- **データベース**: Google Sheets
- **決済**: Stripe
- **AI**: Dify Platform
- **メッセージング**: LINE Messaging API

## セットアップ

詳細なセットアップ手順は [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) を参照してください。

### 1. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、必要な値を設定します。

```bash
cp .env.example .env
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. ローカル開発

```bash
npm run dev
```

### 4. デプロイ

```bash
# Gitリポジトリの初期化
git init
git add .
git commit -m "Initial commit"

# GitHubにプッシュ
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# Netlifyでデプロイ（Netlify CLIを使用）
netlify init
netlify deploy --prod
```

## プロジェクト構造

```
├── netlify/
│   └── functions/        # Netlify Functions
│       ├── line-webhook.ts    # LINE Webhookハンドラー
│       ├── stripe-webhook.ts  # Stripe Webhookハンドラー
│       └── reset-usage.ts     # 月次リセット処理
├── src/
│   ├── lib/             # ライブラリ
│   │   ├── googleSheets.ts   # Google Sheets API
│   │   ├── dify.ts           # Dify API
│   │   └── stripe.ts         # Stripe API
│   └── types/           # TypeScript型定義
├── public/              # 静的ファイル
│   ├── index.html           # ランディングページ
│   ├── success.html         # 決済成功ページ
│   └── cancel.html          # 決済キャンセルページ
├── package.json
├── tsconfig.json
├── netlify.toml         # Netlify設定
└── README.md
```

## API エンドポイント

- `/.netlify/functions/line-webhook` - LINE Webhook受信
- `/.netlify/functions/stripe-webhook` - Stripe Webhook受信
- `/.netlify/functions/reset-usage` - 月次リセット（スケジュール実行）

## 利用プラン

### 無料プラン
- 月10回まで利用可能
- 毎月1日にリセット

### プレミアムプラン
- 無制限で利用可能
- 月額3,000円（価格は変更可能）

## トラブルシューティング

### Google Sheets APIエラー
- サービスアカウントのメールでシートが共有されているか確認
- 環境変数の改行文字が正しいか確認

### Stripe Webhookエラー
- Webhook署名シークレットが正しいか確認
- エンドポイントURLが正しいか確認

### LINE Webhookエラー
- チャネルアクセストークンが有効か確認
- Webhook URLが正しく設定されているか確認

## ライセンス

MIT

## サポート

問題が発生した場合は、イシューを作成してください。