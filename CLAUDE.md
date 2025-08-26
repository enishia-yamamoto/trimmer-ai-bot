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
- STRIPE_CUSTOMER_PORTAL_URL: https://billing.stripe.com/p/login/test_eVqdR9fr4cql8Anffj1sQ00 （※使用していない）
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

### スプレッドシートのヘッダー構成（A列〜H列）
| 列 | ヘッダー名 | 説明 | 例 |
|---|---|---|---|
| A | lineUserId | LINE ユーザーID | U5cca7b0f75d8... |
| B | displayName | LINEの表示名 | ヤマモト |
| C | difyConversationId | Dify会話ID | 8cc51609-a7a1-... |
| D | plan | プラン（free/premium） | premium |
| E | monthlyUsageCount | 月間利用回数 | 0 |
| F | lastUsedDate | 最終利用日時 | 2025-08-25T07:33:20.431Z |
| G | subscriptionStartDate | サブスク開始日時 | 2025-08-26T00:57:00.644Z |
| H | stripeCustomerId | Stripe顧客ID | cus_Sw3Is6LjwwZxT3 |

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