"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import Link from "next/link";

type Provider = "google";

export function AccountCreationStep() {
  const [isLoading, setIsLoading] = useState<
    Record<Provider | "email", boolean>
  >({
    email: false,
    google: false,
  });

  const handleOAuthSignIn = async (provider: Provider) => {
    try {
      setIsLoading((prev) => ({ ...prev, [provider]: true }));
      const result = await signIn(provider, {
        callbackUrl: "/onboarding/finalize",
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

  // const handleEmailSignIn = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const email =
  //     e.currentTarget.querySelector<HTMLInputElement>("#email")?.value;

  //   try {
  //     setIsLoading((prev) => ({ ...prev, email: true }));
  //     const result = await signIn("email", {
  //       email,
  //       redirect: false,
  //       callbackUrl: "/dashboard",
  //       prompt: "select_account",
  //     });

  //     if (result?.error) {
  //       throw new Error(result.error);
  //     }

  //     toast.success("Check your email for the login link!");
  //   } catch (error: Error | unknown) {
  //     const errorMessage =
  //       error instanceof Error
  //         ? error.message
  //         : "Failed to send login link. Please try again.";
  //     toast.error(errorMessage);
  //   } finally {
  //     setIsLoading((prev) => ({ ...prev, email: false }));
  //   }
  // };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center  ">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-muted-foreground">
          Your plan is all set! Create an account to save your progress and
          start tracking.
        </p>
      </div>

      <div className="space-y-4  ">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading.google}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          {isLoading.google ? "Creating account..." : "Continue with Google"}
        </Button>
      </div>
      {/* 
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div> */}

      {/* <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading.email}>
          {isLoading.email ? "Sending link..." : "Continue with email"}
        </Button>
      </form> */}

      <p className="text-center text-sm text-muted-foreground  animate__delay-2s">
        By continuing, you agree to our{" "}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:text-primary"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="https://www.privacypolicies.com/live/f6c653eb-825a-45d9-b966-b413973d4c13"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-primary"
        >
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
