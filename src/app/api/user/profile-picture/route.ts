import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { secureError } from "@/lib/utils/secure-logger";

async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${session.user.id}/avatar.${fileExt}`;

    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(fileArrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, fileBuffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // 🔒 SECURITY: Generate signed URL for private bucket access
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage.from("avatars").createSignedUrl(fileName, 3600); // 1 hour expiry

    if (signedUrlError) throw signedUrlError;

    // Store the file path (not the signed URL) in the database for future signed URL generation
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    // Create a stable timestamp for cache busting (only when avatar actually changes)
    const avatarTimestamp = Date.now();

    // Update user record with avatar path and timestamp
    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar_url: publicUrlData.publicUrl, // Store the path for reference
        avatar_updated_at: new Date(avatarTimestamp).toISOString(),
      })
      .eq("id", session.user.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      avatarUrl: signedUrlData.signedUrl, // Return the signed URL for immediate use
    });
  } catch (error) {
    secureError("Error uploading profile picture:", error);
    return NextResponse.json(
      { error: "Failed to upload profile picture" },
      { status: 500 }
    );
  }
}

async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user data including avatar_updated_at
    const { data, error } = await supabase
      .from("users")
      .select("display_name, avatar_url, avatar_updated_at")
      .eq("id", session.user.id)
      .single();

    if (error) throw error;

    let avatarUrl = null;

    // 🔒 SECURITY: Generate signed URL for private bucket access
    if (data.avatar_url) {
      try {
        // Extract the file path from the stored URL
        const urlParts = data.avatar_url.split("avatars/");
        const filePath = urlParts[1];

        if (filePath) {
          // Generate signed URL (valid for 1 hour)
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from("avatars")
              .createSignedUrl(filePath, 3600); // 1 hour expiry

          if (signedUrlError) {
            secureError(
              "Error creating signed URL for avatar:",
              signedUrlError
            );
            avatarUrl = null; // Fallback to no avatar if signing fails
          } else {
            avatarUrl = signedUrlData.signedUrl;
          }
        }
      } catch (signedUrlError) {
        secureError("Error processing avatar signed URL:", signedUrlError);
        avatarUrl = null; // Fallback to no avatar if processing fails
      }
    }

    return NextResponse.json({
      display_name: data.display_name,
      avatar_url: avatarUrl,
    });
  } catch (error) {
    secureError("Error fetching user avatar data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user avatar data" },
      { status: 500 }
    );
  }
}

// Export with error handling and rate limiting
const POSTHandler = withErrorHandling(withRateLimit(RATE_LIMITS.UPLOAD, POST));
const GETHandler = withErrorHandling(GET);

export { POSTHandler as POST, GETHandler as GET };
