"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import Link from "next/link";
import { Building2, Shield } from "lucide-react";

type Provider = "google" | "apple" | "strava";

export function LoginForm({}: // className,
// ...props
React.ComponentProps<"form">) {
  const searchParams = useSearchParams();
  // const router = useRouter();
  // const { data: session } = useSession();

  const invitationCode =
    searchParams.get("invitation") || searchParams.get("invitationCode");
  const companyName = searchParams.get("company");
  const inviterName = searchParams.get("inviter");
  const prefilledEmail = searchParams.get("email");

  const [isLoading, setIsLoading] = React.useState<
    Record<Provider | "email", boolean>
  >({
    email: false,
    google: false,
    apple: false,
    strava: false,
  });
  const [email, setEmail] = React.useState(prefilledEmail || "");
  //
  //   // Auto-join company after authentication if invitation code exists
  //   React.useEffect(() => {
  //     const handleInvitationJoin = async () => {
  //       if (session?.user && invitationCode) {
  //         try {
  //           const response = await fetch("/api/snow-removal/companies/join", {
  //             method: "POST",
  //             headers: {
  //               "Content-Type": "application/json",
  //             },
  //             credentials: "include",
  //             body: JSON.stringify({ invitationCode }),
  //           });
  //
  //           const data = await response.json();
  //
  //           if (response.ok && data.success) {
  //             toast.success(`Welcome to ${data.companyName}!`);
  //             router.push("/dashboard");
  //           } else {
  //             toast.error(data.error || "Failed to join company");
  //           }
  //         } catch (error) {
  //           console.error("Error joining company:", error);
  //           toast.error("Failed to join company");
  //         }
  //       }
  //     };
  //
  //     handleInvitationJoin();
  //   }, [session, invitationCode, router]);

  const handleOAuthSignIn = async (provider: Provider) => {
    try {
      setIsLoading((prev) => ({ ...prev, [provider]: true }));

      // If there's an invitation, redirect directly to onboarding with params
      const callbackUrl = invitationCode
        ? `/snow-removal/onboarding?invitation=${invitationCode}${companyName ? `&company=${encodeURIComponent(companyName)}` : ""}${inviterName ? `&inviter=${encodeURIComponent(inviterName)}` : ""}${prefilledEmail ? `&email=${encodeURIComponent(prefilledEmail)}` : ""}`
        : "/dashboard";

      const result = await signIn(provider, {
        callbackUrl,
        redirect: false,
        prompt: "select_account",
      });

      if (result?.error) {
        throw new Error(result.error);
      }
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to sign in with ${provider}. Please try again.`;
      toast.error(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setIsLoading((prev) => ({ ...prev, email: true }));

      // If there's an invitation, redirect directly to onboarding with params
      const callbackUrl = invitationCode
        ? `/snow-removal/onboarding?invitation=${invitationCode}${companyName ? `&company=${encodeURIComponent(companyName)}` : ""}${inviterName ? `&inviter=${encodeURIComponent(inviterName)}` : ""}${email ? `&email=${encodeURIComponent(email)}` : ""}`
        : "/dashboard";

      const result = await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Check your email for a sign-in link!");
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send sign-in email. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, email: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Rich invitation context banner */}
      {invitationCode && companyName && (
        <div className="text-center space-y-3 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex justify-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              You&apos;ve been invited to join {companyName}
            </h1>
            {inviterName && inviterName !== "Your team" && (
              <p className="text-sm text-gray-600 mt-1">
                {inviterName} invited you to collaborate
              </p>
            )}
            <div className="flex items-center justify-center mt-2 gap-1">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Sign in or create an account to get started
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">
          {invitationCode ? "Join Your Team" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invitationCode
            ? "Sign in to accept your company invitation"
            : "Choose how you'd like to sign in"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading.email || !!prefilledEmail}
              required
            />
            {prefilledEmail && (
              <p className="text-xs text-muted-foreground">
                This email was invited to join the company
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading.email}>
            {isLoading.email ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              or continue with
            </span>
          </div>
        </div>

        {/* Google OAuth */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading.google}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          {isLoading.google ? "Signing in..." : "Continue with Google"}
        </Button>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={`/signup${invitationCode ? `?invitation=${invitationCode}${companyName ? `&company=${encodeURIComponent(companyName)}` : ""}${inviterName ? `&inviter=${encodeURIComponent(inviterName)}` : ""}&email=${encodeURIComponent(email)}` : ""}`}
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
