import { Handler } from '@netlify/functions';
import { resetAllUsageCounts } from '../../src/lib/googleSheets';

export const handler: Handler = async (event) => {
  // セキュリティ: Authorization headerチェック
  const authHeader = event.headers.authorization;
  const expectedToken = process.env.RESET_CRON_TOKEN;
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    console.log('月次利用回数リセット処理開始:', new Date().toISOString());
    
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