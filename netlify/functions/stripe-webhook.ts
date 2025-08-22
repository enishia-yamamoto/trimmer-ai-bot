import { Handler } from '@netlify/functions';
import { constructWebhookEvent } from '../../src/lib/stripe';
import { getUserByStripeCustomerId, updateUser, getUser } from '../../src/lib/googleSheets';
import Stripe from 'stripe';

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
  const lineUserId = session.metadata?.lineUserId;
  const customerId = session.customer as string;

  if (!lineUserId) {
    console.error('No LINE user ID in checkout session metadata');
    return;
  }

  try {
    const user = await getUser(lineUserId);
    if (user) {
      await updateUser(lineUserId, {
        stripeCustomerId: customerId,
        plan: 'premium',
        subscriptionStartDate: new Date().toISOString(),
        monthlyUsageCount: 0, // Reset usage count when upgrading
      });
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
        subscriptionStartDate: isActive ? new Date().toISOString() : undefined,
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