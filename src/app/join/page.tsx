"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function JoinPage() {
  const searchParams = useSearchParams();
  const invitationCode = searchParams.get("code");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleJoin = async () => {
    if (!invitationCode) {
      toast.error("No invitation code provided");
      return;
    }

    setLoading(true);
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
      setResult(data);

      if (data.requiresAuth) {
        toast.info("Authentication required - redirecting to signup");
        window.location.href = data.signupUrl;
      } else if (data.success) {
        toast.success(`Welcome to ${data.companyName}!`);
      } else {
        toast.error(data.error || "Failed to join company");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Company Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitationCode ? (
            <>
              <p className="text-sm text-muted-foreground">
                Invitation Code:{" "}
                <code className="bg-muted px-1 rounded">{invitationCode}</code>
              </p>
              <Button
                onClick={handleJoin}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Processing..." : "Join Company"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-red-600">
              No invitation code provided. URL should be: /join?code=ABC123
            </p>
          )}

          {result && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
