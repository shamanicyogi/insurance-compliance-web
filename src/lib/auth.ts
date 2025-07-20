import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client for NextAuth (admin access)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "jwt",
  },
  providers: [
    // 🔑 Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    // ✉️ Email Provider using Resend
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 587,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: process.env.EMAIL_FROM || "onboarding@slipcheck.pro",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // Block suspicious domains
      const suspiciousDomains = [
        "goodpostman.com",
        "10minutemail.com",
        "guerrillamail.com",
      ];
      const emailDomain = user.email?.split("@")[1];
      if (suspiciousDomains.includes(emailDomain || "")) {
        console.log(`Blocked suspicious email domain: ${user.email}`);
        return false;
      }

      try {
        console.log("SignIn callback triggered for user:", user.email);

        if (!user.id || !user.email) {
          console.error("Missing user ID or email in signIn callback");
          return false;
        }

        // Check if user already exists in our custom public.users table BY EMAIL
        const { data: existingUser, error: checkError } = await supabaseAdmin
          .from("users")
          .select("id, auth_user_id")
          .eq("email", user.email)
          .single();

        console.log("Existing user check:", existingUser);

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 is "not found" error, which is expected for new users
          console.error("Error checking existing user:", checkError);
          return false;
        }

        // If user doesn't exist in our custom table, create them
        if (!existingUser) {
          console.log("Creating new user profile for:", user.email);

          const { error: insertError } = await supabaseAdmin
            .from("users")
            .insert({
              email: user.email,
              display_name: user.name || user.email?.split("@")[0],
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Error creating user profile:", insertError);
            return false;
          }

          console.log("✅ User profile created successfully");
        } else {
          console.log("✅ User profile already exists");
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

export { supabaseAdmin };
