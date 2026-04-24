const baseUrl = (process.argv[2] || process.env.BASE_URL || "").trim().replace(/\/+$/, "");

if (!baseUrl) {
  console.error("Missing BASE_URL. Usage: node scripts/diagnose-production.mjs https://your-app.vercel.app");
  process.exit(2);
}

const targets = ["/", "/admin", "/customer", "/api/session/current", "/api/session/events"];
let hasCriticalApi500 = false;

function previewBody(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 800);
}

for (const target of targets) {
  const url = `${baseUrl}${target}`;
  try {
    const response = await fetch(url, {
      headers: target === "/api/session/events" ? { Accept: "application/json" } : undefined
    });
    const body = await response.text();
    const preview = previewBody(body);
    const contentType = response.headers.get("content-type") ?? "unknown";
    console.log(`${response.status} ${target}`);
    console.log(`  content-type: ${contentType}`);

    if (target === "/api/session/current" || target === "/api/session/events") {
      try {
        const parsed = JSON.parse(body);
        console.log(`  json: ${JSON.stringify(parsed).slice(0, 800)}`);
      } catch {
        console.log(preview ? `  body: ${preview}` : "  body: <empty>");
      }
    } else {
      console.log(preview ? `  body: ${preview}` : "  body: <empty>");
    }

    if ((target === "/api/session/current" || target === "/api/session/events") && response.status === 500) {
      hasCriticalApi500 = true;
    }
  } catch (error) {
    if (target === "/api/session/current" || target === "/api/session/events") {
      hasCriticalApi500 = true;
    }
    console.log(`ERR ${target}`);
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (hasCriticalApi500) {
  process.exit(1);
}
