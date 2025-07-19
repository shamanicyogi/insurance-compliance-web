import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabase } from "./supabase";
import { TRIAL_PERIOD_DAYS } from "./stripe";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signIn({ user, account, profile }) {
      console.log("🚀 signIn callback triggered");
      console.log("User email:", user.email);

      // Check if the user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();

      if (!existingUser) {
        console.log("👤 Creating new user");
        // Create new user
        const { error: insertError } = await supabase.from("users").insert({
          email: user.email,
          name: user.name,
          provider_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // created_at: new Date().toLocaleDateString("en-CA"), - KEEP AN EYE ON THIS CHANGE IF AUTH PROBLEMS ARISE
          // updated_at: new Date().toLocaleDateString("en-CA"),

          trial_ends_at: new Date(
            Date.now() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000
          ).toISOString(),
        });

        if (insertError) {
          console.error(
            "❌ Failed to create user in public.users:",
            insertError
          );
          return false;
        }
        console.log("✅ New user created successfully");
      } else {
        console.log("👤 Existing user found");
      }

      // Note: Onboarding data processing is now handled by the /onboarding/finalize page
      // This ensures a centralized and consistent flow for all users
      console.log("ℹ️ Onboarding data processing delegated to finalize page");

      return true;
    },

    // JWT callback - runs whenever a JWT is created, updated, or accessed
    async jwt({ token, trigger }) {
      // Only fetch user data if this is a fresh token or session update
      if (
        trigger === "signIn" ||
        trigger === "update" ||
        !token.onboardingCompleted
      ) {
        if (token.email) {
          const { data: userData } = await supabase
            .from("users")
            .select("id, onboarding_completed, subscription_status")
            .eq("email", token.email)
            .single();

          if (userData) {
            token.userId = userData.id;
            token.onboardingCompleted = userData.onboarding_completed || false;
            token.hasActiveSubscription =
              (userData.subscription_status &&
                userData.subscription_status.toLowerCase() === "active") ||
              false;
          }
        }
      }
      return token;
    },

    async session({ session }) {
      if (session.user) {
        const { data: userData } = await supabase
          .from("users")
          .select(
            "id, onboarding_completed, display_name, unit_preference, trial_ends_at, subscription_status"
          )
          .eq("email", session.user.email)
          .single();

        if (userData) {
          session.user.id = userData.id;
          session.user.onboardingCompleted =
            userData.onboarding_completed || false;
          session.user.displayName = userData.display_name;
          session.user.unitPreference = userData.unit_preference;

          // Add subscription information
          session.user.trialEndsAt = userData.trial_ends_at;
          session.user.subscriptionStatus = userData.subscription_status;

          // Check if user has an active subscription or is in trial period
          const trialEndsDate = new Date(userData.trial_ends_at);
          trialEndsDate.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const trialActive = userData.trial_ends_at && trialEndsDate >= today;

          const subscriptionActive =
            userData.subscription_status === "active" ||
            userData.subscription_status === "trialing";

          session.user.hasActiveSubscription =
            subscriptionActive || trialActive;
        }
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // If URL contains onboarding/finalize, respect that
      if (url.includes("/onboarding/finalize")) {
        return `${baseUrl}/onboarding/finalize`;
      }

      // Always redirect to dashboard after sign-in unless a safe URL is provided
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};
