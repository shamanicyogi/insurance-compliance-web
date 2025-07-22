"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Activity,
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
}

// Sample data for analytics (for owners/managers)
const analyticsData = [
  { name: "Jan", reports: 45, sites: 12 },
  { name: "Feb", reports: 38, sites: 15 },
  { name: "Mar", reports: 52, sites: 18 },
  { name: "Apr", reports: 61, sites: 22 },
  { name: "May", reports: 28, sites: 25 },
  { name: "Jun", reports: 15, sites: 28 },
];

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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Snow Removal Job Site
          </h2>
          <p className="text-muted-foreground">
            Complete your daily snow removal compliance report
          </p>
        </div>
      </div>

      {/* Quick Stats for Employee */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Reports
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.todayReports || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Reports completed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assigned Sites
            </CardTitle>
            <CloudSnow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.assignedSites || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sites under your responsibility
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Jobs currently in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job Site Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudSnow className="h-5 w-5" />
            Job Site Completion Form
          </CardTitle>
          <CardDescription>
            Fill out the details of your snow removal activities. Weather data
            and material calculations are automated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SnowRemovalForm />
        </CardContent>
      </Card>
    </div>
  );
}

function ManagerDashboard({ userRole }: { userRole: string }) {
  const { employee } = useCompany();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [siteData, setSiteData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    loadManagerStats();
  }, [employee?.company_id]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {userRole === "owner" ? "Company" : "Management"} Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Site
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalEmployees || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
            <CloudSnow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.activeSites || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Sites being managed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Reports
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.todayReports || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Reports submitted today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.completionRate || 0}%
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Reports completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Reports & Sites Overview</CardTitle>
            <CardDescription>
              Snow removal activity over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
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

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Site Priority Distribution</CardTitle>
            <CardDescription>
              Breakdown of sites by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-[350px]">
                <Spinner />
              </div>
            ) : siteData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={siteData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {siteData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-[350px] text-muted-foreground">
                No sites data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest employee actions and site updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <Badge
                    variant={
                      activity.status === "success"
                        ? "default"
                        : activity.status === "warning"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {activity.status}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.employee}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.action}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Manage Employees
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CloudSnow className="mr-2 h-4 w-4" />
              Site Management
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              View All Reports
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics Dashboard
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="mr-2 h-4 w-4" />
              System Status
            </Button>
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

  // Redirect users without employee records to onboarding
  useEffect(() => {
    if (!isLoading && !companyLoading && user && (!employee || !userRole)) {
      router.push("/snow-removal/onboarding");
    }
  }, [isLoading, companyLoading, user, employee, userRole, router]);

  if (isLoading || companyLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <div>Please log in to view your dashboard</div>;
  }

  if (!employee || !userRole) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Company Access</CardTitle>
            <CardDescription>
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
        <div className="flex justify-center items-center h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
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
