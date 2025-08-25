import { Handler } from '@netlify/functions';
import { getCustomerPortalUrl } from '../../src/lib/stripe';
import { getUser } from '../../src/lib/googleSheets';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { lineUserId } = JSON.parse(event.body || '{}');
    
    if (!lineUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'LINE user ID is required' })
      };
    }

    // ユーザー情報を取得
    const user = await getUser(lineUserId);
    
    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'ユーザーが見つかりません' })
      };
    }

    // Stripe顧客IDがある場合はポータルURLを生成
    if (user.stripeCustomerId) {
      const portalUrl = await getCustomerPortalUrl(user.stripeCustomerId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: portalUrl })
      };
    } else {
      // 無料プランユーザー
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: '現在無料プランをご利用中です。有料プランに登録すると契約管理ページをご利用いただけます。'
        })
      };
    }
  } catch (error) {
    console.error('Error creating portal session:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create portal session' })
    };
  }
};