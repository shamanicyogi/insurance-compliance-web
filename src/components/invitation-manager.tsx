"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Copy, Mail, Users, Clock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Invitation {
  id: string;
  email: string;
  role: "employee" | "manager" | "admin";
  invitation_code: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  invited_by: string;
}

interface InvitationManagerProps {
  companyId: string;
}

export function InvitationManager({ companyId }: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"employee" | "manager" | "admin">(
    "employee"
  );

  // Load invitations
  const loadInvitations = async () => {
    try {
      const response = await fetch(
        `/api/snow-removal/companies/${companyId}/invitations`
      );
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations);
      } else {
        toast.error("Failed to load invitations");
      }
    } catch (error) {
      console.error("Error loading invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, [companyId]);

  // Create new invitation
  const handleCreateInvitation = async () => {
    if (!email || !role) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/snow-removal/companies/${companyId}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `✅ Invitation sent! ${email} will receive an email with code: ${data.invitation.invitation_code}`
        );
        setEmail("");
        setRole("employee");
        setShowCreateDialog(false);
        loadInvitations(); // Reload the list
      } else {
        toast.error(data.error || "Failed to create invitation");
      }
    } catch (error) {
      console.error("Error creating invitation:", error);
      toast.error("Failed to create invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy invitation code to clipboard
  const copyInvitationCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invitation code copied to clipboard!");
    } catch (error) {
      console.error("Error copying invitation code:", error);
      toast.error("Failed to copy invitation code");
    }
  };

  // Get badge variant for role
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

  // Check if invitation is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Get status badge
  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return (
        <Badge variant="default" className="bg-green-500">
          Accepted
        </Badge>
      );
    }
    if (isExpired(invitation.expires_at)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Invitations
            </CardTitle>
            <CardDescription>
              Invite new employees to join your company
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadInvitations}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Invite Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Employee</DialogTitle>
                  <DialogDescription>
                    Send an invitation code to a new team member
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="employee@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={role}
                      onValueChange={(
                        value: "employee" | "manager" | "admin"
                      ) => setRole(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleCreateInvitation}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? "Creating..." : "Create Invitation"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invitations yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first invitation to start building your team
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite First Employee
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{invitation.email}</span>
                    <Badge variant={getRoleBadgeVariant(invitation.role)}>
                      {invitation.role}
                    </Badge>
                    {getStatusBadge(invitation)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created{" "}
                      {format(new Date(invitation.created_at), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires{" "}
                      {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-mono text-sm font-medium">
                      {invitation.invitation_code}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Invitation Code
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyInvitationCode(invitation.invitation_code)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
