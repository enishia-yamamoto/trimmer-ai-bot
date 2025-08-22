# デプロイ手順

## 1. GitHubリポジトリの作成とプッシュ

### オプション1: GitHub.comで手動作成
1. [GitHub](https://github.com)にアクセス
2. 「New repository」をクリック
3. Repository name: `trimmer-ai-bot`
4. Private/Publicを選択
5. 「Create repository」をクリック

その後、ローカルで実行：
```bash
git remote add origin https://github.com/YOUR_USERNAME/trimmer-ai-bot.git
git push -u origin main
```

### オプション2: GitHub CLIを使用
```bash
# GitHub CLIにログイン
./gh_2.40.1_linux_amd64/bin/gh auth login

# リポジトリ作成とプッシュ
./gh_2.40.1_linux_amd64/bin/gh repo create trimmer-ai-bot --private --source=. --remote=origin --push
```

## 2. NetlifyでGitHub連携デプロイ

### オプション1: Netlify Webダッシュボードから
1. [Netlify](https://app.netlify.com)にログイン
2. 「Add new site」→「Import an existing project」をクリック
3. 「GitHub」を選択して認証
4. リポジトリ「trimmer-ai-bot」を選択
5. ビルド設定を確認：
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: 自動検出される（netlify/functions）
6. 「Deploy site」をクリック

### オプション2: Netlify CLIから
```bash
# Netlifyにログイン（必要な場合）
netlify login

# GitHub連携でサイトを初期化
netlify init

# 以下を選択：
# - Create & configure a new site
# - Team を選択
# - サイト名を入力（任意）
# - ビルド設定を確認
# - GitHubと連携
```

## 3. 環境変数の設定

Netlifyダッシュボードで設定：
1. Site configuration → Environment variables
2. 「Add a variable」をクリック
3. 以下の変数をすべて追加：

```
LINE_CHANNEL_ACCESS_TOKEN = [LINE Developersから取得]
LINE_CHANNEL_SECRET = [LINE Developersから取得]
STRIPE_SECRET_KEY = [Stripeダッシュボードから取得]
STRIPE_WEBHOOK_SECRET = [Stripe Webhookから取得]
STRIPE_PRICE_ID = [Stripe商品価格ID]
STRIPE_CUSTOMER_PORTAL_URL = [Stripeカスタマーポータル]
GOOGLE_SHEETS_ID = [GoogleスプレッドシートID]
GOOGLE_SERVICE_ACCOUNT_EMAIL = [サービスアカウントメール]
GOOGLE_PRIVATE_KEY = [サービスアカウント秘密鍵]
DIFY_API_KEY = [Dify APIキー]
DIFY_API_URL = https://api.dify.ai/v1
APP_URL = https://YOUR-SITE.netlify.app
```

## 4. デプロイの確認

1. Netlifyダッシュボードで「Deploys」タブを確認
2. ビルドログを確認
3. デプロイが成功したらサイトURLをメモ

## 5. Webhook URLの設定

### LINE Developers
1. Messaging API設定でWebhook URLを設定：
   ```
   https://YOUR-SITE.netlify.app/.netlify/functions/line-webhook
   ```

### Stripe
1. Webhook設定でエンドポイントを追加：
   ```
   https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
   ```

## 6. 動作確認

1. LINE公式アカウントを友だち追加
2. メッセージを送信してテスト
3. Netlify Functionsログで動作確認

## トラブルシューティング

### ビルドエラーの場合
- Netlifyのビルドログを確認
- 環境変数がすべて設定されているか確認
- `npm run build`がローカルで成功するか確認

### 関数が動作しない場合
- Functions タブでエラーログを確認
- 環境変数が正しく設定されているか確認

## 現在作成済みのNetlifyサイト

- Site ID: `e7a4ab26-633e-455c-82f2-9b3a873ea5a0`
- URL: `http://polite-pasca-226c52.netlify.app`
- Admin URL: `https://app.netlify.com/projects/polite-pasca-226c52`

このサイトを使用する場合は、GitHubリポジトリと連携設定を行ってください。