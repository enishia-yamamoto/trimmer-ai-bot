# 月次利用回数リセット 設定ガイド

## 概要
無料プランユーザーの月間利用回数を毎月1日 0:00（JST）に自動リセットする機能の設定方法

## 実装済みの内容

### 1. リセット用エンドポイント
- **URL**: `https://trimmer-ai-bot.netlify.app/.netlify/functions/reset-usage`
- **メソッド**: POST
- **認証**: Authorization: Bearer [RESET_CRON_TOKEN]

### 2. GitHub Actions（推奨）
`.github/workflows/reset-monthly-usage.yml`を作成済み
- 毎日15:00 UTC（日本時間0:00）に実行
- 1日の場合のみリセット処理を実行
- 手動実行も可能（workflow_dispatch）

## セットアップ手順

### ステップ1: Netlifyで環境変数を設定

1. Netlifyダッシュボードにログイン
2. Site settings → Environment variables
3. 以下を追加：
   - **変数名**: `RESET_CRON_TOKEN`
   - **値**: ランダムな文字列（例：`cron_secret_abc123xyz789`）
   - **注意**: この値は後でGitHub Secretsにも設定します

### ステップ2: GitHubでSecretsを設定

1. GitHubリポジトリの Settings → Secrets and variables → Actions
2. 「New repository secret」をクリック
3. 以下を追加：
   - **Name**: `RESET_CRON_TOKEN`
   - **Value**: Netlifyで設定したものと同じ値

### ステップ3: 動作確認

#### 手動実行でテスト
1. GitHub → Actions タブ
2. 「Reset Monthly Usage」を選択
3. 「Run workflow」をクリック
4. 実行ログを確認

#### ローカルでテスト（オプション）
```bash
curl -X POST https://trimmer-ai-bot.netlify.app/.netlify/functions/reset-usage \
  -H "Authorization: Bearer [あなたのRESET_CRON_TOKEN]" \
  -H "Content-Type: application/json"
```

## 代替方法

### 方法1: 外部Cronサービス（Cron-job.org）

1. https://cron-job.org にアクセス
2. 無料アカウント作成
3. 新規ジョブ作成：
   - **URL**: `https://trimmer-ai-bot.netlify.app/.netlify/functions/reset-usage`
   - **Schedule**: `0 0 1 * *`
   - **Method**: POST
   - **Headers**: 
     ```
     Authorization: Bearer [あなたのRESET_CRON_TOKEN]
     Content-Type: application/json
     ```

### 方法2: Google Apps Script

1. Google Apps Scriptで新規プロジェクト作成
2. 以下のコードを貼り付け：

```javascript
function resetMonthlyUsage() {
  const url = 'https://trimmer-ai-bot.netlify.app/.netlify/functions/reset-usage';
  const token = 'あなたのRESET_CRON_TOKEN'; // Script Propertiesに保存推奨
  
  const options = {
    'method': 'post',
    'headers': {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    console.log('Reset response:', response.getContentText());
  } catch (error) {
    console.error('Reset failed:', error);
  }
}
```

3. トリガー設定：
   - 編集 → 現在のプロジェクトのトリガー
   - トリガーを追加
   - 時間ベースのトリガー
   - 月ベースのタイマー → 1日 → 午前0時〜1時

## 監視とログ

### Netlify Functions ログ
1. Netlifyダッシュボード → Functions タブ
2. `reset-usage` 関数のログを確認

### GitHub Actions ログ
1. GitHub → Actions タブ
2. 実行履歴から詳細を確認

## トラブルシューティング

### よくある問題

1. **401 Unauthorized エラー**
   - `RESET_CRON_TOKEN`が正しく設定されているか確認
   - Netlifyとcronサービスで同じトークンを使用しているか確認

2. **リセットが実行されない**
   - タイムゾーン設定を確認（JST = UTC+9）
   - cronスケジュール表記を確認

3. **Google Sheetsエラー**
   - サービスアカウントの権限を確認
   - スプレッドシートIDが正しいか確認

## セキュリティ注意事項

- `RESET_CRON_TOKEN`は推測困難な値を使用
- トークンをコードにハードコードしない
- 定期的にトークンを更新することを推奨

---

最終更新日: 2025年9月12日