import { Handler } from '@netlify/functions';
import { constructWebhookEvent } from '../../src/lib/stripe';
import { getUserByStripeCustomerId, updateUser, getUser, createUser } from '../../src/lib/googleSheets';
import Stripe from 'stripe';
import { getCurrentJSTString } from '../../src/lib/utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signature = event.headers['stripe-signature'];
  if (!signature) {
    return { statusCode: 400, body: 'Missing signature' };
  }

  try {
    const stripeEvent = constructWebhookEvent(event.body!, signature);

    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(stripeEvent);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent);
        break;
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return { statusCode: 400, body: 'Webhook Error' };
  }
};

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  console.log('Checkout completed event received:', {
    sessionId: session.id,
    customerId: session.customer,
    metadata: session.metadata,
  });
  
  const lineUserId = session.metadata?.lineUserId;
  const customerId = session.customer as string;

  if (!lineUserId) {
    console.error('No LINE user ID in checkout session metadata');
    return;
  }

  console.log('Processing checkout for LINE user:', lineUserId);

  try {
    // Stripe顧客にLINE IDをメタデータとして保存
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY!);
    await stripe.customers.update(customerId, {
      metadata: {
        lineUserId: lineUserId,
      },
    });
    console.log('Updated Stripe customer metadata with LINE ID');

    // サブスクリプション情報を取得して月額/年額を判定
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });
    
    let plan: 'monthly' | 'yearly' = 'monthly'; // デフォルト
    let newSubscriptionId: string | undefined;
    
    // 最新のサブスクリプションからプランを判定
    if (subscriptions.data.length > 0) {
      // 最新のサブスクリプションを取得（作成日時でソート）
      const latestSubscription = subscriptions.data.sort((a, b) => b.created - a.created)[0];
      newSubscriptionId = latestSubscription.id;
      const priceId = latestSubscription.items.data[0].price.id;
      
      if (priceId === 'price_1S64mMFJbdvgWrDEYWn8lEy7' || priceId === process.env.STRIPE_PRICE_ID_YEARLY) {
        plan = 'yearly';
      }
      
      // 複数のアクティブなサブスクリプションがある場合、古いものをキャンセル
      if (subscriptions.data.length > 1) {
        console.log(`Found ${subscriptions.data.length} active subscriptions. Cancelling old ones...`);
        
        for (const subscription of subscriptions.data) {
          if (subscription.id !== newSubscriptionId) {
            console.log(`Cancelling old subscription immediately: ${subscription.id}`);
            // 即座にキャンセル（日割り計算が適用される）
            await stripe.subscriptions.cancel(subscription.id, {
              prorate: true, // 日割り計算を有効化
              invoice_now: true // 即座に請求書を作成（返金がある場合）
            });
            console.log(`Old subscription ${subscription.id} cancelled with proration`);
          }
        }
      }
    }
    
    const user = await getUser(lineUserId);
    console.log('Current user data:', user);
    
    if (user) {
      // 既存ユーザーの場合：更新
      const updateData = {
        stripeCustomerId: customerId,
        plan: plan as 'monthly' | 'yearly',
        subscriptionStartDate: getCurrentJSTString(),
        monthlyUsageCount: 0, // Reset usage count when upgrading
      };
      console.log('Updating existing user with:', updateData);
      
      await updateUser(lineUserId, updateData);
      console.log(`User successfully updated to ${plan} plan`);
    } else {
      // 新規ユーザーの場合：作成
      console.log('User not found, creating new user with LINE ID:', lineUserId);
      
      // Stripe顧客情報から名前を取得（あれば）
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const displayName = customer.name || customer.email?.split('@')[0] || 'ユーザー';
      
      await createUser({
        lineUserId: lineUserId,
        displayName: displayName,
        difyConversationId: '',
        plan: plan,
        monthlyUsageCount: 0,
        lastUsedDate: getCurrentJSTString(),
        subscriptionStartDate: getCurrentJSTString(),
        stripeCustomerId: customerId,
      });
      
      console.log(`New user created with ${plan} plan`);
    }
  } catch (error) {
    console.error('Error updating user after checkout:', error);
  }
}

async function handleSubscriptionUpdate(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  try {
    const user = await getUserByStripeCustomerId(customerId);
    if (user) {
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      
      // 価格IDから月額/年額を判定
      let plan: 'free' | 'monthly' | 'yearly' = 'free';
      if (isActive && subscription.items.data.length > 0) {
        const priceId = subscription.items.data[0].price.id;
        if (priceId === 'price_1S64m6FJbdvgWrDEfvPJgEjp' || priceId === process.env.STRIPE_PRICE_ID_MONTHLY) {
          plan = 'monthly';
        } else if (priceId === 'price_1S64mMFJbdvgWrDEYWn8lEy7' || priceId === process.env.STRIPE_PRICE_ID_YEARLY) {
          plan = 'yearly';
        }
      }
      
      await updateUser(user.lineUserId, {
        plan: plan,
        subscriptionStartDate: isActive ? getCurrentJSTString() : undefined,
      });
    }
  } catch (error) {
    console.error('Error updating user subscription:', error);
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  try {
    const user = await getUserByStripeCustomerId(customerId);
    if (user) {
      await updateUser(user.lineUserId, {
        plan: 'free',
        monthlyUsageCount: 0, // Reset usage count when downgrading
      });
    }
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}