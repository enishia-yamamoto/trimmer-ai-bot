# トリマーコンサルBOT プロジェクト情報

## デプロイ情報
- **Netlify URL**: https://trimmer-ai-bot.netlify.app
- **GitHub**: https://github.com/enishia-yamamoto/trimmer-ai-bot

## 主要エンドポイント
- **LINE Webhook**: https://trimmer-ai-bot.netlify.app/.netlify/functions/line-webhook
- **Stripe Webhook**: https://trimmer-ai-bot.netlify.app/.netlify/functions/stripe-webhook
- **LIFF リダイレクトページ**: https://trimmer-ai-bot.netlify.app/redirect.html

## 環境変数（Netlifyで設定済み）
- LINE_CHANNEL_ACCESS_TOKEN
- LINE_CHANNEL_SECRET  
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID
- GOOGLE_SHEETS_ID
- GOOGLE_SERVICE_ACCOUNT_EMAIL
- GOOGLE_PRIVATE_KEY
- DIFY_API_KEY
- DIFY_API_URL
- APP_URL: https://trimmer-ai-bot.netlify.app

## LIFF設定
- **エンドポイントURL**: https://trimmer-ai-bot.netlify.app/redirect.html
- **LIFF ID**: 2007989671-db0QbRb3
- **スコープ**: openid, profile（chat_message.writeは不要）
- **リッチメニューURL**: https://liff.line.me/2007989671-db0QbRb3

## Googleスプレッドシート
- **シート名**: users
- **共有アカウント**: netlify-function@gas-logtest-433402.iam.gserviceaccount.com

## 機能概要
- LINEリッチメニューから1タップでStripe決済/管理画面へ遷移
- ユーザーの状態（新規/無料/有料）を自動判別して適切な画面へ誘導
- 月間利用制限（無料プラン10回）の自動管理
- 毎月1日に利用回数自動リセット

## テストコマンド
```bash
npm run dev  # ローカル開発
npm run build  # ビルド
```

## リントとタイプチェック
```bash
npm run lint
npm run typecheck
```