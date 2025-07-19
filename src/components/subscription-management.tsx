"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function SubscriptionManagement() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Calculate days left in trial
  const daysLeft = session?.user?.trialEndsAt
    ? Math.max(
        0,
        differenceInDays(new Date(session.user.trialEndsAt), new Date())
      )
    : 0;

  const isTrialing = daysLeft > 0;
  const isActive = session?.user?.subscriptionStatus === "active";
  const hasExpired = !isTrialing && !isActive;

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        toast.error("Failed to load Stripe");
        return;
      }

      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err: unknown) {
      console.error("Checkout error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      console.error("Portal error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <Card style={{ maxWidth: "92%" }}>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your subscription plan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status:</p>
              <div className="flex items-center mt-1">
                {isActive && (
                  <Badge variant="default" className="bg-green-500">
                    Active
                  </Badge>
                )}
                {isTrialing && (
                  <Badge variant="outline">
                    Trial - {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                  </Badge>
                )}
                {hasExpired && (
                  <Badge variant="destructive">Trial Expired</Badge>
                )}
              </div>
            </div>
            {isActive && (
              <div>
                <p className="font-medium">Plan:</p>
                <p className="text-sm mt-1">Precision Premium</p>
              </div>
            )}
          </div>

          {isActive && (
            <div>
              <p className="font-medium">Benefits:</p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Unlimited meal and workout logging</li>
                <li>Advanced analytics and insights</li>
                <li>Personalized recommendations</li>
                <li>Premium support</li>
              </ul>
            </div>
          )}

          {!isActive && (
            <div>
              <p className="font-medium">Premium Plan Benefits:</p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Unlimited meal and workout logging</li>
                <li>Advanced analytics and insights</li>
                <li>Personalized recommendations</li>
                <li>Premium support</li>
              </ul>
              <p className="text-sm mt-4">
                <span className="font-medium">Price:</span> $9.99/month
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isActive ? (
          <Button onClick={handleManageSubscription} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : null}
            Manage Subscription
          </Button>
        ) : (
          <Button onClick={handleCheckout} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : null}
            {isTrialing ? "Upgrade Now" : "Subscribe Now"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
