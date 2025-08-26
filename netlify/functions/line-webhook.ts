import { Handler } from '@netlify/functions';
import * as line from '@line/bot-sdk';
import { getUser, createUser, updateUser, incrementUsageCount } from '../../src/lib/googleSheets';
import { sendMessageToDify } from '../../src/lib/dify';
import { createCheckoutSession, getCustomerPortalUrl } from '../../src/lib/stripe';

const config: line.MiddlewareConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

const FREE_PLAN_LIMIT = 10;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify LINE signature
    const signature = event.headers['x-line-signature'];
    if (!signature) {
      return { statusCode: 400, body: 'Missing signature' };
    }

    const body = JSON.parse(event.body!);
    
    // Process each event
    for (const lineEvent of body.events) {
      if (lineEvent.type === 'message' && lineEvent.message.type === 'text') {
        await handleTextMessage(lineEvent);
      } else if (lineEvent.type === 'follow') {
        await handleFollow(lineEvent);
      } else if (lineEvent.type === 'postback') {
        await handlePostback(lineEvent);
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};

async function handleTextMessage(event: line.WebhookEvent) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  
  const userId = event.source.userId!;
  const messageText = event.message.text;
  const replyToken = event.replyToken;

  try {
    // Handle rich menu commands
    if (messageText === '有料プランに登録') {
      const checkoutUrl = await createCheckoutSession(userId);
      await client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: '以下のリンクから有料プランにご登録ください：',
        }, {
          type: 'text',
          text: checkoutUrl!,
        }],
      });
      return;
    }
    
    if (messageText === '契約管理') {
      const user = await getUser(userId);
      if (user?.stripeCustomerId) {
        const portalUrl = await getCustomerPortalUrl(user.stripeCustomerId);
        await client.replyMessage({
          replyToken,
          messages: [{
            type: 'text',
            text: '以下のリンクから契約状況の確認・変更ができます：',
          }, {
            type: 'text',
            text: portalUrl,
          }],
        });
      } else {
        await client.replyMessage({
          replyToken,
          messages: [{
            type: 'text',
            text: '現在無料プランをご利用中です。有料プランに登録すると契約管理ページをご利用いただけます。',
          }],
        });
      }
      return;
    }

    // Get user
    let user = await getUser(userId);
    const isNewUser = !user;
    
    // Check usage limits for existing free users
    if (user && user.plan === 'free' && user.monthlyUsageCount >= FREE_PLAN_LIMIT) {
      const checkoutUrl = await createCheckoutSession(userId);
      
      await client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: `今月の無料利用回数（${FREE_PLAN_LIMIT}回）を使い切りました。\n\n有料プランに登録すると、無制限でご利用いただけます。`,
        }, {
          type: 'template',
          altText: '有料プランへの登録',
          template: {
            type: 'buttons',
            text: '有料プランに登録して無制限で利用する',
            actions: [{
              type: 'uri',
              label: '有料プランに登録',
              uri: checkoutUrl!,
            }],
          },
        }],
      });
      return;
    }

    // Send message to Dify
    const difyResponse = await sendMessageToDify(
      messageText,
      userId,
      user?.difyConversationId
    );

    // Create or update user after getting Dify response
    if (isNewUser) {
      // Get user profile from LINE
      const profile = await client.getProfile(userId);
      
      // Create new user with all data including Dify conversation ID
      await createUser({
        lineUserId: userId,
        displayName: profile.displayName,
        difyConversationId: difyResponse.conversation_id,
        plan: 'free',
        monthlyUsageCount: 1,  // First message counts
        lastUsedDate: new Date().toISOString(),
        subscriptionStartDate: '',
        stripeCustomerId: '',
      });
    } else {
      // Update existing user
      if (user.plan === 'free') {
        // Update conversation ID and increment usage count in one call
        await updateUser(userId, {
          difyConversationId: difyResponse.conversation_id,
          monthlyUsageCount: user.monthlyUsageCount + 1,
          lastUsedDate: new Date().toISOString(),
        });
      } else {
        // Premium users: only update conversation ID and last used date
        await updateUser(userId, {
          difyConversationId: difyResponse.conversation_id,
          lastUsedDate: new Date().toISOString(),
        });
      }
    }

    // Reply to user
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: difyResponse.answer,
      }],
    });
    
    // If free user, add usage count info
    if (!isNewUser && user.plan === 'free') {
      const remainingCount = FREE_PLAN_LIMIT - (user.monthlyUsageCount + 1);
      if (remainingCount <= 3 && remainingCount > 0) {
        await client.pushMessage({
          to: userId,
          messages: [{
            type: 'text',
            text: `📝 今月の残り利用回数: ${remainingCount}回`,
          }],
        });
      }
    }
  } catch (error) {
    console.error('Error handling text message:', error);
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: 'エラーが発生しました。しばらく経ってから再度お試しください。',
      }],
    });
  }
}

async function handleFollow(event: line.WebhookEvent) {
  if (event.type !== 'follow') return;
  
  const userId = event.source.userId!;
  const replyToken = event.replyToken;

  try {
    const profile = await client.getProfile(userId);
    
    // Create user if not exists
    const existingUser = await getUser(userId);
    if (!existingUser) {
      await createUser({
        lineUserId: userId,
        displayName: profile.displayName,
        difyConversationId: '',
        plan: 'free',
        monthlyUsageCount: 0,
        lastUsedDate: new Date().toISOString(),
        subscriptionStartDate: '',
        stripeCustomerId: '',
      });
    }

    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: `${profile.displayName}さん、トリマーAIボットへようこそ！\n\nトリミングに関するご質問をお気軽にお送りください。\n\n📊 無料プラン: 月${FREE_PLAN_LIMIT}回まで\n⭐ 有料プラン: 無制限でご利用可能\n\nメニューから有料プランへの登録や契約状況の確認ができます。`,
      }],
    });
  } catch (error) {
    console.error('Error handling follow event:', error);
  }
}

async function handlePostback(event: line.WebhookEvent) {
  if (event.type !== 'postback') return;
  
  const userId = event.source.userId!;
  const data = event.postback.data;
  const replyToken = event.replyToken;

  try {
    const user = await getUser(userId);
    
    if (data === 'action=subscribe') {
      const checkoutUrl = await createCheckoutSession(userId);
      await client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: '以下のリンクから有料プランにご登録ください：',
        }, {
          type: 'text',
          text: checkoutUrl!,
        }],
      });
    } else if (data === 'action=manage') {
      if (user?.stripeCustomerId) {
        const portalUrl = await getCustomerPortalUrl(user.stripeCustomerId);
        await client.replyMessage({
          replyToken,
          messages: [{
            type: 'text',
            text: '以下のリンクから契約状況の確認・変更ができます：',
          }, {
            type: 'text',
            text: portalUrl,
          }],
        });
      } else {
        await client.replyMessage({
          replyToken,
          messages: [{
            type: 'text',
            text: '現在無料プランをご利用中です。有料プランに登録すると契約管理ページをご利用いただけます。',
          }],
        });
      }
    }
  } catch (error) {
    console.error('Error handling postback:', error);
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: 'エラーが発生しました。しばらく経ってから再度お試しください。',
      }],
    });
  }
}