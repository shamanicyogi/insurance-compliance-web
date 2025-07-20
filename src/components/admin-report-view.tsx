"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  Edit,
  Download,
  Save,
  X,
  MapPin,
  Calendar,
  Thermometer,
  Snowflake,
  Truck,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import type { SnowRemovalReportWithRelations } from "@/types/snow-removal";

interface AdminReportViewProps {
  report: SnowRemovalReportWithRelations;
  onClose: () => void;
  onReportUpdated: () => void;
}

export function AdminReportView({
  report,
  onClose,
  onReportUpdated,
}: AdminReportViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState(report);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/snow-removal/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editedReport,
          // Ensure we keep the original IDs
          id: report.id,
          employee_id: report.employee_id,
          site_id: report.site_id,
        }),
      });

      if (response.ok) {
        toast.success("Report updated successfully");
        setIsEditing(false);
        onReportUpdated();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update report");
      }
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Error updating report");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await fetch(
        `/api/snow-removal/reports/${report.id}/pdf`,
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `snow-report-${(report.sites?.name || "unknown").replace(/[^a-zA-Z0-9]/g, "-")}-${format(new Date(report.date), "yyyy-MM-dd")}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Report downloaded successfully");
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("PDF generation failed:", errorData);
        toast.error(
          `Failed to generate PDF: ${errorData.details || errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Error downloading PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "Not set";
    return timeString;
  };

  const formatTemperature = (temp: number) => {
    return `${temp}°C`;
  };

  const currentReport = isEditing ? editedReport : report;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="h-6 w-6 text-muted-foreground" />
                {currentReport.sites?.name || "Unknown Site"}
              </h2>
              <p className="text-muted-foreground">
                {format(new Date(currentReport.date), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={currentReport.is_draft ? "outline" : "default"}>
                {currentReport.is_draft ? "Draft" : "Submitted"}
              </Badge>
              <Badge variant="secondary">
                {currentReport.employees?.employee_number || "Unknown Employee"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {downloadingPdf ? "Generating..." : "Download Report"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </>
            )}

            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedReport(report);
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}

            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={currentReport.date}
                    onChange={(e) =>
                      setEditedReport({ ...editedReport, date: e.target.value })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {format(new Date(currentReport.date), "MMM d, yyyy")}
                  </p>
                )}
              </div>

              <div>
                <Label>Dispatched For</Label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={currentReport.dispatched_for}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        dispatched_for: e.target.value,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {formatTime(currentReport.dispatched_for)}
                  </p>
                )}
              </div>

              <div>
                <Label>Start Time</Label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={currentReport.start_time}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        start_time: e.target.value,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {formatTime(currentReport.start_time)}
                  </p>
                )}
              </div>

              <div>
                <Label>Finish Time</Label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={currentReport.finish_time || ""}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        finish_time: e.target.value,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {formatTime(currentReport.finish_time || "")}
                  </p>
                )}
              </div>

              <div>
                <Label>Operator</Label>
                {isEditing ? (
                  <Input
                    value={currentReport.operator}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        operator: e.target.value,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {currentReport.operator}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weather Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Weather Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Air Temperature</Label>
                <p className="text-sm font-medium">
                  {formatTemperature(currentReport.air_temperature)}
                </p>
              </div>

              <div>
                <Label>Daytime High / Low</Label>
                <p className="text-sm font-medium">
                  {formatTemperature(currentReport.daytime_high)} /{" "}
                  {formatTemperature(currentReport.daytime_low)}
                </p>
              </div>

              <div>
                <Label>Snowfall</Label>
                <p className="text-sm font-medium">
                  {currentReport.snowfall_accumulation_cm} cm
                </p>
              </div>

              <div>
                <Label>Conditions on Arrival</Label>
                <p className="text-sm font-medium capitalize">
                  {currentReport.conditions_upon_arrival
                    ?.replace(/([A-Z])/g, " $1")
                    .trim()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Work Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Work Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Snow Removal Method</Label>
                  {isEditing ? (
                    <Select
                      value={currentReport.snow_removal_method}
                      onValueChange={(value) =>
                        setEditedReport({
                          ...editedReport,
                          snow_removal_method: value as any,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plow">Plow</SelectItem>
                        <SelectItem value="shovel">Shovel</SelectItem>
                        <SelectItem value="noAction">No Action</SelectItem>
                        <SelectItem value="salt">Salt</SelectItem>
                        <SelectItem value="combination">Combination</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium capitalize">
                      {currentReport.snow_removal_method
                        ?.replace(/([A-Z])/g, " $1")
                        .trim()}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Follow Up Plans</Label>
                  {isEditing ? (
                    <Select
                      value={currentReport.follow_up_plans}
                      onValueChange={(value) =>
                        setEditedReport({
                          ...editedReport,
                          follow_up_plans: value as any,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allClear">All Clear</SelectItem>
                        <SelectItem value="activeSnowfall">
                          Active Snowfall
                        </SelectItem>
                        <SelectItem value="monitorConditions">
                          Monitor Conditions
                        </SelectItem>
                        <SelectItem value="returnInHour">
                          Return In Hour
                        </SelectItem>
                        <SelectItem value="callSupervisor">
                          Call Supervisor
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium capitalize">
                      {currentReport.follow_up_plans
                        ?.replace(/([A-Z])/g, " $1")
                        .trim()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Truck</Label>
                  {isEditing ? (
                    <Input
                      value={currentReport.truck || ""}
                      onChange={(e) =>
                        setEditedReport({
                          ...editedReport,
                          truck: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {currentReport.truck || "Not specified"}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Tractor</Label>
                  {isEditing ? (
                    <Input
                      value={currentReport.tractor || ""}
                      onChange={(e) =>
                        setEditedReport({
                          ...editedReport,
                          tractor: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {currentReport.tractor || "Not specified"}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Handwork</Label>
                  {isEditing ? (
                    <Input
                      value={currentReport.handwork || ""}
                      onChange={(e) =>
                        setEditedReport({
                          ...editedReport,
                          handwork: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium">
                      {currentReport.handwork || "Not specified"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Snowflake className="h-5 w-5" />
                Material Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Salt Used (kg)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.1"
                    value={currentReport.salt_used_kg || 0}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        salt_used_kg: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {currentReport.salt_used_kg || 0} kg
                  </p>
                )}
              </div>

              <div>
                <Label>Deicing Material (kg)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.1"
                    value={currentReport.deicing_material_kg || 0}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        deicing_material_kg: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {currentReport.deicing_material_kg || 0} kg
                  </p>
                )}
              </div>

              <div>
                <Label>Salt Alternative (kg)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.1"
                    value={currentReport.salt_alternative_kg || 0}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        salt_alternative_kg: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {currentReport.salt_alternative_kg || 0} kg
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          {(currentReport.comments || isEditing) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={currentReport.comments || ""}
                    onChange={(e) =>
                      setEditedReport({
                        ...editedReport,
                        comments: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Add any additional comments or observations..."
                  />
                ) : (
                  <p className="text-sm">{currentReport.comments}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* GPS Location */}
          {currentReport.gps_latitude && currentReport.gps_longitude && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  GPS Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {currentReport.gps_latitude.toFixed(6)},{" "}
                  {currentReport.gps_longitude.toFixed(6)}
                  {currentReport.gps_accuracy && (
                    <span className="text-muted-foreground ml-2">
                      (±{currentReport.gps_accuracy}m accuracy)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Report Metadata</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>
                Created: {format(new Date(currentReport.created_at), "PPpp")}
              </p>
              <p>
                Updated: {format(new Date(currentReport.updated_at), "PPpp")}
              </p>
              {currentReport.submitted_at && (
                <p>
                  Submitted:{" "}
                  {format(new Date(currentReport.submitted_at), "PPpp")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
