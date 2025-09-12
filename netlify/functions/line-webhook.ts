import { Handler } from '@netlify/functions';
import * as line from '@line/bot-sdk';
import { getUser, createUser, updateUser, incrementUsageCount } from '../../src/lib/googleSheets';
import { sendMessageToDify } from '../../src/lib/dify';
import { createCheckoutSession, createPlanChangeCheckoutSession, getCustomerPortalUrl } from '../../src/lib/stripe';
import { getCurrentJSTString } from '../../src/lib/utils';

const config: line.MiddlewareConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});

const FREE_PLAN_LIMIT = parseInt(process.env.FREE_PLAN_LIMIT || '10');

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
    if (messageText === 'サブスクリプション') {
      const user = await getUser(userId);
      console.log('Subscription command - User data:', JSON.stringify(user, null, 2));
      
      // 有料プランかどうかを判定（monthly, yearlyが有料）
      const isPaidUser = user && (user.plan === 'monthly' || user.plan === 'yearly');
      console.log('Is paid user:', isPaidUser, 'Plan:', user?.plan);
      
      if (!isPaidUser) {
        // 無料ユーザー向け：プラン選択Flexメッセージ
        await client.replyMessage({
          replyToken,
          messages: [{
            type: 'flex',
            altText: 'プラン選択',
            contents: {
              type: 'bubble',
              header: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                  type: 'text',
                  text: 'プランを選択してください',
                  weight: 'bold',
                  size: 'lg',
                  align: 'center',
                  color: '#333333'
                }]
              },
              body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                  // 月額プラン
                  {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#f8f8f8',
                    cornerRadius: 'md',
                    paddingAll: 'lg',
                    contents: [
                      {
                        type: 'text',
                        text: '月額プラン',
                        weight: 'bold',
                        size: 'lg',
                        color: '#333333'
                      },
                      {
                        type: 'text',
                        text: '990円/月（税込）',
                        size: 'md',
                        color: '#06C755',
                        margin: 'sm'
                      },
                      {
                        type: 'text',
                        text: 'いつでも解約可能',
                        size: 'sm',
                        color: '#666666',
                        margin: 'xs'
                      }
                    ]
                  },
                  {
                    type: 'button',
                    action: {
                      type: 'uri',
                      label: '月額プランで登録',
                      uri: `https://liff.line.me/2007989671-db0QbRb3?plan=monthly`
                    },
                    style: 'primary',
                    color: '#06C755',
                    height: 'md'
                  },
                  {
                    type: 'separator',
                    margin: 'lg'
                  },
                  // 年額プラン
                  {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#fff8e1',
                    cornerRadius: 'md',
                    paddingAll: 'lg',
                    contents: [
                      {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                          {
                            type: 'text',
                            text: '年額プラン',
                            weight: 'bold',
                            size: 'lg',
                            color: '#333333',
                            flex: 0
                          },
                          {
                            type: 'text',
                            text: 'お得！',
                            size: 'xs',
                            color: '#ff5722',
                            weight: 'bold',
                            margin: 'md',
                            flex: 0
                          }
                        ]
                      },
                      {
                        type: 'text',
                        text: '9,900円/年（税込）',
                        size: 'md',
                        color: '#FF9800',
                        margin: 'sm',
                        weight: 'bold'
                      },
                      {
                        type: 'text',
                        text: '月額プランより2ヶ月分お得',
                        size: 'sm',
                        color: '#666666',
                        margin: 'xs'
                      }
                    ]
                  },
                  {
                    type: 'button',
                    action: {
                      type: 'uri',
                      label: '年額プランで登録',
                      uri: `https://liff.line.me/2007989671-db0QbRb3?plan=yearly`
                    },
                    style: 'primary',
                    color: '#FF9800',
                    height: 'md'
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [{
                  type: 'text',
                  text: '※無料プランは月10回まで利用可能',
                  size: 'xs',
                  color: '#999999',
                  align: 'center'
                }]
              }
            }
          }]
        });
      } else {
        // 有料ユーザー向け：契約状況表示とプラン変更オプション
        const currentPlan = user.plan === 'monthly' ? '月額プラン' : '年額プラン';
        const currentPrice = user.plan === 'monthly' ? '990円/月' : '9,900円/年';
        const portalUrl = await getCustomerPortalUrl(user.stripeCustomerId!);
        
        // プラン変更用のCheckout URLを事前に生成
        const targetPlan = user.plan === 'monthly' ? 'yearly' : 'monthly';
        const changePlanUrl = await createPlanChangeCheckoutSession(
          user.lineUserId, 
          user.stripeCustomerId!, 
          targetPlan as 'monthly' | 'yearly'
        );
        
        // プラン変更ボタンの設定（直接URLへ遷移）
        const changePlanButton = user.plan === 'monthly' ? {
          type: 'button' as const,
          action: {
            type: 'uri' as const,
            label: '年額プランに変更（2ヶ月分お得！）',
            uri: changePlanUrl!
          },
          style: 'secondary' as const,
          color: '#FF9800',
          height: 'md' as const
        } : {
          type: 'button' as const,
          action: {
            type: 'uri' as const,
            label: '月額プランに変更',
            uri: changePlanUrl!
          },
          style: 'secondary' as const,
          color: '#06C755',
          height: 'md' as const
        };
        
        await client.replyMessage({
          replyToken,
          messages: [{
            type: 'flex',
            altText: '契約状況',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: '現在のプラン',
                    weight: 'bold',
                    size: 'sm',
                    color: '#666666'
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                      {
                        type: 'text',
                        text: currentPlan,
                        weight: 'bold',
                        size: 'xl',
                        color: '#06C755',
                        flex: 0
                      },
                      {
                        type: 'text',
                        text: currentPrice,
                        size: 'md',
                        color: '#333333',
                        margin: 'md',
                        flex: 0,
                        gravity: 'bottom'
                      }
                    ]
                  },
                  {
                    type: 'separator',
                    margin: 'lg'
                  },
                  {
                    type: 'text',
                    text: 'プラン変更',
                    weight: 'bold',
                    size: 'md',
                    color: '#333333',
                    margin: 'lg'
                  },
                  changePlanButton,
                  {
                    type: 'separator',
                    margin: 'lg'
                  },
                  {
                    type: 'text',
                    text: 'その他の管理',
                    size: 'sm',
                    color: '#666666',
                    margin: 'lg'
                  },
                  {
                    type: 'button',
                    action: {
                      type: 'uri',
                      label: '契約管理ページ',
                      uri: portalUrl
                    },
                    style: 'secondary',
                    color: '#4169E1',
                    height: 'sm'
                  },
                  {
                    type: 'text',
                    text: '※支払い方法変更・請求書確認・解約',
                    size: 'xs',
                    color: '#999999',
                    margin: 'sm',
                    align: 'center'
                  }
                ]
              }
            }
          }]
        });
      }
      return;
    }
    
    // 既存の処理（後方互換性のため残しておく）
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
      await client.replyMessage({
        replyToken,
        messages: [{
          type: 'flex',
          altText: '利用回数制限のお知らせ',
          contents: {
            type: 'bubble',
            header: {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#FFF3E0',
              contents: [{
                type: 'text',
                text: '⚠️ 利用回数制限',
                weight: 'bold',
                size: 'lg',
                align: 'center',
                color: '#E65100'
              }]
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'text',
                  text: `今月の無料利用回数（${FREE_PLAN_LIMIT}回）を使い切りました`,
                  weight: 'bold',
                  size: 'md',
                  color: '#333333',
                  wrap: true
                },
                {
                  type: 'text',
                  text: '有料プランに登録すると、無制限でご利用いただけます',
                  size: 'sm',
                  color: '#666666',
                  margin: 'sm',
                  wrap: true
                },
                {
                  type: 'separator',
                  margin: 'lg'
                },
                // 月額プラン
                {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#f8f8f8',
                  cornerRadius: 'md',
                  paddingAll: 'lg',
                  contents: [
                    {
                      type: 'text',
                      text: '月額プラン',
                      weight: 'bold',
                      size: 'lg',
                      color: '#333333'
                    },
                    {
                      type: 'text',
                      text: '990円/月（税込）',
                      size: 'md',
                      color: '#06C755',
                      margin: 'sm'
                    },
                    {
                      type: 'text',
                      text: 'いつでも解約可能',
                      size: 'sm',
                      color: '#666666',
                      margin: 'xs'
                    }
                  ]
                },
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '月額プランで登録',
                    uri: `https://liff.line.me/2007989671-db0QbRb3?plan=monthly`
                  },
                  style: 'primary',
                  color: '#06C755',
                  height: 'md'
                },
                {
                  type: 'separator',
                  margin: 'lg'
                },
                // 年額プラン
                {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#fff8e1',
                  cornerRadius: 'md',
                  paddingAll: 'lg',
                  contents: [
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        {
                          type: 'text',
                          text: '年額プラン',
                          weight: 'bold',
                          size: 'lg',
                          color: '#333333',
                          flex: 0
                        },
                        {
                          type: 'text',
                          text: 'お得！',
                          size: 'xs',
                          color: '#ff5722',
                          weight: 'bold',
                          margin: 'md',
                          flex: 0
                        }
                      ]
                    },
                    {
                      type: 'text',
                      text: '9,900円/年（税込）',
                      size: 'md',
                      color: '#FF9800',
                      margin: 'sm',
                      weight: 'bold'
                    },
                    {
                      type: 'text',
                      text: '月額プランより2ヶ月分お得',
                      size: 'sm',
                      color: '#666666',
                      margin: 'xs'
                    }
                  ]
                },
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '年額プランで登録',
                    uri: `https://liff.line.me/2007989671-db0QbRb3?plan=yearly`
                  },
                  style: 'primary',
                  color: '#FF9800',
                  height: 'md'
                }
              ]
            }
          }
        }]
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
        lastUsedDate: getCurrentJSTString(),
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
          lastUsedDate: getCurrentJSTString(),
        });
      } else {
        // Premium users: only update conversation ID and last used date
        await updateUser(userId, {
          difyConversationId: difyResponse.conversation_id,
          lastUsedDate: getCurrentJSTString(),
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
  } catch (error: any) {
    console.error('Error handling text message:', error);
    
    // エラーの種類に応じたメッセージ
    let errorMessage = 'エラーが発生しました。しばらく経ってから再度お試しください。';
    
    if (error.response?.data?.message?.includes('overloaded')) {
      errorMessage = 'ただいまサーバーが混雑しています。少し時間をおいてから再度お試しください。';
    } else if (error.message?.includes('Failed to process message with AI')) {
      errorMessage = 'AIの処理でエラーが発生しました。しばらくお待ちください。';
    }
    
    await client.replyMessage({
      replyToken,
      messages: [{
        type: 'text',
        text: errorMessage,
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
        lastUsedDate: getCurrentJSTString(),
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