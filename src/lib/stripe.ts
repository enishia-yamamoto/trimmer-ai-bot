import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function createCheckoutSession(lineUserId: string, plan?: string, customerEmail?: string) {
  try {
    // プランに応じた価格IDを選択（環境変数から取得、デフォルトは月額）
    let selectedPriceId: string;
    
    if (plan === 'yearly') {
      selectedPriceId = process.env.STRIPE_PRICE_ID_YEARLY!;
    } else {
      // デフォルトまたは明示的にmonthlyが指定された場合
      selectedPriceId = process.env.STRIPE_PRICE_ID_MONTHLY!;
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/cancel`,
      metadata: {
        lineUserId,
      },
      customer_email: customerEmail,
    });

    return session.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function getCustomerPortalUrl(customerId: string) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.APP_URL,
    });
    return session.url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}