"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, MapPin, Edit, MoreVertical } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/app-layout";

interface Site {
  id: string;
  name: string;
  address: string;
  priority: "high" | "medium" | "low";
  size_sqft?: number;
  typical_salt_usage_kg?: number;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
  special_instructions?: string;
  is_active: boolean;
  created_at: string;
}

export default function SitesPage() {
  const { status } = useSession();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSites = async () => {
      if (status !== "authenticated") {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/snow-removal/sites", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setSites(data.sites);
        } else {
          toast.error("Failed to load sites");
        }
      } catch (error) {
        console.error("Error loading sites:", error);
        toast.error("Failed to load sites");
      } finally {
        setLoading(false);
      }
    };

    loadSites();
  }, [status]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
            <p className="text-muted-foreground">
              Manage your snow removal sites and locations.
            </p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Site
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sites.length}</div>
              <p className="text-xs text-muted-foreground">
                {sites.filter((s) => s.is_active).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High Priority
              </CardTitle>
              <MapPin className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sites.filter((s) => s.priority === "high").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Area</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sites
                  .reduce((total, site) => total + (site.size_sqft || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Square feet</p>
            </CardContent>
          </Card>
        </div>

        {/* Sites Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Sites</CardTitle>
            <CardDescription>
              Manage and monitor all your snow removal locations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sites yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first site to start managing snow removal locations.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Site
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Size (sq ft)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {site.address}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(site.priority)}>
                          {site.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {site.size_sqft?.toLocaleString() || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={site.is_active ? "default" : "secondary"}
                        >
                          {site.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Site
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MapPin className="h-4 w-4 mr-2" />
                              View on Map
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
