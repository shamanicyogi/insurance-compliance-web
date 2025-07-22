"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Eye,
  FileSpreadsheet,
  Search,
  Calendar,
  MapPin,
  User,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";
import { AdminReportView } from "./admin-report-view";
import type { SnowRemovalReportWithRelations } from "@/types/snow-removal";

interface AdminReportsListProps {
  refreshTrigger?: number;
}

interface FilterOptions {
  search: string;
  site: string;
  employee: string;
  status: string;
  method: string;
  dateFrom: string;
  dateTo: string;
}

export function AdminReportsList({
  refreshTrigger = 0,
}: AdminReportsListProps) {
  const [reports, setReports] = useState<SnowRemovalReportWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] =
    useState<SnowRemovalReportWithRelations | null>(null);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    site: "",
    employee: "",
    status: "",
    method: "",
    dateFrom: "",
    dateTo: "",
  });

  const itemsPerPage = 20;

  // Load reports from API
  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/snow-removal/reports?admin=true");
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      } else {
        toast.error("Failed to load reports");
      }
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Error loading reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [refreshTrigger]);

  // Filter reports based on current filters
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Search filter (searches in site name, operator, employee number)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = [
          report.sites?.name,
          report.operator,
          report.employees?.employee_number,
          report.site_name,
        ]
          .filter(Boolean)
          .some((field) => field?.toLowerCase().includes(searchLower));

        if (!matches) return false;
      }

      // Site filter
      if (filters.site && report.site_id !== filters.site) return false;

      // Employee filter
      if (filters.employee && report.employee_id !== filters.employee)
        return false;

      // Status filter (draft/submitted)
      if (filters.status) {
        const isDraft = report.is_draft;
        if (filters.status === "draft" && !isDraft) return false;
        if (filters.status === "submitted" && isDraft) return false;
      }

      // Method filter
      if (filters.method && report.snow_removal_method !== filters.method)
        return false;

      // Date range filter
      if (filters.dateFrom && report.date < filters.dateFrom) return false;
      if (filters.dateTo && report.date > filters.dateTo) return false;

      return true;
    });
  }, [reports, filters]);

  // Paginate filtered reports
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // Get unique values for filter dropdowns
  const uniqueSites = useMemo(() => {
    const sites = reports
      .map((r) => ({ id: r.site_id, name: r.sites?.name || r.site_name }))
      .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
    return sites;
  }, [reports]);

  const uniqueEmployees = useMemo(() => {
    const employees = reports
      .map((r) => ({
        id: r.employee_id,
        name: r.operator,
        number: r.employees?.employee_number,
      }))
      .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);
    return employees;
  }, [reports]);

  // Export all filtered reports to CSV
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      // Build query parameters for filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(
        `/api/snow-removal/reports/export?${params}`,
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
        const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");
        a.download = `snow-removal-reports-${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("CSV export completed");
      } else {
        toast.error("Failed to export reports");
      }
    } catch (error) {
      console.error("Error exporting reports:", error);
      toast.error("Error exporting reports");
    } finally {
      setExporting(false);
    }
  };

  const formatTemperature = (temp: number) => `${temp}°C`;

  const formatTime = (timeString: string) => {
    if (!timeString) return "-";
    return timeString;
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      site: "",
      employee: "",
      status: "",
      method: "",
      dateFrom: "",
      dateTo: "",
    });
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading reports...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              All Reports ({filteredReports.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadReports}
                disabled={loading}
                className="flex items-center gap-1 sm:gap-2"
              >
                <RefreshCw
                  className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">↻</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={exporting || filteredReports.length === 0}
                className="flex items-center gap-1 sm:gap-2"
              >
                <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">
                  {exporting ? "Exporting..." : "Export CSV"}
                </span>
                <span className="sm:hidden">{exporting ? "..." : "CSV"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Site, operator, employee..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="site">Site</Label>
              <Select
                value={filters.site || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, site: value === "all" ? "" : value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sites</SelectItem>
                  {uniqueSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select
                value={filters.employee || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    employee: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {uniqueEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="method">Method</Label>
              <Select
                value={filters.method || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    method: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  <SelectItem value="plow">Plow</SelectItem>
                  <SelectItem value="shovel">Shovel</SelectItem>
                  <SelectItem value="noAction">No Action</SelectItem>
                  <SelectItem value="salt">Salt</SelectItem>
                  <SelectItem value="combination">Combination</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="w-full"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Results Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[120px]">Site</TableHead>
                  <TableHead className="min-w-[100px]">Employee</TableHead>
                  <TableHead className="min-w-[80px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Method</TableHead>
                  <TableHead className="min-w-[80px]">Temp</TableHead>
                  <TableHead className="min-w-[80px]">Time</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No reports found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(report.date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {report.sites?.name || report.site_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{report.operator}</div>
                            <div className="text-sm text-muted-foreground">
                              {report.employees?.employee_number}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={report.is_draft ? "outline" : "default"}
                        >
                          {report.is_draft ? "Draft" : "Submitted"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {report.snow_removal_method
                            ?.replace(/([A-Z])/g, " $1")
                            .trim()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatTemperature(report.air_temperature)}
                      </TableCell>
                      <TableCell>{formatTime(report.start_time)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredReports.length)}{" "}
                of {filteredReports.length} reports
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <span className="text-sm font-medium whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      {selectedReport && (
        <AdminReportView
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReportUpdated={() => {
            loadReports();
            setSelectedReport(null);
          }}
        />
      )}
    </>
  );
}
