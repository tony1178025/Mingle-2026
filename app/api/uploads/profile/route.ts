import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { resolveObjectStorageConfig } from "@/lib/data";
import { createId } from "@/lib/mingle";

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

export async function POST(request: Request) {
  const storage = resolveObjectStorageConfig();
  if (!storage) {
    return new NextResponse("R2 또는 S3 업로드 환경 변수가 아직 설정되지 않았습니다.", {
      status: 503
    });
  }

  const { fileName, contentType } = (await request.json()) as {
    fileName?: string;
    contentType?: string;
  };

  if (!fileName || !contentType) {
    return new NextResponse("fileName과 contentType이 필요합니다.", {
      status: 400
    });
  }

  const client = getStorageClient();
  if (!client) {
    return new NextResponse("스토리지 클라이언트를 생성하지 못했습니다.", {
      status: 500
    });
  }

  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  const key = `profiles/${createId("profile")}${extension}`;

  const command = new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    ContentType: contentType
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 60
  });

  return NextResponse.json({
    key,
    uploadUrl,
    assetUrl: `${storage.publicBaseUrl.replace(/\/$/, "")}/${key}`,
    provider: storage.provider
  });
}
