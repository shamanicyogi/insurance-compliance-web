"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface AuthCheckProps {
  children: React.ReactNode;
}

export function AuthCheck({ children }: AuthCheckProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (
      session?.user &&
      !session.user.onboardingCompleted &&
      pathname !== "/onboarding"
    ) {
      router.push("/onboarding");
    }
  }, [session, router, pathname]);

  if (status === "loading") {
    return <div>Loading session...</div>;
  }

  return <>{children}</>;
}
