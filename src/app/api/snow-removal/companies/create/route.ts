import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, supabaseAdmin } from "@/lib/auth";
import { secureError } from "@/lib/utils/secure-logger";

interface CreateCompanyRequest {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * POST /api/snow-removal/companies/create
 * Create a new company and make the current user the owner
 */
async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyData: CreateCompanyRequest = await req.json();

    // Validate required fields
    if (!companyData.name || !companyData.slug) {
      return NextResponse.json(
        { error: "Company name and slug are required" },
        { status: 400 }
      );
    }

    // Check if user already has an employee record
    const { data: existingEmployee } = await supabaseAdmin
      .from("employees")
      .select("id, company_id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .single();

    if (existingEmployee) {
      return NextResponse.json(
        {
          error:
            "You are already a member of a company. Each user can only belong to one company.",
        },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    const { data: existingCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("slug", companyData.slug)
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { error: "Company slug is already taken. Please choose another." },
        { status: 400 }
      );
    }

    // Create the company
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyData.name,
        slug: companyData.slug,
        address: companyData.address,
        phone: companyData.phone,
        email: companyData.email,
        subscription_plan: "trial", // Start with trial
        subscription_status: "active",
        trial_ends_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days from now
        max_employees: 10,
        max_sites: 25,
        is_active: true,
      })
      .select()
      .single();

    if (companyError || !company) {
      throw companyError || new Error("Failed to create company");
    }

    // Create the owner employee record
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        company_id: company.id,
        user_id: session.user.id,
        employee_number: "OWNER001",
        role: "owner",
        site_assignments: [], // Owner has access to all sites
        is_active: true,
      })
      .select()
      .single();

    if (employeeError || !employee) {
      // Rollback - delete the company if employee creation failed
      await supabaseAdmin.from("companies").delete().eq("id", company.id);
      throw (
        employeeError || new Error("Failed to create owner employee record")
      );
    }

    // Create default company settings
    const { error: settingsError } = await supabaseAdmin
      .from("company_settings")
      .insert({
        company_id: company.id,
        timezone: "UTC",
        date_format: "YYYY-MM-DD",
        time_format: "24h",
        currency: "USD",
        material_cost_per_kg: 0.5,
        require_gps_verification: true,
        allow_draft_editing_hours: 24,
        notification_settings: {},
      });

    if (settingsError) {
      secureError("Failed to create company settings:", settingsError);
      // Don't fail the request for this, just log the error
    }

    return NextResponse.json(
      {
        success: true,
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
        },
        employee: {
          id: employee.id,
          role: employee.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    secureError("Error creating company:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}

export { POST };
