# トリマーコンサルBOT プロジェクト情報

## デプロイ情報
- **Netlify URL**: https://trimmer-ai-bot.netlify.app
- **GitHub**: https://github.com/enishia-yamamoto/trimmer-ai-bot

## 主要エンドポイント
- **LINE Webhook**: https://trimmer-ai-bot.netlify.app/.netlify/functions/line-webhook
- **Stripe Webhook**: https://trimmer-ai-bot.netlify.app/.netlify/functions/stripe-webhook
- **LIFF リダイレクトページ**: https://trimmer-ai-bot.netlify.app/redirect.html

## 環境変数（Netlifyで設定済み）

### LINE関連
- LINE_CHANNEL_ACCESS_TOKEN
- LINE_CHANNEL_SECRET

### Stripe関連
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID_MONTHLY: 月額プランの価格ID（他環境では自分のStripeで作成した価格IDを設定）
- STRIPE_PRICE_ID_YEARLY: 年額プランの価格ID（他環境では自分のStripeで作成した価格IDを設定）
- STRIPE_CUSTOMER_PORTAL_URL: https://billing.stripe.com/p/login/test_eVqdR9fr4cql8Anffj1sQ00 （※使用していない）

### Google Sheets関連
- GOOGLE_SHEETS_ID: スプレッドシートのID
- GOOGLE_SERVICE_ACCOUNT_EMAIL: サービスアカウントのメールアドレス
- GOOGLE_PRIVATE_KEY: サービスアカウントの秘密鍵（JSON形式）

### Dify関連
- DIFY_API_KEY
- DIFY_API_URL

### アプリケーション設定
- APP_URL: https://trimmer-ai-bot.netlify.app
- FREE_PLAN_LIMIT: 10（無料プランの月間利用回数制限）

## LIFF設定
- **エンドポイントURL**: https://trimmer-ai-bot.netlify.app/redirect.html
- **LIFF ID**: 2007989671-db0QbRb3
- **スコープ**: openid, profile（chat_message.writeは不要）
- **リッチメニューURL**: https://liff.line.me/2007989671-db0QbRb3

## Googleスプレッドシート
- **シート名**: users
- **共有アカウント**: netlify-function@gas-logtest-433402.iam.gserviceaccount.com

### スプレッドシートのヘッダー構成（A列〜K列）※複数プラン対応版
| 列 | ヘッダー名 | 説明 | 例 |
|---|---|---|---|
| A | lineUserId | LINE ユーザーID | U5cca7b0f75d8... |
| B | displayName | LINEの表示名 | ヤマモト |
| C | difyUserId | Dify ユーザーID（LINE IDと同じ） | U5cca7b0f75d8... |
| D | difyConversationId | Dify会話ID | 8cc51609-a7a1-... |
| E | plan | プラン（free/monthly/yearly） | monthly |
| F | monthlyUsageCount | 月間利用回数 | 0 |
| G | lastUsedDate | 最終利用日時（JST） | 2025-08-25T16:33:20.431+09:00 |
| H | subscriptionStartDate | サブスク開始日時（JST） | 2025-08-26T09:57:00.644+09:00 |
| I | stripeCustomerId | Stripe顧客ID | cus_Sw3Is6LjwwZxT3 |
| J | subscriptionId | StripeサブスクリプションID | sub_1OxxxxxxxxxxxxX |
| K | subscriptionEndDate | サブスク終了予定日（JST） | 2025-09-26T09:57:00.644+09:00 |

## リッチメニュー設定
LINE Official Account Managerでの設定：
- **ボタン1**: 「サブスクリプション」
  - アクションタイプ：テキスト
  - テキスト内容：サブスクリプション
  - ※URLリンクではなくテキスト送信タイプで設定

## 参考：開発環境のStripe価格ID
- 月額プラン: price_1S64m6FJbdvgWrDEfvPJgEjp（990円/月）
- 年額プラン: price_1S64mMFJbdvgWrDEYWn8lEy7（9,900円/年）
※他環境では自分のStripeアカウントで価格を作成し、環境変数に設定

## 機能概要
- LINEリッチメニューから1タップでサブスクリプション管理
- ユーザーの状態（新規/無料/有料）を自動判別して適切な画面へ誘導
  - 無料ユーザー：プラン選択画面（月額/年額）を表示
  - 有料ユーザー：現在のプラン表示と管理オプション
- 月間利用制限（無料プラン10回）の自動管理
- 毎月1日に利用回数自動リセット

## 開発ルール
**重要**: コード修正後は必ず以下を実行：
1. `git add -A`
2. `git commit -m "適切なコミットメッセージ"`
3. GitHubへプッシュ（以下のコマンドを使用）：
```bash
GIT_ASKPASS=echo git push https://ghp_9HQcOX9qJr7vKHsRTRsP5XpP5YgpoP2THsUt:x-oauth-basic@github.com/enishia-yamamoto/trimmer-ai-bot.git
```

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