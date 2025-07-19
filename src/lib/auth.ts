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
    url: process.env.SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
    }),
    // Keep Google OAuth as backup option
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      try {
        console.log("SignIn callback triggered for user:", user.email);

        if (!user.id || !user.email) {
          console.error("Missing user ID or email in signIn callback");
          return false;
        }

        // NextAuth + SupabaseAdapter creates user in auth.users automatically
        // We also need to create corresponding record in public.users for our app profiles

        // Check if user already exists in our custom public.users table
        const { data: existingUser, error: checkError } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 is "not found" error, which is expected for new users
          console.error("Error checking existing user:", checkError);
          return false;
        }

        // If user doesn't exist in our custom table, create them
        if (!existingUser) {
          console.log(
            "Creating new user profile in public.users for:",
            user.email
          );

          const { error: insertError } = await supabaseAdmin
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              auth_user_id: user.id,
              display_name: user.name || user.email?.split("@")[0],
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Error creating user profile:", insertError);
            return false;
          }

          console.log("✅ User profile created successfully in public.users");
        } else {
          console.log("✅ User profile already exists in public.users");
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      // Include user ID in JWT token
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Include user ID in session from token
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

// Export the admin client for use in API routes
export { supabaseAdmin };
