import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveObjectStorageConfig } from "@/lib/data";
import { PROFILE_PHOTO_UPLOAD_NOT_READY_MESSAGE } from "@/lib/storage/upload-messages";

/**
 * CDN object cache (set on the stored object; configure CDN edge rules similarly):
 * Cache-Control: public, max-age=31536000, immutable
 */
const PROFILE_OBJECT_CACHE_CONTROL = "public, max-age=31536000, immutable";

function getStorageClient() {
  const storage = resolveObjectStorageConfig();
  if (!storage) {
    return null;
  }

  return new S3Client({
    region: storage.region,
    endpoint: storage.endpoint,
    forcePathStyle: storage.forcePathStyle,
    credentials: {
      accessKeyId: storage.accessKeyId,
      secretAccessKey: storage.secretAccessKey
    }
  });
}

function sanitizeProfileSubjectId(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return "temp";
  }
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 96);
  return cleaned || "temp";
}

function resolvePublicAssetBase(storage: NonNullable<ReturnType<typeof resolveObjectStorageConfig>>) {
  if (storage.provider === "r2") {
    const fromEnv = process.env.R2_PUBLIC_BASE_URL?.trim();
    if (fromEnv) {
      return fromEnv.replace(/\/$/, "");
    }
  }
  return storage.publicBaseUrl.replace(/\/$/, "");
}

export async function POST(request: Request) {
  const storage = resolveObjectStorageConfig();
  if (!storage) {
    return NextResponse.json({
      uploadEnabled: false,
      helperMessage: PROFILE_PHOTO_UPLOAD_NOT_READY_MESSAGE
    });
  }

  const { fileName, contentType, profileSubjectId } = (await request.json()) as {
    fileName?: string;
    contentType?: string;
    profileSubjectId?: string;
  };

  if (!fileName || !contentType) {
    return new NextResponse("fileName과 contentType이 필요합니다.", {
      status: 400
    });
  }

  if (contentType !== "image/webp" && contentType !== "image/jpeg") {
    return new NextResponse("contentType은 image/webp 또는 image/jpeg이어야 합니다.", {
      status: 400
    });
  }

  const client = getStorageClient();
  if (!client) {
    return new NextResponse("스토리지 클라이언트를 생성하지 못했습니다.", {
      status: 500
    });
  }

  const subject = sanitizeProfileSubjectId(profileSubjectId);
  const imageId = randomUUID();
  const extension = contentType === "image/webp" ? ".webp" : ".jpg";
  const key = `profile/${subject}/${imageId}${extension}`;

  const command = new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: PROFILE_OBJECT_CACHE_CONTROL
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 60
  });

  const publicBase = resolvePublicAssetBase(storage);

  return NextResponse.json({
    uploadEnabled: true,
    key,
    uploadUrl,
    assetUrl: `${publicBase}/${key}`,
    provider: storage.provider
  });
}
