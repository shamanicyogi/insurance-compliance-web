"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, Building2, Crown, Shield, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InvitationManager } from "@/components/invitation-manager";
import { AppLayout } from "@/components/app-layout";

interface Employee {
  id: string;
  employee_number: string;
  role: "owner" | "admin" | "manager" | "employee";
  user_id: string;
  company_id: string; // Add missing company_id property
  phone?: string;
  is_active: boolean;
  created_at: string;
  companies?: Company; // Add companies property to Employee interface
}

interface Company {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  subscription_status: string;
  is_active: boolean;
  max_employees: number;
}

interface EmployeeProfile {
  employee: Employee;
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load current user's employee profile
        const profileResponse = await fetch(
          "/api/snow-removal/employee/profile"
        );
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);

          // If user is admin/owner, load all company employees
          if (["owner", "admin"].includes(profileData.employee.role)) {
            const employeesResponse = await fetch(
              `/api/snow-removal/companies/${profileData.employee.company_id}/employees`
            );
            if (employeesResponse.ok) {
              const employeesData = await employeesResponse.json();
              setEmployees(employeesData.employees);
            }
          }
        }
      } catch (error) {
        console.error("Error loading team data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <Users className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      case "manager":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Team Management</h1>
        <p>Unable to load your team information.</p>
      </div>
    );
  }

  const canManageTeam = ["owner", "admin"].includes(profile.employee.role);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Team Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your team members and invitations
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <span className="font-medium">
              {profile.employee.companies?.name}
            </span>
          </div>
        </div>

        {/* Company Info */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Company Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:gap-4 grid-cols-3">
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold">
                  {employees.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Team Members</span>
                  <span className="sm:hidden">Members</span>
                </p>
              </div>
              {/* <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold">
                  {profile.employee.companies?.max_employees}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Max Employees</span>
                  <span className="sm:hidden">Max</span>
                </p>
              </div> */}
              {/* <div className="text-center sm:text-left">
                <Badge variant="outline" className="w-fit text-xs sm:text-sm">
                  {profile.employee.companies?.subscription_plan}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Plan</p>
              </div> */}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Team Members ({employees.length})
            </CardTitle>
            <CardDescription className="text-sm">
              Current team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {employees.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  No team members yet
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Invite employees to start building your team
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-3 sm:p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getRoleIcon(employee.role)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base">
                          {employee.user_id === session?.user?.id
                            ? "You"
                            : `Employee ${employee.employee_number}`}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {employee.phone || "No phone number"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-start sm:justify-end">
                      <Badge
                        variant={getRoleBadgeVariant(employee.role)}
                        className="text-xs"
                      >
                        {employee.role}
                      </Badge>
                      {employee.is_active ? (
                        <Badge
                          variant="default"
                          className="bg-green-500 text-xs"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitation Manager - Only for admins/owners */}
        {canManageTeam && (
          <InvitationManager companyId={profile.employee.company_id} />
        )}

        {/* Access Denied for Employees */}
        {!canManageTeam && (
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                Team Invitations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center py-6 sm:py-8">
                <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  Admin Access Required
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Only company owners and admins can manage team invitations.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
