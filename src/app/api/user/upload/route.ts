import { secureError } from "@/lib/utils/secure-logger";
import { withErrorHandling } from "@/lib/api-error-handler";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function handleUpload(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if it's a direct file upload (multipart/form-data)
  const contentType = request.headers.get("content-type");

  if (contentType?.includes("multipart/form-data")) {
    return handleDirectUpload(request);
  }

  // Otherwise, handle signed URL generation (existing flow)
  return handleSignedUrlGeneration(request);
}

async function handleDirectUpload(request: NextRequest) {
  // Get user session for path generation
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/", "video/"];
  if (!allowedTypes.some((type) => file.type.startsWith(type))) {
    return Response.json(
      { error: "Invalid file type. Only images and videos are allowed." },
      { status: 400 }
    );
  }

  // Generate user-specific key for better organization and security
  const key = `users/${session.user.id}/${Date.now()}-${file.name}`;

  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload directly to S3 from server
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  });

  await s3.send(command);

  const publicUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;

  return Response.json({
    success: true,
    publicUrl,
    path: key,
  });
}

async function handleSignedUrlGeneration(request: NextRequest) {
  // Get user session for path generation
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate environment variables
  if (
    !process.env.AWS_REGION ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.AWS_S3_BUCKET ||
    !process.env.CLOUDFRONT_DOMAIN
  ) {
    secureError("Missing required AWS environment variables");
    return Response.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Parse and validate request body
  const body = await request.json();
  const { filename, contentType } = body;

  if (!filename || !contentType) {
    secureError("Missing filename or contentType");
    return Response.json(
      { error: "Missing filename or contentType" },
      { status: 400 }
    );
  }

  // Validate file type (optional security measure)
  const allowedTypes = ["image/", "video/"];
  if (!allowedTypes.some((type) => contentType.startsWith(type))) {
    secureError("Invalid file type:", contentType);
    return Response.json(
      { error: "Invalid file type. Only images and videos are allowed." },
      { status: 400 }
    );
  }

  // Generate user-specific key for better organization and security
  const key = `users/${session.user.id}/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

  const publicUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;

  return Response.json({
    url,
    path: key,
    publicUrl,
  });
}

export const POST = withErrorHandling(handleUpload);
