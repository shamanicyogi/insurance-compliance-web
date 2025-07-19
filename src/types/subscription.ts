export interface SubscriptionDetails {
  id: string;
  userId: string;
  status: "trialing" | "active" | "canceled" | "incomplete";
  currentPeriodEnd: string;
  currentPeriodStart: string;
  createdAt: string;
  updatedAt: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  canceledAt?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
}

export interface CustomerPortalSession {
  url: string;
}

export interface SubscriptionPlan {
  name: string;
  description: string;
  stripePriceId: string;
  monthlyPrice: number;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
}

export interface CreateSubscriptionParams {
  userId: string;
  email: string;
  priceId: string;
  trialPeriodDays?: number;
}
