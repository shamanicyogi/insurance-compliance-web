"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import Link from "next/link";

type Provider = "google" | "apple" | "strava";

export function LoginForm({}: // className,
// ...props
React.ComponentProps<"form">) {
  const [isLoading, setIsLoading] = React.useState<
    Record<Provider | "email", boolean>
  >({
    email: false,
    google: false,
    apple: false,
    strava: false,
  });
  const [email, setEmail] = React.useState("");

  const handleOAuthSignIn = async (provider: Provider) => {
    try {
      setIsLoading((prev) => ({ ...prev, [provider]: true }));
      const result = await signIn(provider, {
        callbackUrl: "/dashboard",
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
      const result = await signIn("email", {
        email,
        callbackUrl: "/dashboard",
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
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Choose how you&apos;d like to sign in
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
              disabled={isLoading.email}
              required
            />
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
            {isLoading.google ? "Signing in..." : "Continue with Google"}
          </Button>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
