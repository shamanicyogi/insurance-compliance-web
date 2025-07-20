import { Resend } from "resend";

// Initialize Resend (lazy loading)
let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable not configured");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface InvitationEmailData {
  email: string;
  companyName: string;
  invitationCode: string;
  inviterName?: string;
  role: string;
}

export async function sendInvitationEmail(data: InvitationEmailData) {
  try {
    const resendClient = getResend();

    const { email, companyName, invitationCode, inviterName, role } = data;

    // Create rich login URL with invitation context
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const loginUrl = `${baseUrl}/login?invitation=${invitationCode}&company=${encodeURIComponent(companyName)}&inviter=${encodeURIComponent(inviterName || "Your team")}&email=${encodeURIComponent(email)}`;
    const signupUrl = `${baseUrl}/signup?invitation=${invitationCode}&company=${encodeURIComponent(companyName)}&inviter=${encodeURIComponent(inviterName || "Your team")}&email=${encodeURIComponent(email)}`;

    const result = await resendClient.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@slipcheck.pro",
      to: email,
      subject: `You're invited to join ${companyName} on SlipCheck`,
      html: createInvitationEmailTemplate({
        companyName,
        invitationCode,
        loginUrl,
        signupUrl,
        inviterName,
        role,
      }),
    });

    console.log("✅ Invitation email sent successfully:", result);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("❌ Failed to send invitation email:", error);
    throw new Error(
      `Failed to send invitation email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

interface EmailTemplateData {
  companyName: string;
  invitationCode: string;
  loginUrl: string;
  signupUrl: string;
  inviterName?: string;
  role: string;
}

function createInvitationEmailTemplate(data: EmailTemplateData): string {
  const {
    companyName,
    invitationCode,
    loginUrl,
    signupUrl,
    inviterName,
    role,
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Join ${companyName}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          background: #f8fafc;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e2e8f0;
        }
        .invitation-code {
          background: #1e40af;
          color: white;
          padding: 15px 25px;
          border-radius: 6px;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          letter-spacing: 2px;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 14px;
          color: #6b7280;
        }
        .role-badge {
          background: #3b82f6;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏔️ You're Invited!</h1>
        <p>Join ${companyName} as a <span class="role-badge">${role}</span></p>
      </div>
      
      <div class="content">
        ${inviterName ? `<p><strong>${inviterName}</strong> has invited you to join the ${companyName} team on SlipCheck.</p>` : `<p>You've been invited to join the ${companyName} team on SlipCheck.</p>`}
        
        <p>Click below to join your team:</p>
        
        <div style="text-align: center; margin: 20px 0;">
          <a href="${loginUrl}" class="cta-button">Join ${companyName}</a>
        </div>
        
        <p style="text-align: center; margin: 10px 0;">
          <span style="font-size: 14px; color: #6b7280;">
            Already have an account? <a href="${loginUrl}" style="color: #3b82f6;">Sign in here</a><br/>
            New to SlipCheck? <a href="${signupUrl}" style="color: #3b82f6;">Create account here</a>
          </span>
        </p>
        
        <div class="invitation-code">${invitationCode}</div>
        <p style="text-align: center; font-size: 12px; color: #6b7280;">
          Invitation Code (if needed)
        </p>
        
        <p><strong>What's next?</strong></p>
        <ol>
          <li>Click the "Join ${companyName}" button above</li>
          <li>Sign in with your existing account or create a new one</li>
          <li>You'll automatically be added to the team</li>
          <li>Start managing snow removal reports!</li>
        </ol>
        
        <div class="footer">
          <p><strong>Important:</strong> This invitation expires in 7 days.</p>
          <p>If you have any questions, please contact your team administrator.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
