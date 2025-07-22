"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCompany } from "@/lib/contexts/company-context";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Users, Key, ArrowRight } from "lucide-react";

interface CreateCompanyData {
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
}

interface JoinCompanyData {
  invitationCode: string;
}

export function SnowRemovalOnboarding() {
  const { data: session } = useSession();
  const router = useRouter();
  const { refreshCompanyData } = useCompany();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for invitation parameters
  const invitationCode =
    searchParams.get("invitation") || searchParams.get("invitationCode");
  const companyName = searchParams.get("company");
  const inviterName = searchParams.get("inviter");
  const invitedEmail = searchParams.get("email");

  // Set initial tab based on invitation presence
  const [activeTab, setActiveTab] = useState(
    invitationCode ? "join" : "create"
  );

  // Create company form state
  const [companyData, setCompanyData] = useState<CreateCompanyData>({
    name: "",
    slug: "",
    address: "",
    phone: "",
    email: session?.user?.email || "",
  });

  // Join company form state
  const [joinData, setJoinData] = useState<JoinCompanyData>({
    invitationCode: invitationCode || "",
  });

  // Handle URL parameters for invitation codes from email links
  useEffect(() => {
    const invitationParam = searchParams.get("invitation");
    if (invitationParam) {
      setJoinData((prev) => ({
        ...prev,
        invitationCode: invitationParam.toUpperCase(),
      }));
      setActiveTab("join"); // Auto-switch to join tab
      toast.info("Invitation code loaded from email link!");
    }
  }, [searchParams]);

  // Auto-generate slug from company name
  const handleCompanyNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    setCompanyData((prev) => ({
      ...prev,
      name,
      slug,
    }));
  };

  const handleCreateCompany = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!companyData.name || !companyData.slug) {
        toast.error("Company name is required");
        return;
      }

      const response = await fetch("/api/snow-removal/companies/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(companyData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create company");
      }

      toast.success("Company created successfully! You are now the owner.");

      // 🔄 REFRESH COMPANY DATA BEFORE NAVIGATION
      await refreshCompanyData();

      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create company"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinCompany = async () => {
    try {
      setIsSubmitting(true);

      if (!joinData.invitationCode) {
        toast.error("Invitation code is required");
        return;
      }

      const response = await fetch("/api/snow-removal/companies/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(joinData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to join company");
      }

      toast.success(`Successfully joined ${result.companyName}!`);

      // 🔄 REFRESH COMPANY DATA BEFORE NAVIGATION
      await refreshCompanyData();

      router.push("/dashboard");
    } catch (error) {
      console.error("Error joining company:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join company"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Rich invitation context banner */}
        {invitationCode && companyName && (
          <div className="text-center space-y-3 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-green-200">
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
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Complete your setup below to join the team
                </span>
              </div>
            </div>
            {invitedEmail && (
              <p className="text-sm text-green-600 font-medium border-t border-green-200 pt-3">
                Invited email: {invitedEmail}
              </p>
            )}
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">
            {invitationCode ? "Join Your Team" : "Welcome to SlipCheck"}
          </h1>
          <p className="text-muted-foreground">
            {invitationCode
              ? "Complete your setup to join the company"
              : "To get started, either create a new company or join an existing one with an invitation code."}
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={`grid w-full ${invitationCode ? "grid-cols-1" : "grid-cols-2"}`}
          >
            {!invitationCode && (
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Create Company
              </TabsTrigger>
            )}
            <TabsTrigger value="join" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Join Company
            </TabsTrigger>
          </TabsList>

          {/* Create Company Tab */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Create New Company
                </CardTitle>
                <CardDescription>
                  Set up your snow removal company. You&apos;ll become the owner
                  and can invite employees later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      placeholder="Acme Snow Removal"
                      value={companyData.name}
                      onChange={(e) => handleCompanyNameChange(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-slug">Company URL Slug *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        yourapp.com/
                      </span>
                      <Input
                        id="company-slug"
                        placeholder="acme-snow-removal"
                        value={companyData.slug}
                        onChange={(e) =>
                          setCompanyData((prev) => ({
                            ...prev,
                            slug: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                        className="rounded-l-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-address">Address</Label>
                    <Textarea
                      id="company-address"
                      placeholder="123 Winter St, Snow City, ST 12345"
                      value={companyData.address}
                      onChange={(e) =>
                        setCompanyData((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Phone</Label>
                      <Input
                        id="company-phone"
                        placeholder="555-SNOW"
                        value={companyData.phone}
                        onChange={(e) =>
                          setCompanyData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-email">Email</Label>
                      <Input
                        id="company-email"
                        type="email"
                        placeholder="info@company.com"
                        value={companyData.email}
                        onChange={(e) =>
                          setCompanyData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCreateCompany}
                  disabled={isSubmitting || !companyData.name}
                  className="w-full"
                >
                  {isSubmitting ? "Creating..." : "Create Company & Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Join Company Tab */}
          <TabsContent value="join" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join Existing Company
                </CardTitle>
                <CardDescription>
                  Enter the invitation code provided by your company
                  administrator.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invitation-code">Invitation Code *</Label>
                  <Input
                    id="invitation-code"
                    placeholder="ABC12345"
                    value={joinData.invitationCode}
                    onChange={(e) =>
                      setJoinData((prev) => ({
                        ...prev,
                        invitationCode: e.target.value.toUpperCase(),
                      }))
                    }
                    disabled={isSubmitting}
                    className="font-mono tracking-wider"
                  />
                  <p className="text-sm text-muted-foreground">
                    Ask your company admin for an invitation code to join their
                    snow removal team.
                  </p>
                </div>

                <Button
                  onClick={handleJoinCompany}
                  disabled={isSubmitting || !joinData.invitationCode}
                  className="w-full"
                >
                  {isSubmitting ? "Joining..." : "Join Company"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help? Contact support or ask your administrator for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
