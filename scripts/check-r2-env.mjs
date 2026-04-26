import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, "mingle_R2.env");

const REQUIRED_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PUBLIC_BASE_URL"
];

function parseEnv(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

if (!existsSync(envPath)) {
  console.error("[check:r2] mingle_R2.env 파일이 없습니다.");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const missing = REQUIRED_KEYS.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error("[check:r2] 누락된 키:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("[check:r2] 필수 키가 모두 존재합니다.");
console.log("[check:r2] 확인된 키:");
for (const key of REQUIRED_KEYS) {
  console.log(`- ${key}`);
}
