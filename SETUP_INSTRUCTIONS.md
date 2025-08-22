# セットアップ手順

このドキュメントでは、LINE トリマー向けAIチャットボットのデプロイに必要な各種APIの設定手順を説明します。

## 必要なアカウント・サービス

1. **Google Cloud Platform (GCP)** - Google Sheets API用
2. **Stripe** - 決済処理用
3. **LINE Developers** - LINE Messaging API用
4. **Dify** - AI処理用
5. **Netlify** - ホスティング用
6. **GitHub** - ソースコード管理用

---

## 1. Google API設定

### 1.1 Google Cloud Consoleでプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. プロジェクトIDをメモしておく

### 1.2 Google Sheets APIを有効化

1. 左メニューから「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索して選択
3. 「有効にする」をクリック

### 1.3 サービスアカウントの作成

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「サービスアカウント」を選択
3. サービスアカウント名を入力（例：trimmer-bot-service）
4. 「作成して続行」をクリック
5. ロールは「編集者」を選択
6. 「続行」→「完了」をクリック

### 1.4 秘密鍵の生成

1. 作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」
4. 「JSON」を選択して「作成」
5. ダウンロードされたJSONファイルを安全に保管

### 1.5 Googleスプレッドシートの準備

1. [Google Sheets](https://sheets.google.com)で新しいスプレッドシートを作成
2. シート名を「users」に変更
3. 1行目に以下のヘッダーを追加：
   - A1: lineUserId
   - B1: displayName
   - C1: difyConversationId
   - D1: plan
   - E1: monthlyUsageCount
   - F1: subscriptionStartDate
   - G1: lastUsedDate
   - H1: stripeCustomerId
4. スプレッドシートのURLから`SPREADSHEET_ID`を取得（`/d/`と`/edit`の間の文字列）
5. サービスアカウントのメールアドレスでシートを共有（編集権限）

### 必要な環境変数
```
GOOGLE_SHEETS_ID=取得したスプレッドシートID
GOOGLE_SERVICE_ACCOUNT_EMAIL=サービスアカウントのメール
GOOGLE_PRIVATE_KEY=JSONファイルのprivate_key（改行を\nに置換）
```

---

## 2. Stripe API設定

### 2.1 Stripeアカウント作成

1. [Stripe](https://stripe.com/jp)でアカウントを作成
2. ダッシュボードにログイン

### 2.2 APIキーの取得

1. ダッシュボードの「開発者」→「APIキー」を選択
2. 「シークレットキー」をコピー（`sk_test_`または`sk_live_`で始まる）

### 2.3 商品と価格の作成

1. 「商品」→「商品を追加」
2. 商品名：「トリマーAIボット Premium」
3. 価格設定：
   - 料金：任意の金額（例：月額3,000円）
   - 請求期間：月次
4. 価格IDをメモ（`price_`で始まる文字列）

### 2.4 Webhookエンドポイントの設定

1. 「開発者」→「Webhook」→「エンドポイントを追加」
2. エンドポイントURL：`https://your-app.netlify.app/.netlify/functions/stripe-webhook`
3. リッスンするイベント：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Webhook署名シークレットをメモ（`whsec_`で始まる）

### 2.5 カスタマーポータルの設定

1. 「設定」→「Billing」→「カスタマーポータル」
2. ポータルを有効化
3. ポータルURLをメモ

### 必要な環境変数
```
STRIPE_SECRET_KEY=取得したシークレットキー
STRIPE_WEBHOOK_SECRET=Webhook署名シークレット
STRIPE_PRICE_ID=価格ID
STRIPE_CUSTOMER_PORTAL_URL=カスタマーポータルURL
```

---

## 3. LINE Messaging API設定

### 3.1 LINE Developersでプロバイダー作成

1. [LINE Developers](https://developers.line.biz/)にログイン
2. 「新規プロバイダー作成」をクリック
3. プロバイダー名を入力

### 3.2 Messaging APIチャネル作成

1. 「新規チャネル作成」→「Messaging API」を選択
2. 必要情報を入力：
   - チャネル名
   - チャネル説明
   - 大業種・小業種
   - メールアドレス

### 3.3 チャネル設定

1. 作成したチャネルの「Messaging API設定」タブを開く
2. Webhook URLを設定：`https://your-app.netlify.app/.netlify/functions/line-webhook`
3. 「Webhookの利用」をONに設定
4. 「応答メッセージ」をOFFに設定

### 3.4 認証情報の取得

1. 「チャネル基本設定」タブで「チャネルシークレット」をコピー
2. 「Messaging API設定」タブで「チャネルアクセストークン」を発行してコピー

### 3.5 リッチメニューの設定

LINE Official Account Managerで設定：
1. リッチメニューを作成
2. メニュー項目：
   - 「有料プランへ登録」
   - 「契約状況確認」
   - 「使い方」

### 必要な環境変数
```
LINE_CHANNEL_ACCESS_TOKEN=チャネルアクセストークン
LINE_CHANNEL_SECRET=チャネルシークレット
```

---

## 4. Dify API設定

### 4.1 Difyアカウント作成

1. [Dify](https://dify.ai/)でアカウントを作成
2. ワークスペースにログイン

### 4.2 アプリケーション作成

1. 「アプリケーションを作成」をクリック
2. チャットボットタイプを選択
3. OpenAI APIキーを設定

### 4.3 API設定

1. アプリケーションの「API」タブを開く
2. APIキーを生成してコピー
3. API URLをメモ

### 必要な環境変数
```
DIFY_API_KEY=生成したAPIキー
DIFY_API_URL=https://api.dify.ai/v1
```

---

## 5. Netlifyデプロイ設定

### 5.1 GitHubリポジトリの準備

1. GitHubでリポジトリを作成
2. ローカルのコードをプッシュ

### 5.2 Netlifyアカウント作成

1. [Netlify](https://www.netlify.com/)でアカウントを作成
2. GitHubアカウントと連携

### 5.3 サイトのデプロイ

1. 「Add new site」→「Import an existing project」
2. GitHubを選択してリポジトリを選択
3. ビルド設定：
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

### 5.4 環境変数の設定

1. 「Site configuration」→「Environment variables」
2. すべての環境変数を追加：
   - LINE_CHANNEL_ACCESS_TOKEN
   - LINE_CHANNEL_SECRET
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - STRIPE_PRICE_ID
   - STRIPE_CUSTOMER_PORTAL_URL
   - GOOGLE_SHEETS_ID
   - GOOGLE_SERVICE_ACCOUNT_EMAIL
   - GOOGLE_PRIVATE_KEY
   - DIFY_API_KEY
   - DIFY_API_URL
   - APP_URL（Netlifyのサイトアドレス）

### 5.5 デプロイの確認

1. デプロイログを確認
2. Functions タブで関数が正しくデプロイされていることを確認

---

## 6. 動作確認

### 6.1 LINE Webhook確認

1. LINE Developersコンソールで「Webhook URL検証」をクリック
2. 成功メッセージが表示されることを確認

### 6.2 Stripe Webhook確認

1. Stripeダッシュボードで「Webhook」→「テストイベント送信」
2. 各イベントでテスト送信して200応答を確認

### 6.3 エンドツーエンドテスト

1. LINE公式アカウントを友だち追加
2. メッセージを送信して応答を確認
3. 無料プランで10回以上メッセージを送信して制限を確認
4. Stripe決済リンクから有料プラン登録をテスト

---

## トラブルシューティング

### Google Sheets APIエラー
- サービスアカウントのメールアドレスでシートが共有されているか確認
- GOOGLE_PRIVATE_KEYの改行が正しく`\n`になっているか確認

### Stripe Webhookエラー
- Webhook署名シークレットが正しいか確認
- エンドポイントURLが正しいか確認

### LINE Webhookエラー
- チャネルアクセストークンが有効か確認
- Webhook URLが正しく設定されているか確認

### Netlifyデプロイエラー
- ビルドログを確認
- 環境変数がすべて設定されているか確認

---

## サポート

問題が解決しない場合は、以下の情報と共にお問い合わせください：
- エラーメッセージの全文
- 実行した手順
- 環境変数の設定状況（値は伏せて）