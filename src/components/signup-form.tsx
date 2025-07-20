"use client";

import type React from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import { Building2, Shield } from "lucide-react";

type Provider = "google" | "apple" | "strava";

export function SignUpForm() {
  const searchParams = useSearchParams();

  const invitationCode =
    searchParams.get("invitation") || searchParams.get("invitationCode");
  const companyName = searchParams.get("company");
  const inviterName = searchParams.get("inviter");
  const prefilledEmail = searchParams.get("email");

  const [isLoading, setIsLoading] = useState<
    Record<Provider | "email", boolean>
  >({
    email: false,
    google: false,
    apple: false,
    strava: false,
  });
  const [email, setEmail] = useState(prefilledEmail || "");

  const handleOAuthSignIn = async (provider: Provider) => {
    try {
      setIsLoading((prev) => ({ ...prev, [provider]: true }));
      const result = await signIn(provider, {
        callbackUrl: invitationCode
          ? `/signup?invitation=${invitationCode}${companyName ? `&company=${encodeURIComponent(companyName)}` : ""}${inviterName ? `&inviter=${encodeURIComponent(inviterName)}` : ""}`
          : "/dashboard",
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
          : `Failed to sign up with ${provider}. Please try again.`;
      toast.error(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setIsLoading((prev) => ({ ...prev, email: true }));
      const result = await signIn("email", {
        email,
        callbackUrl: invitationCode
          ? `/signup?invitation=${invitationCode}${companyName ? `&company=${encodeURIComponent(companyName)}` : ""}${inviterName ? `&inviter=${encodeURIComponent(inviterName)}` : ""}`
          : "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Check your email for a sign-up link!");
    } catch (error: Error | unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send sign-up email. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, email: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Rich invitation context banner */}
      {invitationCode && companyName && (
        <div className="text-center space-y-3 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex justify-center">
            <div className="p-2 bg-green-100 rounded-full">
              <Building2 className="h-6 w-6 text-green-600" />
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
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Create your account to join the team
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">
          {invitationCode ? "Join Your Team" : "Create an account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invitationCode
            ? "Create your account to accept the company invitation"
            : "Choose how you'd like to sign up"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Email Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-3">
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

        {/* Google OAuth - only show if configured */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleOAuthSignIn("google")}
            disabled={isLoading.google}
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            {isLoading.google ? "Creating account..." : "Continue with Google"}
          </Button>
        )}
      </div>
    </div>
  );
}
