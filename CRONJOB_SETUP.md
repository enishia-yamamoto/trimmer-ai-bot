# Cron-job.org 設定手順書

## 概要
月次利用回数リセットをCron-job.orgで自動実行する設定手順

## 事前準備

### 1. Netlifyで環境変数を設定

1. Netlifyダッシュボードにログイン
2. **Site settings** → **Environment variables** → **Add a variable**
3. 以下を追加：

| Key | Value |
|-----|-------|
| RESET_CRON_TOKEN | 任意の文字列（例: `reset_token_abc123xyz789`） |

4. **Save** をクリック
5. デプロイが自動実行される（1-2分待つ）

⚠️ **重要**: このトークンをメモしておく（後で使用）

## Cron-job.org の設定

### ステップ1: アカウント作成

1. https://cron-job.org にアクセス
2. **Sign up** をクリック
3. 必要情報を入力：
   - Email
   - Username
   - Password
4. メール認証を完了

### ステップ2: Cronジョブ作成

1. ログイン後、**Cronjobs** タブをクリック
2. **Create cronjob** ボタンをクリック

### ステップ3: 基本設定

#### Title（タイトル）
```
トリマーAIボット 月次リセット
```

#### URL
```
https://trimmer-ai-bot.netlify.app/.netlify/functions/reset-usage
```

#### Schedule（スケジュール設定）

**方法A: Commonタブを使用（簡単）**
1. **Common** タブを選択
2. **Every month on the...** を選択
3. **Day**: `1` を選択
4. **Hour**: `0` を選択（日本時間9:00）
5. **Minute**: `0` を選択

**方法B: Advancedタブを使用（詳細設定）**
1. **Advanced** タブを選択
2. 以下を入力：
```
0 15 L * *
```
（毎月最終日の15:00 UTC = 翌月1日 0:00 JST）

または

```
0 15 1 * *
```
（毎月1日の15:00 UTC = 毎月2日 0:00 JST）

⚠️ **タイムゾーン注意**:
- Cron-job.orgはUTC時間
- 日本時間 = UTC + 9時間
- 日本時間で1日0:00にしたい場合、前日の15:00 UTCに設定

### ステップ4: リクエスト設定

#### Request Method
```
POST
```

#### Request Headers
以下をコピペして、`[YOUR_TOKEN]`を実際のトークンに置き換える：
```
Authorization: Bearer [YOUR_TOKEN]
Content-Type: application/json
```

**例**:
```
Authorization: Bearer reset_token_abc123xyz789
Content-Type: application/json
```

### ステップ5: 詳細オプション

#### Advanced タブ（オプション）

| 設定項目 | 推奨値 | 説明 |
|---------|--------|------|
| Enable job | ✅ ON | ジョブを有効化 |
| Save responses | ✅ ON | レスポンスを保存（ログ確認用） |
| Alert when fail | ✅ ON | 失敗時にメール通知 |
| Time zone | UTC | 変更しない |
| Timeout | 30 | 30秒でタイムアウト |

### ステップ6: 保存とテスト

1. **Create cronjob** ボタンをクリック
2. 作成されたジョブの画面で **Test run** をクリック
3. 結果を確認：
   - **Status**: 200 OK
   - **Response**: `{"message":"Monthly usage reset completed"...}`

## 動作確認

### 成功時のレスポンス
```json
{
  "message": "Monthly usage reset completed",
  "timestamp": "2025-09-12T15:00:00.000Z"
}
```

### エラー時の対処

#### 401 Unauthorized
```json
{"error":"Unauthorized"}
```
**原因**: トークンが間違っている
**対処**: 
- Netlifyの環境変数を確認
- Headerのトークンを確認

#### 500 Internal Server Error
```json
{"error":"Reset failed"}
```
**原因**: Google Sheets APIエラー
**対処**: 
- Google Sheetsの権限を確認
- Netlifyのログを確認

## 実行履歴の確認

1. Cron-job.orgにログイン
2. **Cronjobs** → 該当ジョブをクリック
3. **History** タブで実行履歴を確認

### 履歴の見方
- ✅ 緑: 成功（Status 200）
- ❌ 赤: 失敗（エラー）
- 🕐 グレー: 実行待ち

## メール通知設定

1. **Settings** → **Notifications**
2. 以下を設定：
   - **Execution failure**: ON（失敗時通知）
   - **Execution success**: OFF（成功時は不要）
   - **Disable notifications**: ON（ジョブ無効化時）

## よくある質問

### Q: いつ実行される？
A: 設定により異なります
- `0 15 L * *`: 毎月最終日24:00（翌月1日0:00）JST
- `0 15 1 * *`: 毎月2日0:00 JST

### Q: テスト実行したい
A: ジョブ詳細画面の「Test run」ボタンでいつでも実行可能

### Q: 一時的に止めたい
A: ジョブ詳細画面で「Disable」をクリック

### Q: 時間を変更したい
A: ジョブ詳細画面で「Edit」→ Schedule変更 → Save

### Q: ログが見たい
A: 
1. Cron-job.org: History タブ
2. Netlify: Functions → reset-usage → View logs

## トラブルシューティング

### 実行されない
- [ ] ジョブが「Enabled」になっているか確認
- [ ] スケジュール設定を確認（UTC時間）
- [ ] URLが正しいか確認

### エラーが出る
- [ ] トークンが正しいか確認
- [ ] Netlifyがデプロイ済みか確認
- [ ] Google Sheetsの権限を確認

### 2回実行される
- [ ] 複数のCronジョブを作成していないか確認
- [ ] GitHub Actionsも動いていないか確認

---

最終更新日: 2025年9月12日
作成者: トリマーAIボット開発チーム