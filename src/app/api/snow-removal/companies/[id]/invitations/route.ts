import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { secureError } from "@/lib/utils/secure-logger";

interface CreateInvitationRequest {
  email: string;
  role: "employee" | "manager" | "admin";
}

/**
 * GET /api/snow-removal/companies/[id]/invitations
 * Get all invitations for a company
 */
async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin/owner of this company
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("company_id", params.id)
      .eq("is_active", true)
      .single();

    if (
      employeeError ||
      !employee ||
      !["owner", "admin"].includes(employee.role)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all invitations for the company
    const { data: invitations, error } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("company_id", params.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ invitations });
  } catch (error) {
    secureError("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/snow-removal/companies/[id]/invitations
 * Create a new invitation for the company
 */
async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role }: CreateInvitationRequest = await req.json();

    // Validate input
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!["employee", "manager", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Verify user is admin/owner of this company
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("company_id", params.id)
      .eq("is_active", true)
      .single();

    if (
      employeeError ||
      !employee ||
      !["owner", "admin"].includes(employee.role)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if email is already invited and not expired
    const { data: existingInvitation } = await supabase
      .from("company_invitations")
      .select("id, expires_at, accepted_at")
      .eq("company_id", params.id)
      .eq("email", email)
      .is("accepted_at", null)
      .single();

    if (existingInvitation) {
      const isExpired = new Date(existingInvitation.expires_at) < new Date();
      if (!isExpired) {
        return NextResponse.json(
          { error: "User already has a pending invitation" },
          { status: 400 }
        );
      }
    }

    // Check if user is already an employee
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", params.id)
      .eq("user_id", session.user.id)
      .single();

    if (existingEmployee) {
      return NextResponse.json(
        { error: "User is already an employee of this company" },
        { status: 400 }
      );
    }

    // Generate invitation code
    const invitationCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();

    // Create the invitation
    const { data: invitation, error } = await supabase
      .from("company_invitations")
      .insert({
        company_id: params.id,
        email,
        role,
        invitation_code: invitationCode,
        invited_by: session.user.id,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(), // 7 days
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          invitation_code: invitation.invitation_code,
          expires_at: invitation.expires_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    secureError("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

export { GET, POST };
