export function isDbAuthorityConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function useDbAuthority() {
  return process.env.USE_DB_AUTHORITY === "true";
}

export function readFromDbAuthority() {
  return process.env.READ_FROM_DB === "true" || useDbAuthority();
}
