import { resolveDataMode } from "@/lib/data";
import { createBrowserSeedRepository } from "@/lib/repositories/seed-repository";
import { createSupabaseRepository } from "@/lib/repositories/supabase-repository";
import type { SessionSnapshot } from "@/types/mingle";

export interface MingleRepository {
  getSessionSnapshot(): Promise<SessionSnapshot>;
  saveSessionSnapshot(snapshot: SessionSnapshot): Promise<SessionSnapshot>;
  resetDemo(): Promise<SessionSnapshot>;
}

let repository: MingleRepository | null = null;

export function getMingleRepository(): MingleRepository {
  if (repository) {
    return repository;
  }

  const mode = resolveDataMode();
  repository = mode === "supabase" ? createSupabaseRepository() : createBrowserSeedRepository();
  return repository;
}

export function setMingleRepository(nextRepository: MingleRepository) {
  repository = nextRepository;
}
