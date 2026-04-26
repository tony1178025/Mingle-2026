#!/usr/bin/env node

const args = process.argv.slice(2);

function readArg(name) {
  const pref = `--${name}=`;
  const direct = args.find((arg) => arg.startsWith(pref));
  if (direct) return direct.slice(pref.length);
  const idx = args.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return null;
}

const baseUrl =
  readArg("baseUrl") ||
  process.env.VERIFY_DEPLOY_BASE_URL ||
  process.env.DEPLOY_BASE_URL ||
  "";

if (!baseUrl) {
  console.error("Missing base URL. Use --baseUrl or VERIFY_DEPLOY_BASE_URL.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(baseUrl);
} catch {
  console.error(`Invalid base URL: ${baseUrl}`);
  process.exit(1);
}

const origin = parsed.origin;
const checks = [
  { name: "api current", path: "/api/session/current", expectJson: true },
  { name: "admin page", path: "/admin", expectText: "admin" },
  { name: "customer page", path: "/customer", expectText: "customer" }
];

async function runCheck(check) {
  const url = `${origin}${check.path}`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${check.name} failed: ${response.status} ${url}`);
  }
  if (check.expectJson) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`${check.name} expected JSON but got ${contentType || "unknown"}`);
    }
    await response.json();
  } else {
    const body = (await response.text()).toLowerCase();
    if (check.expectText && !body.includes(check.expectText)) {
      throw new Error(`${check.name} loaded but expected marker "${check.expectText}" not found`);
    }
  }
  return `${check.name}: ok (${response.status})`;
}

async function main() {
  console.log(`Verifying deployed endpoints at ${origin}`);
  for (const check of checks) {
    const result = await runCheck(check);
    console.log(result);
  }
  console.log("verify:deploy completed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

