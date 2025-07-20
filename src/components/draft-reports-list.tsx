"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Edit,
  Send,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { SnowRemovalReportWithRelations } from "@/types/snow-removal";

interface DraftReportsListProps {
  onEditDraft: (report: SnowRemovalReportWithRelations) => void;
  refreshTrigger?: number; // To trigger refresh from parent
  onReportsChange?: () => Promise<void>; // To notify parent of changes
}

export function DraftReportsList({
  onEditDraft,
  refreshTrigger = 0,
  onReportsChange,
}: DraftReportsListProps) {
  const [draftReports, setDraftReports] = useState<
    SnowRemovalReportWithRelations[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDraftReports = async () => {
    try {
      setLoading(true);

      // Fetch only draft reports
      const response = await fetch("/api/snow-removal/reports?is_draft=true", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch draft reports");
      }

      const data = await response.json();
      setDraftReports(data.reports || []);
    } catch (error) {
      console.error("Error fetching draft reports:", error);
      toast.error("Failed to load draft reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraftReports();
  }, [refreshTrigger]);

  const handleSubmitDraft = async (reportId: string) => {
    setSubmittingId(reportId);
    try {
      const response = await fetch(`/api/snow-removal/reports/${reportId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          is_draft: false, // Convert to final report
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit report");
      }

      toast.success("Report submitted successfully!");

      // Remove from draft list since it's no longer a draft
      setDraftReports((prev) =>
        prev.filter((report) => report.id !== reportId)
      );

      // Notify parent to refresh main reports list
      if (onReportsChange) {
        await onReportsChange();
      }
    } catch (error) {
      console.error("Error submitting draft:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit report"
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDeleteDraft = async (reportId: string, reportName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the draft report for ${reportName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(reportId);
    try {
      const response = await fetch(`/api/snow-removal/reports/${reportId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete report");
      }

      toast.success("Draft deleted successfully");

      // Remove from list
      setDraftReports((prev) =>
        prev.filter((report) => report.id !== reportId)
      );

      // Notify parent to refresh main reports list
      if (onReportsChange) {
        await onReportsChange();
      }
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete draft"
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (draftReports.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Draft Reports</h3>
          <p className="text-muted-foreground mb-4">
            You don&apos;t have any draft reports at the moment.
          </p>
          <p className="text-sm text-muted-foreground">
            Create a new report and save it as a draft to see it here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Draft Reports ({draftReports.length})
        </h3>
        <Badge variant="secondary">
          {draftReports.length} draft{draftReports.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {draftReports.map((report) => (
        <Card key={report.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {report.sites?.name || "Unknown Site"}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(report.date), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {report.start_time}
                    {report.finish_time && ` - ${report.finish_time}`}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-600"
              >
                Draft
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Snow Removal Method
                </p>
                <p className="font-medium capitalize">
                  {report.snow_removal_method
                    ?.replace(/([A-Z])/g, " $1")
                    .trim()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salt Used</p>
                <p className="font-medium">{report.salt_used_kg || 0} kg</p>
              </div>
              {report.comments && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Comments</p>
                  <p className="text-sm bg-muted p-2 rounded">
                    {report.comments}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditDraft(report)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Draft
              </Button>

              <Button
                size="sm"
                onClick={() => handleSubmitDraft(report.id)}
                disabled={submittingId === report.id}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {submittingId === report.id ? "Submitting..." : "Submit Report"}
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={deletingId === report.id}
                onClick={() =>
                  handleDeleteDraft(
                    report.id,
                    report.sites?.name || "Unknown Site"
                  )
                }
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deletingId === report.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
