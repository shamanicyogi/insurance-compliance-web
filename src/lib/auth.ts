import NextAuth, { NextAuthOptions, User, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { supabase } from "@/lib/supabase";

// Custom email templates
function getCustomEmailHTML(url: string, email: string): string {
  const escapedEmail = email.replace(/[<>&"]/g, (c) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
    };
    return entities[c];
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to SlipCheck</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 8px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #1e293b;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #475569;
            margin-bottom: 32px;
            line-height: 1.7;
        }
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        .sign-in-button {
            display: inline-block;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
            transition: transform 0.2s ease;
        }
        .sign-in-button:hover {
            transform: translateY(-1px);
        }
        .alternative-link {
            margin-top: 24px;
            padding: 16px;
            background-color: #f1f5f9;
            border-radius: 8px;
            border-left: 4px solid #0ea5e9;
        }
        .alternative-link p {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #64748b;
        }
        .alternative-link a {
            color: #0ea5e9;
            word-break: break-all;
            font-size: 14px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 0;
            font-size: 14px;
            color: #64748b;
        }
        .security-note {
            margin-top: 32px;
            padding: 16px;
            background-color: #fef7cd;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
        }
        .security-note p {
            margin: 0;
            font-size: 14px;
            color: #92400e;
        }
        @media (max-width: 640px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding-left: 20px;
                padding-right: 20px;
            }
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div style="padding: 20px;">
        <div class="container">
            <div class="header">
                <h1>❄️ SlipCheck</h1>
                <p>Secure access to your account</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hello,
                </div>
                
                <div class="message">
                    You requested to sign in to your SlipCheck account using <strong>${escapedEmail}</strong>.
                    Click the button below to securely access your account.
                </div>
                
                <div class="button-container">
                    <a href="${url}" class="sign-in-button">
                        🔐 Sign In to Your Account
                    </a>
                </div>
                
                <div class="alternative-link">
                    <p><strong>Button not working?</strong> Copy and paste this link into your browser:</p>
                    <a href="${url}">${url}</a>
                </div>
                
                <div class="security-note">
                    <p>
                        <strong>🛡️ Security Note:</strong> This link will expire in 24 hours and can only be used once. 
                        If you didn't request this email, you can safely ignore it.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p>
                    SlipCheck • Secure • Reliable • Professional<br>
                    This is an automated message, please do not reply to this email.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function getCustomEmailText(url: string, email: string): string {
  return `
SlipCheck - Sign In Request

Hello,

You requested to sign in to your SlipCheck account using ${email}.

Click the link below to securely access your account:
${url}

This link will expire in 24 hours and can only be used once.

If you didn't request this email, you can safely ignore it.

---
SlipCheck
Secure • Reliable • Professional

This is an automated message, please do not reply to this email.
`;
}

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    // 🔐 Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    // ✉️ Email Provider using Resend with custom styling
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
      // Custom email templates with professional styling
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: provider.from,
              to: email,
              subject: "🔐 Sign in to SlipCheck",
              html: getCustomEmailHTML(url, email),
              text: getCustomEmailText(url, email),
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to send email: ${response.statusText}`);
          }
        } catch (error) {
          console.error("Error sending verification email:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn(params: { user: User }) {
      console.log(params, "params 🔥🔥🔥🔥🔥🔥");
      const { user } = params;
      console.log(user, "user 🔥🔥🔥🔥🔥🔥");
      // Block suspicious domains
      const suspiciousDomains = [
        "goodpostman.com",
        "3g8fg.net",
        "abv1020.net",
        "9pm.work",
        "clickbox.pro",
        "freepronmail.net",
        "ximtyl.com",
        "diarizatour.net",
      ];

      if (user.email) {
        const domain = user.email.split("@")[1]?.toLowerCase();
        if (suspiciousDomains.includes(domain)) {
          console.log(`Blocked suspicious email domain: ${domain}`);
          return false;
        }
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email);
      console.log(data, "data 🔥🔥🔥🔥🔥🔥");
      console.log(error, "error 🔥🔥🔥🔥🔥🔥");

      if (error) {
        console.error("Error checking user:", error);
        return false;
      }

      if (data.length > 0) {
        console.log("User already exists");
        return false;
      }

      console.log("User does not exist, creating user");
      try {
        const { error } = await supabase.from("users").insert({
          id: user.id,
          email: user.email!,
          display_name: user.name || user.email!.split("@")[0],
          avatar_url: user.image,
          auth_user_id: user.id,
        });

        console.log(error, "error 🔥🔥🔥🔥🔥🔥");

        if (error) {
          console.error("Error creating user profile:", error);
        }
      } catch (error) {
        console.error("Error in createUser event:", error);
      }

      return true;
    },
    async session({ session, user }: { session: Session; user: User }) {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  // events: {
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   async createUser({ user }: any) {
  //     console.log("CREATE USER CALLED ✅✅✅✅✅✅");
  //     // Create user profile in public.users table when user is created
  //     try {
  //       const { error } = await supabase.from("users").insert({
  //         id: user.id,
  //         email: user.email!,
  //         display_name: user.name || user.email!.split("@")[0],
  //         avatar_url: user.image,
  //         auth_user_id: user.id,
  //       });

  //       console.log(error, "error 🔥🔥🔥🔥🔥🔥");

  //       if (error) {
  //         console.error("Error creating user profile:", error);
  //       }
  //     } catch (error) {
  //       console.error("Error in createUser event:", error);
  //     }
  //   },
  // },
};

export default NextAuth(authOptions);
