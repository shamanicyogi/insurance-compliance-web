"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  MapPin,
  Edit,
  MoreVertical,
  ExternalLink,
  Trash2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/app-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompanyPermissions } from "@/lib/contexts/company-context";

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

interface NewSiteForm {
  name: string;
  address: string;
  priority: "high" | "medium" | "low";
  size_sqft: string;
  typical_salt_usage_kg: string;
  contact_phone: string;
  special_instructions: string;
}

export default function SitesPage() {
  const { status } = useSession();
  const isMobile = useIsMobile();
  const { canManageEmployees } = useCompanyPermissions(); // Only owners and admins can delete sites
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [selectedMobileSite, setSelectedMobileSite] = useState<Site | null>(
    null
  );
  const [newSite, setNewSite] = useState<NewSiteForm>({
    name: "",
    address: "",
    priority: "medium",
    size_sqft: "",
    typical_salt_usage_kg: "",
    contact_phone: "",
    special_instructions: "",
  });
  const [editSite, setEditSite] = useState<NewSiteForm>({
    name: "",
    address: "",
    priority: "medium",
    size_sqft: "",
    typical_salt_usage_kg: "",
    contact_phone: "",
    special_instructions: "",
  });

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

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSite.name || !newSite.address) {
      toast.error("Please fill in required fields (Name and Address)");
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to geocode the address to get coordinates
      let coordinates = null;
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (apiKey && apiKey !== "undefined") {
          // Use Google Geocoding API if key is available
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
              newSite.address
            )}&key=${apiKey}`
          );

          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData.results && geocodeData.results.length > 0) {
              const location = geocodeData.results[0].geometry.location;
              coordinates = {
                latitude: location.lat,
                longitude: location.lng,
              };
              toast.success("Address geocoded successfully for weather data");
            } else if (geocodeData.status === "ZERO_RESULTS") {
              toast.warning(
                "Address not found - weather data will not be available"
              );
            }
          }
        } else {
          // Fallback to free OpenStreetMap Nominatim service
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              newSite.address
            )}&limit=1`
          );

          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData && geocodeData.length > 0) {
              coordinates = {
                latitude: parseFloat(geocodeData[0].lat),
                longitude: parseFloat(geocodeData[0].lon),
              };
              toast.success(
                "Address geocoded successfully for weather data (using free service)"
              );
            } else {
              toast.warning(
                "Address not found - weather data will not be available"
              );
            }
          }
        }
      } catch (geocodeError) {
        console.warn(
          "Geocoding failed, proceeding without coordinates:",
          geocodeError
        );
        toast.warning(
          "Could not geocode address - weather data will not be available"
        );
      }

      const siteData = {
        ...newSite,
        size_sqft: newSite.size_sqft ? parseInt(newSite.size_sqft) : undefined,
        typical_salt_usage_kg: newSite.typical_salt_usage_kg
          ? parseFloat(newSite.typical_salt_usage_kg)
          : undefined,
        ...coordinates, // Add latitude and longitude if available
      };

      const response = await fetch("/api/snow-removal/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(siteData),
      });

      if (response.ok) {
        const result = await response.json();
        setSites((prev) => [result.site, ...prev]);
        setIsCreateModalOpen(false);
        setNewSite({
          name: "",
          address: "",
          priority: "medium",
          size_sqft: "",
          typical_salt_usage_kg: "",
          contact_phone: "",
          special_instructions: "",
        });
        toast.success(
          `Site created successfully${coordinates ? " with weather data enabled" : ""}`
        );
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create site");
      }
    } catch (error) {
      console.error("Error creating site:", error);
      toast.error("Failed to create site");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editSite.name || !editSite.address || !editingSite) {
      toast.error("Please fill in required fields (Name and Address)");
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to geocode the address to get coordinates (only if address changed)
      let coordinates = null;
      if (editSite.address !== editingSite.address) {
        try {
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

          if (apiKey && apiKey !== "undefined") {
            // Use Google Geocoding API if key is available
            const geocodeResponse = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                editSite.address
              )}&key=${apiKey}`
            );

            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              if (geocodeData.results && geocodeData.results.length > 0) {
                const location = geocodeData.results[0].geometry.location;
                coordinates = {
                  latitude: location.lat,
                  longitude: location.lng,
                };
                toast.success("Address geocoded successfully for weather data");
              } else if (geocodeData.status === "ZERO_RESULTS") {
                toast.warning(
                  "Address not found - weather data will not be available"
                );
              }
            }
          } else {
            // Fallback to free OpenStreetMap Nominatim service
            const geocodeResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                editSite.address
              )}&limit=1`
            );

            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              if (geocodeData && geocodeData.length > 0) {
                coordinates = {
                  latitude: parseFloat(geocodeData[0].lat),
                  longitude: parseFloat(geocodeData[0].lon),
                };
                toast.success(
                  "Address geocoded successfully for weather data (using free service)"
                );
              } else {
                toast.warning(
                  "Address not found - weather data will not be available"
                );
              }
            }
          }
        } catch (geocodeError) {
          console.warn(
            "Geocoding failed, proceeding without coordinate update:",
            geocodeError
          );
          toast.warning(
            "Could not geocode new address - weather data may not be available"
          );
        }
      }

      const siteData = {
        ...editSite,
        size_sqft: editSite.size_sqft
          ? parseInt(editSite.size_sqft)
          : undefined,
        typical_salt_usage_kg: editSite.typical_salt_usage_kg
          ? parseFloat(editSite.typical_salt_usage_kg)
          : undefined,
        ...(coordinates || {}), // Add latitude and longitude if address changed and geocoding successful
      };

      const response = await fetch(
        `/api/snow-removal/sites/${editingSite.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(siteData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setSites((prev) =>
          prev.map((site) => (site.id === editingSite.id ? result.site : site))
        );
        setIsEditModalOpen(false);
        setIsMobileActionsOpen(false);
        setEditingSite(null);
        setSelectedMobileSite(null);
        toast.success(
          `Site updated successfully${coordinates ? " with updated weather data" : ""}`
        );
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update site");
      }
    } catch (error) {
      console.error("Error updating site:", error);
      toast.error("Failed to update site");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (site: Site) => {
    setEditingSite(site);
    setEditSite({
      name: site.name,
      address: site.address,
      priority: site.priority,
      size_sqft: site.size_sqft?.toString() || "",
      typical_salt_usage_kg: site.typical_salt_usage_kg?.toString() || "",
      contact_phone: site.contact_phone || "",
      special_instructions: site.special_instructions || "",
    });
    setIsEditModalOpen(true);
  };

  const openMobileActions = (site: Site) => {
    setSelectedMobileSite(site);
    setIsMobileActionsOpen(true);
  };

  const handleMobileEdit = () => {
    if (selectedMobileSite) {
      openEditModal(selectedMobileSite);
      setIsMobileActionsOpen(false);
    }
  };

  const handleMobileViewMap = () => {
    if (selectedMobileSite) {
      viewOnMap(selectedMobileSite);
      setIsMobileActionsOpen(false);
    }
  };

  const handleMobileDelete = () => {
    if (selectedMobileSite) {
      setDeletingSite(selectedMobileSite);
      setIsDeleteDialogOpen(true);
      setIsMobileActionsOpen(false);
    }
  };

  const openDeleteDialog = (site: Site) => {
    setDeletingSite(site);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSite = async () => {
    if (!deletingSite) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/snow-removal/sites/${deletingSite.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();

        if (result.soft_delete) {
          // Site was deactivated due to existing reports
          setSites((prev) =>
            prev.map((site) =>
              site.id === deletingSite.id ? { ...site, is_active: false } : site
            )
          );
          toast.success("Site deactivated successfully (has existing reports)");
        } else {
          // Site was completely deleted
          setSites((prev) =>
            prev.filter((site) => site.id !== deletingSite.id)
          );
          toast.success("Site deleted successfully");
        }

        setIsDeleteDialogOpen(false);
        setDeletingSite(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete site");
      }
    } catch (error) {
      console.error("Error deleting site:", error);
      toast.error("Failed to delete site");
    } finally {
      setIsDeleting(false);
    }
  };

  const viewOnMap = (site: Site) => {
    // Create Google Maps URL with the site address
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`;
    window.open(mapUrl, "_blank");
  };

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
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Sites
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your snow removal sites and locations.
            </p>
          </div>
          <Button
            className="flex items-center gap-2 text-sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add Site</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-2 sm:gap-4 grid-cols-3">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col items-center space-y-1 sm:space-y-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium text-center">
                  Total
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {sites.length}
              </div>
              <p className="text-xs text-muted-foreground text-center hidden sm:block">
                {sites.filter((s) => s.is_active).length} active
              </p>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex flex-col items-center space-y-1 sm:space-y-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                <span className="text-xs sm:text-sm font-medium text-center">
                  Priority
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {sites.filter((s) => s.priority === "high").length}
              </div>
              <p className="text-xs text-muted-foreground text-center hidden sm:block">
                Require immediate attention
              </p>
            </div>
          </Card>

          <Card className="p-3 sm:p-4">
            <div className="flex flex-col items-center space-y-1 sm:space-y-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm font-medium text-center">
                  Area
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {sites
                  .reduce((total, site) => total + (site.size_sqft || 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground text-center hidden sm:block">
                Square feet
              </p>
            </div>
          </Card>
        </div>

        {/* Sites Table */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">All Sites</CardTitle>
            <CardDescription className="text-sm">
              Manage and monitor all your snow removal locations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {sites.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  No sites yet
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                  Add your first site to start managing snow removal locations.
                </p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-sm"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Add Your First Site
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[200px]">
                        Address
                      </TableHead>
                      <TableHead className="min-w-[80px]">Priority</TableHead>
                      <TableHead className="hidden md:table-cell min-w-[100px]">
                        Size (sq ft)
                      </TableHead>
                      <TableHead className="hidden sm:table-cell min-w-[80px]">
                        Status
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm sm:text-base">
                              {site.name}
                            </div>
                            {/* Show address on mobile when address column is hidden */}
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {site.address}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                          {site.address}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPriorityColor(site.priority)}
                            className="text-xs"
                          >
                            {site.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {site.size_sqft?.toLocaleString() || "N/A"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={site.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {site.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isMobile ? (
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openMobileActions(site)}
                            >
                              <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditModal(site)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Site
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => viewOnMap(site)}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View on Map
                                </DropdownMenuItem>
                                {canManageEmployees && (
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(site)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Site
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Site Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-md mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Add New Site</DialogTitle>
              <DialogDescription className="text-sm">
                Create a new snow removal site location.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleCreateSite}
              className="space-y-3 sm:space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">
                  Site Name *
                </Label>
                <Input
                  id="name"
                  value={newSite.name}
                  onChange={(e) =>
                    setNewSite((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Main Office Complex"
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm">
                  Address *
                </Label>
                <Input
                  id="address"
                  value={newSite.address}
                  onChange={(e) =>
                    setNewSite((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="e.g., 123 Business Ave, City, ST 12345"
                  required
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm">
                    Priority
                  </Label>
                  <Select
                    value={newSite.priority}
                    onValueChange={(value: "high" | "medium" | "low") =>
                      setNewSite((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size_sqft" className="text-sm">
                    Size (sq ft)
                  </Label>
                  <Input
                    id="size_sqft"
                    type="number"
                    value={newSite.size_sqft}
                    onChange={(e) =>
                      setNewSite((prev) => ({
                        ...prev,
                        size_sqft: e.target.value,
                      }))
                    }
                    placeholder="50000"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="typical_salt_usage_kg" className="text-sm">
                    Salt Usage (kg)
                  </Label>
                  <Input
                    id="typical_salt_usage_kg"
                    type="number"
                    step="0.1"
                    value={newSite.typical_salt_usage_kg}
                    onChange={(e) =>
                      setNewSite((prev) => ({
                        ...prev,
                        typical_salt_usage_kg: e.target.value,
                      }))
                    }
                    placeholder="100.0"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone" className="text-sm">
                    Contact Phone
                  </Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={newSite.contact_phone}
                    onChange={(e) =>
                      setNewSite((prev) => ({
                        ...prev,
                        contact_phone: e.target.value,
                      }))
                    }
                    placeholder="555-1234"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_instructions" className="text-sm">
                  Special Instructions
                </Label>
                <Textarea
                  id="special_instructions"
                  value={newSite.special_instructions}
                  onChange={(e) =>
                    setNewSite((prev) => ({
                      ...prev,
                      special_instructions: e.target.value,
                    }))
                  }
                  placeholder="Any special notes or instructions for this site..."
                  className="min-h-[80px] text-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="text-sm w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-sm w-full sm:w-auto"
                >
                  {isSubmitting ? "Creating..." : "Create Site"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Site Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Site</DialogTitle>
              <DialogDescription className="text-sm">
                Update the site information.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSite} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm">
                  Site Name *
                </Label>
                <Input
                  id="edit-name"
                  value={editSite.name}
                  onChange={(e) =>
                    setEditSite((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Main Office Complex"
                  required
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address" className="text-sm">
                  Address *
                </Label>
                <Input
                  id="edit-address"
                  value={editSite.address}
                  onChange={(e) =>
                    setEditSite((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="e.g., 123 Business Ave, City, ST 12345"
                  required
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-priority" className="text-sm">
                    Priority
                  </Label>
                  <Select
                    value={editSite.priority}
                    onValueChange={(value: "high" | "medium" | "low") =>
                      setEditSite((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-size_sqft" className="text-sm">
                    Size (sq ft)
                  </Label>
                  <Input
                    id="edit-size_sqft"
                    type="number"
                    value={editSite.size_sqft}
                    onChange={(e) =>
                      setEditSite((prev) => ({
                        ...prev,
                        size_sqft: e.target.value,
                      }))
                    }
                    placeholder="50000"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-typical_salt_usage_kg"
                    className="text-sm"
                  >
                    Salt Usage (kg)
                  </Label>
                  <Input
                    id="edit-typical_salt_usage_kg"
                    type="number"
                    step="0.1"
                    value={editSite.typical_salt_usage_kg}
                    onChange={(e) =>
                      setEditSite((prev) => ({
                        ...prev,
                        typical_salt_usage_kg: e.target.value,
                      }))
                    }
                    placeholder="100.0"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-contact_phone" className="text-sm">
                    Contact Phone
                  </Label>
                  <Input
                    id="edit-contact_phone"
                    type="tel"
                    value={editSite.contact_phone}
                    onChange={(e) =>
                      setEditSite((prev) => ({
                        ...prev,
                        contact_phone: e.target.value,
                      }))
                    }
                    placeholder="555-1234"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-special_instructions" className="text-sm">
                  Special Instructions
                </Label>
                <Textarea
                  id="edit-special_instructions"
                  value={editSite.special_instructions}
                  onChange={(e) =>
                    setEditSite((prev) => ({
                      ...prev,
                      special_instructions: e.target.value,
                    }))
                  }
                  placeholder="Any special notes or instructions for this site..."
                  className="min-h-[80px] text-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                  className="text-sm w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-sm w-full sm:w-auto"
                >
                  {isSubmitting ? "Updating..." : "Update Site"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Mobile Actions Sheet */}
        <Sheet open={isMobileActionsOpen} onOpenChange={setIsMobileActionsOpen}>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle className="text-lg">
                {selectedMobileSite?.name}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {selectedMobileSite?.address}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 py-4">
              <Button
                className="w-full justify-start gap-2 text-sm"
                variant="outline"
                onClick={handleMobileEdit}
              >
                <Edit className="h-4 w-4" />
                Edit Site
              </Button>
              <Button
                className="w-full justify-start gap-2 text-sm"
                variant="outline"
                onClick={handleMobileViewMap}
              >
                <ExternalLink className="h-4 w-4" />
                View on Map
              </Button>
              {canManageEmployees && (
                <Button
                  className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
                  variant="outline"
                  onClick={handleMobileDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Site
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md mx-2 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Delete Site</DialogTitle>
              <DialogDescription className="text-sm">
                Are you sure you want to delete &ldquo;{deletingSite?.name}
                &rdquo;?
                {deletingSite && (
                  <span className="block mt-2 text-sm text-muted-foreground">
                    This action cannot be undone. If this site has existing
                    reports, it will be deactivated instead of deleted.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSite}
                disabled={isDeleting}
                className="text-sm"
              >
                {isDeleting ? "Deleting..." : "Delete Site"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
