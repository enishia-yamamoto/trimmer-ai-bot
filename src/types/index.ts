export interface User {
  lineUserId: string;
  displayName: string;
  difyConversationId?: string;
  plan: 'free' | 'premium';
  monthlyUsageCount: number;
  subscriptionStartDate?: string;
  lastUsedDate: string;
  stripeCustomerId?: string;
}

export interface DifyResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
}

export interface StripeWebhookData {
  customer: string;
  subscription?: string;
  status?: string;
}