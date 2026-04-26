export function isDbAuthorityConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function isTestRuntime() {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

export function useDbAuthority() {
  if (isTestRuntime()) {
    return false;
  }
  return process.env.USE_DB_AUTHORITY === "true";
}

export function readFromDbAuthority() {
  if (isTestRuntime()) {
    return (
      process.env.READ_FROM_DB === "true" &&
      process.env.MINGLE_TEST_ALLOW_DB_AUTHORITY === "true"
    );
  }
  return process.env.READ_FROM_DB === "true" || useDbAuthority();
}
