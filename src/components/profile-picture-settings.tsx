"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

interface UserData {
  id: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

interface ProfilePictureSettingsProps {
  userData: UserData | null;
  userId: string;
}

export function ProfilePictureSettings({
  userData,
}: ProfilePictureSettingsProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Fetch signed URL for avatar when component mounts
  useEffect(() => {
    const fetchAvatarSignedUrl = async () => {
      if (!session) return;

      try {
        setIsLoadingAvatar(true);
        const response = await fetch("/api/user/profile-picture");

        if (response.ok) {
          const data = await response.json();
          setPreviewUrl(data.avatar_url || null);
        }
      } catch (error) {
        console.error("Error fetching avatar signed URL:", error);
      } finally {
        setIsLoadingAvatar(false);
      }
    };

    fetchAvatarSignedUrl();
  }, [session]);

  // Handle profile image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Create a preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Supabase
      setIsUploading(true);
      await uploadProfileImage(file);
    } catch (error) {
      console.error("Error handling file upload:", error);
      toast.error("Failed to upload profile image");
    } finally {
      setIsUploading(false);
    }
  };

  // Upload profile image to Supabase storage
  const uploadProfileImage = async (file: File) => {
    try {
      // Create form data for API request
      const formData = new FormData();
      formData.append("file", file);

      // Send to API endpoint
      const response = await fetch("/api/user/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload profile image");
      }

      const result = await response.json();

      // Update preview URL - server now handles cache busting
      setPreviewUrl(result.avatarUrl);

      // Invalidate the user avatar cache to refresh sidebar
      if (session?.user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["userAvatar", session.user.id],
        });
      }

      toast.success("Profile picture updated successfully");
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw error;
    }
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      // Close any existing stream first
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      setStream(mediaStream);
      setShowCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error(
        "Camera access failed. Please make sure you have granted camera permissions."
      );
    }
  };

  // Capture photo from camera
  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        try {
          setIsUploading(true);
          // Create a preview
          const objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);

          // Create a File from Blob
          const file = new File([blob], "camera-photo.jpg", {
            type: "image/jpeg",
          });
          await uploadProfileImage(file);

          // Clean up camera
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
          }
          setShowCamera(false);
        } catch (error) {
          console.error("Error capturing photo:", error);
          toast.error("Failed to save profile picture");
        } finally {
          setIsUploading(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <Card style={{ maxWidth: "92%" }}>
      <CardContent className="pt-6 flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <Avatar className="h-32 w-32 mb-4">
            {isLoadingAvatar ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <AvatarImage
                  src={previewUrl || undefined}
                  alt="Profile picture"
                />
                <AvatarFallback>
                  {userData?.display_name
                    ? userData.display_name.substring(0, 2).toUpperCase()
                    : "U"}
                </AvatarFallback>
              </>
            )}
          </Avatar>

          <p className="text-sm text-muted-foreground mb-4">
            Upload a profile picture or take a photo with your camera
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload Image
            </Button>

            <Button
              variant="outline"
              onClick={initializeCamera}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Use Camera
            </Button>
          </div>
        </div>

        {showCamera && (
          <div className="w-full max-w-md aspect-square relative mb-4 rounded-xl overflow-hidden border">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <Button
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
              onClick={capturePhoto}
            >
              Take Photo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
