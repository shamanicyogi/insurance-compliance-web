"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCompany } from "@/lib/contexts/company-context";
import Spinner from "@/components/spinner";
import { AppLayout } from "@/components/app-layout";
import { SnowRemovalForm } from "@/components/snow-removal-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  Plus,
  CloudSnow,
  Clock,
  FileText,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CreateReportRequest } from "@/types/snow-removal";

interface DashboardStats {
  todayReports: number;
  assignedSites: number;
  activeJobs: number;
  totalEmployees?: number;
  activeSites?: number;
  completionRate?: number;
}

interface Site {
  id: string;
  name: string;
  priority: "high" | "medium" | "low";
}

interface Report {
  id: string;
  date: string;
  is_draft: boolean;
  finish_time?: string;
  site_id?: string; // Added for aggregation
}

const recentActivity = [
  {
    id: 1,
    employee: "Recent Activity",
    action: "Check the Snow Reports page for latest activity",
    time: "Live updates",
    status: "info",
  },
];

function EmployeeDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleMultiSiteReportSubmitted = async (
    reports: CreateReportRequest[]
  ) => {
    try {
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
    } catch (error) {
      console.error("Error saving multi-site reports:", error);
      toast.error("Error saving reports");
    }
  };

  useEffect(() => {
    const loadEmployeeStats = async () => {
      try {
        const [reportsResponse, sitesResponse] = await Promise.all([
          fetch("/api/snow-removal/reports", { credentials: "include" }),
          fetch("/api/snow-removal/sites", { credentials: "include" }),
        ]);

        const [reportsData, sitesData] = await Promise.all([
          reportsResponse.ok ? reportsResponse.json() : { reports: [] },
          sitesResponse.ok ? sitesResponse.json() : { sites: [] },
        ]);

        const reports: Report[] = reportsData.reports || [];
        const sites: Site[] = sitesData.sites || [];

        // Calculate today's reports
        const today = new Date().toISOString().split("T")[0];
        const todayReports = reports.filter((r) =>
          r.date.startsWith(today)
        ).length;

        // Calculate active jobs (draft reports or reports without finish time)
        const activeJobs = reports.filter(
          (r) => r.is_draft || !r.finish_time
        ).length;

        setStats({
          todayReports,
          assignedSites: sites.length,
          activeJobs,
        });
      } catch (error) {
        console.error("Error loading employee stats:", error);
        setStats({
          todayReports: 0,
          assignedSites: 0,
          activeJobs: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadEmployeeStats();
  }, []);

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-2 sm:p-4 md:p-8 pt-4 md:pt-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Snow Removal Job Site
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Complete reports for multiple sites in one convenient form
          </p>
        </div>
      </div>

      {/* Quick Stats for Employee - Compact Mobile Layout */}
      <div className="grid gap-2 sm:gap-4 grid-cols-3 md:grid-cols-3">
        <Card
          className="p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate("/snow-removal")}
        >
          <div className="flex flex-col items-center space-y-1 sm:space-y-2">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-center">
                Today
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-6 sm:w-8" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.todayReports || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center hidden sm:block">
              Reports completed
            </p>
          </div>
        </Card>

        <Card
          className="p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate("/sites")}
        >
          <div className="flex flex-col items-center space-y-1 sm:space-y-2">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <CloudSnow className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-center">
                Sites
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-6 sm:w-8" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.assignedSites || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center hidden sm:block">
              Assigned to you
            </p>
          </div>
        </Card>

        <Card
          className="p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate("/snow-removal?filter=active")}
        >
          <div className="flex flex-col items-center space-y-1 sm:space-y-2">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-medium text-center">
                Active
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-6 sm:w-8" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.activeJobs || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center hidden sm:block">
              Jobs in progress
            </p>
          </div>
        </Card>
      </div>

      {/* Job Site Form - More Prominent on Mobile */}
      <Card className="mt-4">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CloudSnow className="h-4 w-4 sm:h-5 sm:w-5" />
            Job Site Completion Form
          </CardTitle>
          <CardDescription className="text-sm">
            Create reports for multiple sites in one submission. Weather data is
            shared while maintaining individual site details and times.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <SnowRemovalForm onSubmit={handleMultiSiteReportSubmitted} />
        </CardContent>
      </Card>
    </div>
  );
}

function ManagerDashboard({ userRole }: { userRole: string }) {
  const { employee } = useCompany();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [siteData, setSiteData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [analyticsData, setAnalyticsData] = useState<
    { name: string; reports: number; sites: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleAddNewSite = () => {
    router.push("/sites?action=add");
  };

  const handlePieClick = (data: {
    name: string;
    value: number;
    color: string;
  }) => {
    if (data && data.name) {
      const priority = data.name.toLowerCase().split(" ")[0]; // "high", "medium", "low"
      router.push(`/sites?priority=${priority}`);
      toast.success(`Showing ${data.name} sites`);
    }
  };

  const handleAreaChartClick = (data: { activeLabel?: string }) => {
    if (data && data.activeLabel) {
      const month = data.activeLabel.toLowerCase();
      router.push(`/snow-removal?filter=${month}`);
      toast.success(`Showing reports for ${data.activeLabel}`);
    }
  };

  const aggregateMonthlyData = (reports: Report[]) => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentDate = new Date();
    const sixMonthsAgo = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 5,
      1
    );

    const monthlyData: {
      [key: string]: { reports: number; sites: Set<string> };
    } = {};

    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(
        sixMonthsAgo.getFullYear(),
        sixMonthsAgo.getMonth() + i,
        1
      );
      const monthKey = monthNames[date.getMonth()];
      monthlyData[monthKey] = { reports: 0, sites: new Set() };
    }

    // Aggregate reports by month
    reports.forEach((report) => {
      const reportDate = new Date(report.date);
      if (reportDate >= sixMonthsAgo) {
        const monthKey = monthNames[reportDate.getMonth()];
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].reports++;
          if (report.site_id) {
            monthlyData[monthKey].sites.add(report.site_id);
          }
        }
      }
    });

    // Convert to chart format
    return Object.entries(monthlyData).map(([month, data]) => ({
      name: month,
      reports: data.reports,
      sites: data.sites.size,
    }));
  };

  useEffect(() => {
    const loadManagerStats = async () => {
      try {
        const [reportsResponse, sitesResponse, employeesResponse] =
          await Promise.all([
            fetch("/api/snow-removal/reports", { credentials: "include" }),
            fetch("/api/snow-removal/sites", { credentials: "include" }),
            employee?.company_id
              ? fetch(
                  `/api/snow-removal/companies/${employee.company_id}/employees`,
                  { credentials: "include" }
                )
              : Promise.resolve({ ok: false }),
          ]);

        const [reportsData, sitesData, employeesData] = await Promise.all([
          reportsResponse.ok ? reportsResponse.json() : { reports: [] },
          sitesResponse.ok ? sitesResponse.json() : { sites: [] },
          employeesResponse.ok && "json" in employeesResponse
            ? employeesResponse.json()
            : { employees: [] },
        ]);

        const reports: Report[] = reportsData.reports || [];
        const sites: Site[] = sitesData.sites || [];
        const employees = employeesData.employees || [];

        // Calculate today's reports
        const today = new Date().toISOString().split("T")[0];
        const todayReports = reports.filter((r) =>
          r.date.startsWith(today)
        ).length;

        // Calculate completion rate (submitted vs total reports)
        const submittedReports = reports.filter((r) => !r.is_draft).length;
        const completionRate =
          reports.length > 0 ? (submittedReports / reports.length) * 100 : 0;

        // Calculate site priority distribution
        const priorityCounts = sites.reduce(
          (acc, site) => {
            acc[site.priority] = (acc[site.priority] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const totalSites = sites.length;
        const newSiteData = [
          {
            name: "High Priority",
            value:
              totalSites > 0
                ? Math.round(((priorityCounts.high || 0) / totalSites) * 100)
                : 0,
            color: "#ef4444",
          },
          {
            name: "Medium Priority",
            value:
              totalSites > 0
                ? Math.round(((priorityCounts.medium || 0) / totalSites) * 100)
                : 0,
            color: "#f59e0b",
          },
          {
            name: "Low Priority",
            value:
              totalSites > 0
                ? Math.round(((priorityCounts.low || 0) / totalSites) * 100)
                : 0,
            color: "#10b981",
          },
        ].filter((item) => item.value > 0);

        setStats({
          todayReports,
          assignedSites: 0, // Not relevant for managers
          activeJobs: 0, // Not relevant for managers
          totalEmployees: employees.length,
          activeSites: sites.length,
          completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
        });

        setSiteData(newSiteData);

        // Aggregate and set analytics data
        const aggregatedData = aggregateMonthlyData(reports);
        setAnalyticsData(aggregatedData);
      } catch (error) {
        console.error("Error loading manager stats:", error);
        setStats({
          todayReports: 0,
          assignedSites: 0,
          activeJobs: 0,
          totalEmployees: 0,
          activeSites: 0,
          completionRate: 0,
        });
        setSiteData([]);
        setAnalyticsData([]);
      } finally {
        setLoading(false);
      }
    };

    loadManagerStats();
  }, [employee?.company_id]);

  return (
    <div className="flex-1 space-y-4 p-2 sm:p-4 md:p-8 pt-4 md:pt-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {userRole === "owner" ? "Company" : "Management"} Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          <Button className="text-sm" onClick={handleAddNewSite}>
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add New Site</span>
            <span className="sm:hidden">Add Site</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate("/team")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">Total Employees</span>
              <span className="sm:hidden">Employees</span>
            </CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-8 sm:w-12" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.totalEmployees || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">Active team members</span>
              <span className="sm:hidden">Active</span>
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate("/sites")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">Active Sites</span>
              <span className="sm:hidden">Sites</span>
            </CardTitle>
            <CloudSnow className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-8 sm:w-12" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.activeSites || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">Sites being managed</span>
              <span className="sm:hidden">Managed</span>
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleNavigate("/snow-removal")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">Today&apos;s Reports</span>
              <span className="sm:hidden">Reports</span>
            </CardTitle>
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-8 sm:w-12" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.todayReports || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">Reports submitted today</span>
              <span className="sm:hidden">Today</span>
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">Completion Rate</span>
              <span className="sm:hidden">Rate</span>
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.completionRate || 0}%
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">Reports completion rate</span>
              <span className="sm:hidden">Complete</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Mobile Optimized */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7 lg:gap-4">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Reports & Sites Overview
            </CardTitle>
            <CardDescription className="text-sm">
              Snow removal activity over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0 sm:pl-2">
            <ResponsiveContainer
              width="100%"
              height={280}
              className="sm:h-[350px]"
            >
              <AreaChart data={analyticsData} onClick={handleAreaChartClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} className="sm:text-sm" />
                <YAxis fontSize={12} className="sm:text-sm" />
                <Tooltip
                  contentStyle={{
                    fontSize: "12px",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reports"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="sites"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Site Priority Distribution
            </CardTitle>
            <CardDescription className="text-sm">
              Breakdown of sites by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-[280px] sm:h-[350px]">
                <Spinner />
              </div>
            ) : siteData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={280}
                className="sm:h-[350px]"
              >
                <PieChart>
                  <Pie
                    data={siteData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name.split(" ")[0]} ${value}%`
                    }
                    outerRadius={60}
                    className="sm:outerRadius-[80px]"
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={12}
                    onClick={handlePieClick}
                  >
                    {siteData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: "12px",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-[280px] sm:h-[350px] text-muted-foreground text-sm">
                No sites data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions - Mobile Optimized */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7 lg:gap-4">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Recent Activity
            </CardTitle>
            <CardDescription className="text-sm">
              Latest employee actions and site updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 sm:space-x-4"
                >
                  <Badge
                    variant={
                      activity.status === "success"
                        ? "default"
                        : activity.status === "warning"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {activity.status}
                  </Badge>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate sm:text-wrap">
                      {activity.employee}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {activity.action}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">
              Common management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <Button
              className="w-full justify-start text-sm"
              variant="outline"
              onClick={() => handleNavigate("/team")}
            >
              <Users className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">Manage Employees</span>
            </Button>
            <Button
              className="w-full justify-start text-sm"
              variant="outline"
              onClick={() => handleNavigate("/sites")}
            >
              <CloudSnow className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">Site Management</span>
            </Button>
            <Button
              className="w-full justify-start text-sm"
              variant="outline"
              onClick={() => handleNavigate("/snow-removal")}
            >
              <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">View All Reports</span>
            </Button>
            <Button
              className="w-full justify-start text-sm"
              variant="outline"
              onClick={() => handleNavigate("/dashboard")}
            >
              <TrendingUp className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">Analytics Dashboard</span>
            </Button>
            {/* <Button
              className="w-full justify-start text-sm"
              variant="outline"
              onClick={() => handleNavigate("/settings")}
            >
              <Activity className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">System Settings</span>
            </Button> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { employee, userRole, loading: companyLoading } = useCompany();

  // HACK to redirect user
  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || companyLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!employee || !userRole) {
    return (
      <div className="flex justify-center items-center h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              No Company Access
            </CardTitle>
            <CardDescription className="text-sm">
              You don&apos;t appear to be associated with any company yet.
              Please contact your administrator or use an invitation code.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isEmployee = userRole === "employee";
  const isManager = ["owner", "admin", "manager"].includes(userRole);

  return (
    <AppLayout>
      {isEmployee ? (
        <EmployeeDashboard />
      ) : isManager ? (
        <ManagerDashboard userRole={userRole} />
      ) : (
        <div className="flex justify-center items-center h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Access Denied
              </CardTitle>
              <CardDescription className="text-sm">
                Your role ({userRole}) doesn&apos;t have access to the
                dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
