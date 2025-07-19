import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      onboardingCompleted: boolean;
      displayName: string;
      unitPreference: string;
      subscriptionStatus?:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | null;
      trialEndsAt?: string | null;
      hasActiveSubscription?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    onboardingCompleted?: boolean;
  }
}
