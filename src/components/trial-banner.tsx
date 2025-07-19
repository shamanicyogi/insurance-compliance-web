"use client";

import { useSession } from "next-auth/react";
import { differenceInCalendarDays } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

// TODO: verify trial banner display
export default function TrialBanner() {
  const { data: session } = useSession();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  console.log(session, "session");
  console.log(daysLeft, "daysLeft");

  useEffect(() => {
    if (session?.user?.trialEndsAt) {
      const trialEndDate = new Date(session.user.trialEndsAt);
      // Use differenceInCalendarDays to compare dates without time parts.
      // This correctly handles the last day of the trial.
      const days = differenceInCalendarDays(trialEndDate, new Date());
      setDaysLeft(days);
    }
  }, [session]);

  // Don't show banner for users with active subscriptions
  if (
    !session?.user ||
    session.user.subscriptionStatus === "active" ||
    daysLeft === null
  ) {
    return null;
  }

  // Show expired message only when the trial has actually ended (daysLeft is negative).
  if (daysLeft < 0) {
    return (
      <div className="bg-destructive/10 text-center py-2 px-4 flex items-center justify-center gap-2 flex-wrap">
        <span className="text-sm font-medium">
          Your trial has ended. Upgrade now to continue using all features.
        </span>
        <Link
          href="/billing"
          className="text-sm font-medium underline hover:text-primary"
        >
          Upgrade
        </Link>
        <Badge variant="destructive" className="ml-2">
          Expired
        </Badge>
      </div>
    );
  }

  // If we reach here, the trial is active (0 or more days left).
  return (
    <div className="bg-primary text-primary-foreground text-center py-2 px-4 flex items-center justify-center gap-2 flex-wrap sticky top-0 z-50">
      <span className="text-sm font-medium">
        {daysLeft} {daysLeft === 1 ? "day" : "days"} left in your free trial.
      </span>
      <Link
        href="/billing"
        className="text-sm font-medium underline hover:text-white/80"
      >
        Upgrade now
      </Link>
      <Badge variant="secondary" className="ml-2">
        Trial
      </Badge>
    </div>
  );
}
