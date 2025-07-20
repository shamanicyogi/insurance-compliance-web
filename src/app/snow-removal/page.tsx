"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, FileText, Calendar, MapPin, Clock, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { SnowRemovalForm } from "@/components/snow-removal-form";
import { DraftReportsList } from "@/components/draft-reports-list";
import { AppLayout } from "@/components/app-layout";
import type { SnowRemovalReport, Site } from "@/types/snow-removal";

interface ReportsResponse {
  reports: (SnowRemovalReport & {
    sites: { name: string; address: string; priority: string };
    employees: { employee_number: string };
  })[];
}

const StatusBadge = ({
  isDraft,
  submittedAt,
}: {
  isDraft: boolean;
  submittedAt?: string;
}) => {
  if (isDraft) {
    return <Badge variant="secondary">Draft</Badge>;
  }
  if (submittedAt) {
    return <Badge variant="default">Submitted</Badge>;
  }
  return <Badge variant="outline">Unknown</Badge>;
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    high: "destructive",
    medium: "secondary",
    low: "outline",
  };
  return <Badge variant={variants[priority] || "outline"}>{priority}</Badge>;
};

export default function SnowRemovalPage() {
  const { status } = useSession();

  // Navigation state
  const [activeTab, setActiveTab] = useState("reports");

  // Filter states
  const [dateFilter, setDateFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [reports, setReports] = useState<ReportsResponse["reports"]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [editingReport, setEditingReport] = useState<
    ReportsResponse["reports"][0] | null
  >(null);
  const [refreshDrafts, setRefreshDrafts] = useState(0);

  // Redirect if not authenticated
  // useEffect(() => {
  //   if (status === "unauthenticated") {
  //     router.push("/login");
  //   }
  // }, [status, router]);

  // Load data - middleware ensures user has employee record
  useEffect(() => {
    const loadData = async () => {
      if (status !== "authenticated") {
        setLoading(false);
        return;
      }

      try {
        // Load sites and reports in parallel
        const [sitesResponse, reportsResponse] = await Promise.all([
          fetch("/api/snow-removal/sites"),
          fetch("/api/snow-removal/reports"),
        ]);

        if (sitesResponse.ok) {
          const sitesData = await sitesResponse.json();
          setSites(sitesData.sites);
        }

        if (reportsResponse.ok) {
          const reportsData = await reportsResponse.json();
          setReports(reportsData.reports);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
        setReportsLoading(false);
      }
    };

    loadData();
  }, [status]);

  // Filter reports based on selected filters
  const filteredReports = reports.filter((report) => {
    if (dateFilter && !report.date.startsWith(dateFilter)) return false;
    if (siteFilter && siteFilter !== "all" && report.site_id !== siteFilter)
      return false;
    if (statusFilter === "draft" && !report.is_draft) return false;
    if (statusFilter === "submitted" && report.is_draft) return false;
    return true;
  });

  const handleNewReport = () => {
    setActiveTab("create");
  };

  const handleReportSubmitted = () => {
    toast.success("Report submitted successfully!");
    setActiveTab("reports");
    // Reload reports
    const loadReports = async () => {
      try {
        const response = await fetch("/api/snow-removal/reports");
        if (response.ok) {
          const data = await response.json();
          setReports(data.reports);
        }
      } catch (error) {
        console.error("Error reloading reports:", error);
        toast.error("Failed to reload reports");
      }
    };
    loadReports();
    // Trigger draft refresh
    setRefreshDrafts((prev) => prev + 1);
  };

  const handleEditDraft = (report: ReportsResponse["reports"][0]) => {
    setEditingReport(report);
    setActiveTab("create");
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    // Trigger draft refresh to reload the list
    setRefreshDrafts((prev) => prev + 1);
  };

  const clearFilters = () => {
    setDateFilter("");
    setSiteFilter("all");
    setStatusFilter("all");
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Middleware handles auth and employee check redirects

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Snow Removal Reports
            </h1>
            <p className="text-muted-foreground">
              Manage your snow removal compliance reports and track site
              activities.
            </p>
          </div>
          <Button onClick={handleNewReport} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </div>

        {/* Quick Stats */}
        {!reportsLoading && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Reports
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.length}</div>
                <p className="text-xs text-muted-foreground">
                  {reports.filter((r) => !r.is_draft).length} submitted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Draft Reports
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.filter((r) => r.is_draft).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending submission
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sites Assigned
                </CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sites.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active locations
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Drafts ({reports.filter((r) => r.is_draft).length})
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {editingReport ? "Edit Report" : "Create Report"}
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-filter">Date</Label>
                    <Input
                      id="date-filter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site-filter">Site</Label>
                    <Select value={siteFilter} onValueChange={setSiteFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All sites" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sites</SelectItem>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="draft">Drafts</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reports List */}
            <div className="space-y-4">
              {reportsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No reports found
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {reports.length === 0
                        ? "You haven't created any reports yet. Create your first report to get started."
                        : "No reports match your current filters. Try adjusting your search criteria."}
                    </p>
                    {reports.length === 0 && (
                      <Button
                        onClick={handleNewReport}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create First Report
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(
                              new Date(report.date),
                              "EEEE, MMMM d, yyyy"
                            )}
                            <StatusBadge
                              isDraft={report.is_draft}
                              submittedAt={report.submitted_at}
                            />
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3" />
                            {report.sites.name}
                            <PriorityBadge priority={report.sites.priority} />
                          </CardDescription>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {report.start_time} -{" "}
                          {report.finish_time || "In Progress"}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm font-medium">Method</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {report.snow_removal_method
                              .replace(/([A-Z])/g, " $1")
                              .trim()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Salt Used</p>
                          <p className="text-sm text-muted-foreground">
                            {report.salt_used_kg || 0} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Temperature</p>
                          <p className="text-sm text-muted-foreground">
                            {report.air_temperature || "N/A"}°C
                          </p>
                        </div>
                      </div>
                      {report.comments && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium">Comments</p>
                          <p className="text-sm text-muted-foreground">
                            {report.comments}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Drafts Tab */}
          <TabsContent value="drafts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Draft Reports</CardTitle>
                <CardDescription>
                  Manage your draft reports. Edit, submit, or delete drafts as
                  needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DraftReportsList
                  onEditDraft={handleEditDraft}
                  refreshTrigger={refreshDrafts}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create/Edit Report Tab */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {editingReport
                        ? "Edit Draft Report"
                        : "Create New Snow Removal Report"}
                    </CardTitle>
                    <CardDescription>
                      {editingReport
                        ? "Update your draft report and submit when ready."
                        : "Fill out the details of your snow removal activities. Weather data and material calculations are automated."}
                    </CardDescription>
                  </div>
                  {editingReport && (
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <SnowRemovalForm
                  existingReport={editingReport}
                  onSubmit={handleReportSubmitted}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
