import { Handler } from '@netlify/functions';
import { resetAllUsageCounts } from '../../src/lib/googleSheets';

// Netlify Scheduled Function
// スケジュール設定はnetlify.tomlで管理
export const handler: Handler = async (event) => {
  // 日本時間で現在の日付を取得
  const jstDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
  const day = jstDate.getDate();
  
  // 18日でない場合はスキップ（テスト用：本番は1日に戻す）
  if (day !== 18) {
    console.log(`本日は${day}日のため、リセット処理をスキップします`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Skipped: Today is day ${day}, not day 18` })
    };
  }
  
  // Authorization headerチェックは削除（Scheduled Functionは内部実行のため不要）
  
  try {
    console.log('月次利用回数リセット処理開始（テスト：18日実行）:', new Date().toISOString());
    
    // 全ユーザーの利用回数をリセット
    await resetAllUsageCounts();
    
    console.log('月次利用回数リセット処理完了');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Monthly usage reset completed',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('リセット処理エラー:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Reset failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};