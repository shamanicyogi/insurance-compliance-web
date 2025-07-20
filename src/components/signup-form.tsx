"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/icons";
import { toast } from "sonner";

type Provider = "google" | "apple" | "strava";

export function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const invitationCode = searchParams.get("invitationCode");
  const prefilledEmail = searchParams.get("email");

  const [isLoading, setIsLoading] = useState<
    Record<Provider | "email", boolean>
  >({
    email: false,
    google: false,
    apple: false,
    strava: false,
  });

  // Auto-join company after authentication if invitation code exists
  useEffect(() => {
    const handleInvitationJoin = async () => {
      if (session?.user && invitationCode) {
        try {
          const response = await fetch("/api/snow-removal/companies/join", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ invitationCode }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            toast.success(`Welcome to ${data.companyName}!`);
            router.push("/dashboard");
          } else {
            toast.error(data.error || "Failed to join company");
          }
        } catch (error) {
          console.error("Error joining company:", error);
          toast.error("Failed to join company");
        }
      }
    };

    handleInvitationJoin();
  }, [session, invitationCode, router]);

  const handleOAuthSignIn = async (provider: Provider) => {
    try {
      setIsLoading((prev) => ({ ...prev, [provider]: true }));
      const result = await signIn(provider, {
        callbackUrl: invitationCode
          ? `/signup?invitationCode=${invitationCode}`
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
          : `Failed to sign in with ${provider}. Please try again.`;
      toast.error(errorMessage);
    } finally {
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {invitationCode ? "Join Your Team" : "Create an account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invitationCode
            ? "Create your account to accept the company invitation"
            : "Choose how you'd like to join SlipCheck"}
        </p>
        {prefilledEmail && (
          <p className="text-sm text-blue-600 font-medium">
            Invited: {prefilledEmail}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* Google OAuth */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading.google}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          {isLoading.google ? "Creating account..." : "Continue with Google"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted-foreground/20" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="text-center">
          <Link
            href={`/login${invitationCode ? `?invitationCode=${invitationCode}&email=${encodeURIComponent(prefilledEmail || "")}` : ""}`}
            className="text-sm text-primary hover:underline"
          >
            Use magic link instead →
          </Link>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login${invitationCode ? `?invitationCode=${invitationCode}&email=${encodeURIComponent(prefilledEmail || "")}` : ""}`}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
