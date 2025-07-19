import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";

interface JoinCompanyRequest {
  invitationCode: string;
}

/**
 * POST /api/snow-removal/companies/join
 * Join a company using an invitation code
 */
async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invitationCode }: JoinCompanyRequest = await req.json();

    if (!invitationCode) {
      return NextResponse.json(
        { error: "Invitation code is required" },
        { status: 400 }
      );
    }

    // Check if user already has an employee record
    const { data: existingEmployee } = await supabase
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

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("company_invitations")
      .select(
        `
        *,
        companies!inner(id, name, slug, is_active, max_employees)
      `
      )
      .eq("invitation_code", invitationCode.toUpperCase())
      .eq("email", session.user.email)
      .is("accepted_at", null) // Not yet accepted
      .gt("expires_at", new Date().toISOString()) // Not expired
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation code" },
        { status: 400 }
      );
    }

    // Check if company is active
    if (!invitation.companies.is_active) {
      return NextResponse.json(
        { error: "Company is not active" },
        { status: 400 }
      );
    }

    // Check employee limit
    const { count: currentEmployeeCount } = await supabase
      .from("employees")
      .select("id", { count: "exact" })
      .eq("company_id", invitation.company_id)
      .eq("is_active", true);

    if (
      currentEmployeeCount &&
      currentEmployeeCount >= invitation.companies.max_employees
    ) {
      return NextResponse.json(
        { error: "Company has reached its employee limit" },
        { status: 400 }
      );
    }

    // Generate employee number
    const { count: totalEmployees } = await supabase
      .from("employees")
      .select("id", { count: "exact" })
      .eq("company_id", invitation.company_id);

    const employeeNumber = `EMP${String((totalEmployees || 0) + 1).padStart(
      3,
      "0"
    )}`;

    // Create the employee record
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .insert({
        company_id: invitation.company_id,
        user_id: session.user.id,
        employee_number: employeeNumber,
        role: invitation.role,
        site_assignments: [], // Will be assigned by admin later
        is_active: true,
      })
      .select()
      .single();

    if (employeeError || !employee) {
      throw employeeError || new Error("Failed to create employee record");
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from("company_invitations")
      .update({
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      secureError("Failed to update invitation:", updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json(
      {
        success: true,
        companyName: invitation.companies.name,
        employee: {
          id: employee.id,
          employee_number: employee.employee_number,
          role: employee.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    secureError("Error joining company:", error);
    return NextResponse.json(
      { error: "Failed to join company" },
      { status: 500 }
    );
  }
}

export { POST };
