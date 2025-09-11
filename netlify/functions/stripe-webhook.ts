import { Handler } from '@netlify/functions';
import { constructWebhookEvent } from '../../src/lib/stripe';
import { getUserByStripeCustomerId, updateUser, getUser } from '../../src/lib/googleSheets';
import Stripe from 'stripe';
import { getCurrentJSTString } from '../../src/lib/utils';

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

    const user = await getUser(lineUserId);
    console.log('Current user data:', user);
    
    if (user) {
      const updateData = {
        stripeCustomerId: customerId,
        plan: 'premium',
        subscriptionStartDate: getCurrentJSTString(),
        monthlyUsageCount: 0, // Reset usage count when upgrading
      };
      console.log('Updating user with:', updateData);
      
      await updateUser(lineUserId, updateData);
      console.log('User successfully updated to premium');
    } else {
      console.error('User not found in database:', lineUserId);
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
      await updateUser(user.lineUserId, {
        plan: isActive ? 'premium' : 'free',
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