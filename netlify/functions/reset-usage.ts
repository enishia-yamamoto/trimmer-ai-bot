import { Handler } from '@netlify/functions';
import { resetAllUsageCounts } from '../../src/lib/googleSheets';

// Netlify Scheduled Function
// スケジュール設定はnetlify.tomlで管理
export const handler: Handler = async (event) => {
  // 毎月1日 9:00 JSTに自動実行（netlify.tomlで設定）
  
  try {
    console.log('月次利用回数リセット処理開始（毎月1日 9:00 JST）:', new Date().toISOString());
    
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