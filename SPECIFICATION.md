# トリマーAIボット 仕様書・要件定義書

## 1. サービス概要

### 1.1 基本情報
- **サービス名**: トリマーAIボット
- **提供形態**: LINE公式アカウント（@361buraa）
- **主要機能**: トリミングに関する質問にAIが回答するチャットボット
- **デプロイ環境**: Netlify Functions（サーバーレス）

### 1.2 技術スタック
- **フロントエンド**: HTML（決済完了/キャンセルページのみ）
- **バックエンド**: Node.js + TypeScript（Netlify Functions）
- **AI**: Dify API
- **決済**: Stripe
- **データ管理**: Google Sheets
- **メッセージング**: LINE Messaging API

## 2. ユーザープラン体系

### 2.1 プラン種別
| プラン | 料金 | 利用制限 | 特徴 |
|-------|------|---------|------|
| 無料プラン | 0円 | 月間利用回数制限あり（環境変数で設定可能） | 基本機能のみ |
| 月額プラン | 990円/月 | 無制限 | いつでも解約可能 |
| 年額プラン | 9,900円/年 | 無制限 | 月額より2ヶ月分お得 |

### 2.2 プラン変更仕様
- **アップグレード**: 無料→有料は即時反映
- **プラン切替**: 月額⇔年額の変更時は旧プランを即座にキャンセル
- **日割り計算**: プラン変更時は自動的に日割り計算（Stripe標準機能）
- **ダウングレード**: 支払い失敗時は即座に無料プランに変更

## 3. 機能仕様

### 3.1 LINE Bot機能

#### 3.1.1 基本メッセージ処理
- **通常メッセージ**: Dify APIに転送してAI回答を返信
- **利用回数管理**: 無料プランユーザーの月間利用回数をカウント
- **制限通知**: 残り3回以下になったら自動通知

#### 3.1.2 リッチメニューコマンド
| コマンド | 動作 |
|---------|------|
| サブスクリプション | プラン状況に応じたFlexメッセージを表示 |
| 契約管理 | Stripeカスタマーポータルへのリンク表示（有料ユーザーのみ） |

#### 3.1.3 Flexメッセージ仕様

**無料ユーザー向け（サブスクリプションコマンド時）**:
- 月額・年額プランの選択画面
- 各プランの料金と特徴を表示
- LIFFへの直接リンクボタン

**有料ユーザー向け（サブスクリプションコマンド時）**:
- 現在のプラン表示（月額/年額）
- プラン変更ボタン（直接Stripe Checkoutへ）
- 契約管理ページボタン（カスタマーポータル）

**利用制限到達時**:
- 警告ヘッダー付きFlexメッセージ
- 月額・年額プラン選択オプション
- 「会話回数の制限があります」メッセージ

### 3.2 決済フロー

#### 3.2.1 新規登録フロー
1. LINEボットで「サブスクリプション」コマンド
2. プラン選択（月額/年額）
3. LIFFリダイレクトページ経由でStripe Checkout
4. 決済完了後、success.htmlページ表示
5. Webhookでユーザー情報更新

#### 3.2.2 プラン変更フロー
1. 有料ユーザーが「サブスクリプション」コマンド
2. プラン変更ボタンをクリック
3. 直接Stripe Checkoutへ（既存顧客IDを使用）
4. 新プラン登録と同時に旧プランを即座にキャンセル
5. 日割り計算で差額処理

### 3.3 Webhook処理

#### 3.3.1 Stripe Webhook
| イベント | 処理内容 |
|---------|---------|
| checkout.session.completed | 新規登録/プラン変更完了処理、複数サブスクリプション時の古いプランキャンセル |
| customer.subscription.created | サブスクリプション作成時のプラン更新 |
| customer.subscription.updated | ステータス変更時のプラン更新（past_due→free） |
| customer.subscription.deleted | サブスクリプション削除時に無料プランへ変更 |

#### 3.3.2 LINE Webhook
| イベント | 処理内容 |
|---------|---------|
| message | テキストメッセージ処理、利用回数管理 |
| follow | 新規友だち追加時のウェルカムメッセージ |
| postback | ボタンアクション処理 |

## 4. データ管理

### 4.1 Google Sheets構造
| 列 | フィールド名 | 型 | 説明 |
|----|-------------|-----|------|
| A | lineUserId | string | LINE ユーザーID |
| B | displayName | string | 表示名 |
| C | difyUserId | string | Dify用ID（lineUserIdと同じ） |
| D | difyConversationId | string | Dify会話ID |
| E | plan | 'free' \| 'monthly' \| 'yearly' | プラン種別 |
| F | monthlyUsageCount | number | 月間利用回数 |
| G | lastUsedDate | string | 最終利用日時（JST） |
| H | subscriptionStartDate | string | サブスク開始日時（JST） |
| I | stripeCustomerId | string | Stripe顧客ID |

### 4.2 データ更新タイミング
- **メッセージ送信時**: 利用回数・最終利用日時を更新
- **決済完了時**: プラン・Stripe顧客ID・開始日時を更新
- **プラン変更時**: プラン種別を更新
- **支払い失敗時**: プランを'free'に更新

## 5. 環境変数

### 5.1 必須環境変数
| 変数名 | 説明 | 例 |
|--------|------|-----|
| LINE_CHANNEL_ACCESS_TOKEN | LINEチャネルアクセストークン | - |
| LINE_CHANNEL_SECRET | LINEチャネルシークレット | - |
| STRIPE_SECRET_KEY | Stripe秘密鍵 | sk_... |
| STRIPE_WEBHOOK_SECRET | Stripe Webhook署名シークレット | whsec_... |
| STRIPE_PRICE_ID_MONTHLY | 月額プラン価格ID | price_... |
| STRIPE_PRICE_ID_YEARLY | 年額プラン価格ID | price_... |
| GOOGLE_SHEETS_ID | GoogleスプレッドシートID | - |
| GOOGLE_SERVICE_ACCOUNT_EMAIL | サービスアカウントメール | - |
| GOOGLE_PRIVATE_KEY | サービスアカウント秘密鍵 | - |
| DIFY_API_KEY | Dify APIキー | - |
| DIFY_API_URL | Dify APIエンドポイント | - |
| APP_URL | アプリケーションURL | https://trimmer-ai-bot.netlify.app |
| FREE_PLAN_LIMIT | 無料プラン月間制限回数 | 10 |

## 6. エンドポイント仕様

### 6.1 Netlify Functions
| パス | 説明 |
|------|------|
| /.netlify/functions/line-webhook | LINE Webhookエンドポイント |
| /.netlify/functions/stripe-webhook | Stripe Webhookエンドポイント |

### 6.2 静的ページ
| パス | 説明 |
|------|------|
| /redirect.html | LIFF経由でStripe Checkoutへリダイレクト |
| /success.html | 決済完了ページ |
| /cancel.html | 決済キャンセルページ |

## 7. セキュリティ要件

### 7.1 認証・検証
- LINE署名検証（X-Line-Signature）
- Stripe署名検証（stripe-signature）
- 環境変数による機密情報管理

### 7.2 アクセス制御
- Google Sheetsはサービスアカウントのみアクセス可
- Webhookエンドポイントは署名検証必須

## 8. 運用仕様

### 8.1 利用回数リセット
- **タイミング**: 毎月1日 0:00（JST）
- **方法**: 別途cronジョブまたは手動実行
- **対象**: 無料プランユーザーのmonthlyUsageCountを0にリセット

### 8.2 エラーハンドリング
- Dify API障害時: 「AIの処理でエラーが発生しました」メッセージ
- サーバー過負荷時: 「サーバーが混雑しています」メッセージ
- 決済エラー時: Stripe標準エラーページ

### 8.3 ログ管理
- Netlify Functions標準ログ
- console.logによるデバッグ情報出力
- エラー時のスタックトレース記録

## 9. 制約事項

### 9.1 技術的制約
- Netlify Functions: タイムアウト10秒
- LINE Messaging API: 応答は30秒以内
- Google Sheets API: 1分あたり60リクエストまで

### 9.2 ビジネス制約
- 無料プラン利用回数は環境変数で管理（デフォルト10回）
- プラン変更時の日割り計算はStripe標準仕様に準拠
- 支払い失敗時は即座に無料プランへダウングレード

## 10. 今後の拡張予定

### 10.1 検討中の機能
- 利用回数リセット日の環境変数化
- 管理画面の実装
- 詳細な利用統計機能
- プッシュ通知機能

### 10.2 改善予定
- エラーメッセージの詳細化
- パフォーマンス最適化
- テスト自動化

---

最終更新日: 2025年9月12日
バージョン: 1.0.0