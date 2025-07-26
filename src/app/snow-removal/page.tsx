"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  FileText,
  Calendar,
  MapPin,
  Clock,
  Filter,
  Edit,
  Trash2,
} from "lucide-react";
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
import { AdminReportsList } from "@/components/admin-reports-list";
import { AppLayout } from "@/components/app-layout";
import { useCompanyPermissions } from "@/lib/contexts/company-context";
import type {
  SnowRemovalReport,
  Site,
  CreateReportRequest,
} from "@/types/snow-removal";

interface ReportsResponse {
  reports: (SnowRemovalReport & {
    sites: { name: string; address: string; priority: string };
    employees: { employee_number: string };
  })[];
}

const StatusBadge = ({
  isDraft,
  isArchived,
}: {
  isDraft: boolean;
  isArchived: boolean;
}) => {
  if (isArchived) {
    return <Badge variant="secondary">Archived</Badge>;
  }
  if (isDraft) {
    return <Badge variant="outline">Draft</Badge>;
  }
  return <Badge variant="default">Submitted</Badge>;
};

export default function SnowRemovalPage() {
  const { data: session } = useSession();
  const permissions = useCompanyPermissions();

  const canCreateReports = permissions?.canCreateReports ?? false;
  const canEditReports = permissions?.canEditOwnReports ?? false;
  const canExportData = permissions?.canExportData ?? false;

  // Navigation state
  const [activeTab, setActiveTab] = useState("reports");

  // Filter states
  const [dateFilter, setDateFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [reports, setReports] = useState<ReportsResponse["reports"]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editingReport, setEditingReport] = useState<SnowRemovalReport | null>(
    null
  );

  // Counter for forcing draft list refresh
  const [refreshDrafts, setRefreshDrafts] = useState(0);

  // Load initial data
  useEffect(() => {
    reloadReports();
  }, []);

  const reloadReports = async () => {
    setLoading(true);
    try {
      const [reportsResponse, sitesResponse] = await Promise.all([
        fetch("/api/snow-removal/reports"),
        fetch("/api/snow-removal/sites"),
      ]);

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        setReports(reportsData.reports || []);
      }

      if (sitesResponse.ok) {
        const sitesData = await sitesResponse.json();
        setSites(sitesData.sites || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmitted = async (reports: CreateReportRequest[]) => {
    try {
      // For editing single reports, handle differently
      if (editingReport && reports.length === 1) {
        const response = await fetch(
          `/api/snow-removal/reports/${editingReport.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reports[0]),
          }
        );

        if (response.ok) {
          toast.success(
            `Report updated as ${reports[0].is_draft ? "draft" : "submitted"}`
          );
          setEditingReport(null);
        } else {
          const error = await response.json();
          toast.error(error.message || "Failed to update report");
        }
      } else {
        // Submit each report individually using the existing single report API
        const promises = reports.map((reportData) =>
          fetch("/api/snow-removal/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reportData),
          })
        );

        const responses = await Promise.all(promises);

        const successful = responses.filter((r) => r.ok).length;
        const failed = responses.length - successful;

        if (successful > 0) {
          toast.success(
            reports[0]?.is_draft
              ? `Saved ${successful} report(s) as drafts`
              : `Submitted ${successful} report(s) successfully`
          );
        }

        if (failed > 0) {
          toast.error(`Failed to save ${failed} report(s)`);
        }
      }

      // If not a draft, go to reports tab, otherwise stay on current tab
      if (!reports[0]?.is_draft) {
        setActiveTab("reports");
      }

      // Reload reports and trigger draft refresh
      await reloadReports();
      setRefreshDrafts((prev) => prev + 1);
    } catch (error) {
      console.error("Error saving reports:", error);
      toast.error("Error saving reports");
    }
  };

  const handleEditReport = (report: SnowRemovalReport) => {
    setEditingReport(report);
    setActiveTab("create");
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/snow-removal/reports/${reportId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Report deleted successfully");
        await reloadReports();
        setRefreshDrafts((prev) => prev + 1);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete report");
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Error deleting report");
    }
  };

  // Filter reports based on current filters
  const filteredReports = reports.filter((report) => {
    const matchesDate = !dateFilter || report.date === dateFilter;
    const matchesSite = siteFilter === "all" || report.site_id === siteFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "draft" && report.is_draft) ||
      (statusFilter === "submitted" && !report.is_draft);

    return matchesDate && matchesSite && matchesStatus;
  });

  const clearFilters = () => {
    setDateFilter("");
    setSiteFilter("all");
    setStatusFilter("all");
  };

  if (!session) {
    return <div>Please log in to access snow removal reports.</div>;
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Snow Removal Reports
            </h1>
            <p className="text-muted-foreground">
              Manage your snow removal operations and reports
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports">All Reports</TabsTrigger>
            {canCreateReports && (
              <TabsTrigger value="create">Create Report</TabsTrigger>
            )}
            {canExportData && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>

          {/* All Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
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
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sites</SelectItem>
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
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Drafts</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reports List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Reports ({filteredReports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reports found matching your filters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">
                                {report.sites?.name || `Site ${report.site_id}`}
                              </h3>
                              <StatusBadge
                                isDraft={report.is_draft}
                                isArchived={false}
                              />
                            </div>
                            <div className="flex items-center gap-2 md:gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(report.date), "MMM d, yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {report.start_time}
                                {report.finish_time &&
                                  ` - ${report.finish_time}`}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-4 w-4" />
                                {report.sites?.address || "Unknown address"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {canEditReports && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditReport(report)}
                              title="Edit report"
                              className="h-7 w-7"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteReport(report.id)}
                              title="Delete report"
                              className="h-7 w-7"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Draft Reports */}
            {canCreateReports && (
              <DraftReportsList
                key={refreshDrafts}
                onEditDraft={handleEditReport}
              />
            )}
          </TabsContent>

          {/* Create Report Tab */}
          {canCreateReports && (
            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        {editingReport ? "Edit Report" : "Create New Report"}
                      </CardTitle>
                      <CardDescription>
                        {editingReport
                          ? `Editing report for ${editingReport.site_name || "Unknown Site"}`
                          : "Create reports for one or multiple sites in a single submission"}
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
                  <SnowRemovalForm onSubmit={handleReportSubmitted} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Admin Reports Tab */}
          {canExportData && (
            <TabsContent value="admin" className="space-y-4">
              <AdminReportsList />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
