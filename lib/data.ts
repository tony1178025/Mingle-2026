export const USE_DEMO_SEED = process.env.NEXT_PUBLIC_USE_DEMO_SEED !== "false";

export type StorageProvider = "r2" | "s3";

export interface ObjectStorageConfig {
  provider: StorageProvider;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  endpoint?: string;
  forcePathStyle: boolean;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isFirebaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

export function getStorageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER?.toLowerCase() === "s3" ? "s3" : "r2";
}

export function resolveObjectStorageConfig(): ObjectStorageConfig | null {
  const provider = getStorageProvider();

  if (provider === "s3") {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
    const region = process.env.S3_REGION || process.env.AWS_REGION;

    if (!bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl || !region) {
      return null;
    }

    return {
      provider,
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      publicBaseUrl,
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
    };
  }

  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.AWS_REGION || "auto";

  if (!bucket || !accessKeyId || !secretAccessKey || !publicBaseUrl || !endpoint) {
    return null;
  }

  return {
    provider,
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    endpoint,
    forcePathStyle: false
  };
}

export function isObjectStorageConfigured() {
  return resolveObjectStorageConfig() !== null;
}

export function resolveDataMode() {
  if (isSupabaseConfigured()) return "supabase";
  return USE_DEMO_SEED ? "seed" : "fallback";
}
