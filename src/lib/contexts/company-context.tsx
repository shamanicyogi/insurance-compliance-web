"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type {
  Company,
  Employee,
  CompanyRole,
  CompanySettings,
} from "@/types/snow-removal";

interface CompanyContextType {
  // Company data
  company: Company | null;
  employee: Employee | null;
  settings: CompanySettings | null;

  // User permissions
  userRole: CompanyRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canManageEmployees: boolean;
  canManageSites: boolean;
  canViewAllReports: boolean;

  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  refreshCompanyData: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}

interface CompanyProviderProps {
  children: React.ReactNode;
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const { data: session, status } = useSession();

  const [company, setCompany] = useState<Company | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state for permissions
  const userRole = employee?.role || null;
  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin" || isOwner;
  const isManager = userRole === "manager" || isAdmin;
  const canManageEmployees = isAdmin;
  const canManageSites = isManager;
  const canViewAllReports = isManager;

  const loadCompanyData = async () => {
    if (status !== "authenticated" || !session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get employee data (which includes company info)
      const employeeResponse = await fetch(
        "/api/snow-removal/employee/profile"
      );
      if (!employeeResponse.ok) {
        throw new Error("Failed to load employee profile");
      }

      const employeeData = await employeeResponse.json();
      setEmployee(employeeData.employee);

      if (employeeData.employee?.company_id) {
        // Load company data
        const [companyResponse, settingsResponse] = await Promise.all([
          fetch(
            `/api/snow-removal/companies/${employeeData.employee.company_id}`
          ),
          fetch(
            `/api/snow-removal/companies/${employeeData.employee.company_id}/settings`
          ),
        ]);

        if (companyResponse.ok) {
          const companyData = await companyResponse.json();
          setCompany(companyData.company);
        }

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSettings(settingsData.settings);
        }
      }
    } catch (err) {
      console.error("Error loading company data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load company data"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshCompanyData = async () => {
    await loadCompanyData();
  };

  const switchCompany = async (companyId: string) => {
    try {
      setLoading(true);

      // Call API to switch user's active company
      const response = await fetch(
        "/api/snow-removal/employee/switch-company",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to switch company");
      }

      // Reload company data
      await loadCompanyData();
    } catch (err) {
      console.error("Error switching company:", err);
      setError(err instanceof Error ? err.message : "Failed to switch company");
    }
  };

  // Load company data when session changes
  useEffect(() => {
    loadCompanyData();
  }, [session, status]);

  const contextValue: CompanyContextType = {
    // Company data
    company,
    employee,
    settings,

    // User permissions
    userRole,
    isOwner,
    isAdmin,
    isManager,
    canManageEmployees,
    canManageSites,
    canViewAllReports,

    // Loading states
    loading,
    error,

    // Actions
    refreshCompanyData,
    switchCompany,
  };

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
}

// Hook for checking specific permissions
export function useCompanyPermissions() {
  const { userRole, isOwner, isAdmin, isManager } = useCompany();

  return {
    canCreateReports: userRole !== null,
    canEditOwnReports: userRole !== null,
    canEditAllReports: isManager,
    canDeleteReports: isAdmin,
    canManageEmployees: isAdmin,
    canManageSites: isManager,
    canManageCompanySettings: isAdmin,
    canInviteEmployees: isAdmin,
    canViewBilling: isOwner,
    canExportData: isManager,
  };
}

// Hook for company-aware API calls
export function useCompanyApi() {
  const { company, employee } = useCompany();

  const makeCompanyRequest = async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add company context to headers if available
    if (company?.id) {
      headers["X-Company-ID"] = company.id;
    }

    return fetch(endpoint, {
      ...options,
      headers,
    });
  };

  return {
    companyId: company?.id,
    employeeId: employee?.id,
    makeCompanyRequest,
  };
}
