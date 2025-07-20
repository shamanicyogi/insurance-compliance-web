"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationCode = searchParams.get("code");

  useEffect(() => {
    if (invitationCode) {
      // Redirect to login with invitation code
      router.push(`/login?invitation=${invitationCode}`);
    } else {
      // Redirect to homepage if no code
      router.push("/");
    }
  }, [invitationCode, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Redirecting...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {invitationCode
              ? "Taking you to the login page to join your team..."
              : "Redirecting you to the homepage..."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
