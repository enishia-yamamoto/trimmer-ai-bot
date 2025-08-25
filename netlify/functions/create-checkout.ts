import { Handler } from '@netlify/functions';
import { createCheckoutSession } from '../../src/lib/stripe';

export const handler: Handler = async (event) => {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // プリフライトリクエスト対応
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

    // Stripe Checkout URLを生成
    const checkoutUrl = await createCheckoutSession(lineUserId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: checkoutUrl })
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};