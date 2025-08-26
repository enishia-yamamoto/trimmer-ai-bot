import { Handler } from '@netlify/functions';
import { getUser } from '../../src/lib/googleSheets';
import { createCheckoutSession, getCustomerPortalUrl } from '../../src/lib/stripe';

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

    // ユーザー情報を取得して状態を判別
    const user = await getUser(lineUserId);
    
    if (!user) {
      // 新規ユーザー → Checkout
      const checkoutUrl = await createCheckoutSession(lineUserId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          url: checkoutUrl,
          action: 'checkout',
          message: '新規登録'
        })
      };
    }
    
    // 既存ユーザーの場合
    if (user.stripeCustomerId && user.plan === 'premium') {
      // 有料会員 → カスタマーポータル
      const portalUrl = await getCustomerPortalUrl(user.stripeCustomerId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          url: portalUrl,
          action: 'portal',
          message: '契約管理ページへ'
        })
      };
    } else {
      // 無料会員 → Checkout
      const checkoutUrl = await createCheckoutSession(lineUserId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          url: checkoutUrl,
          action: 'checkout',
          message: '有料プランへアップグレード'
        })
      };
    }
  } catch (error) {
    console.error('Error in smart redirect:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process request' })
    };
  }
};