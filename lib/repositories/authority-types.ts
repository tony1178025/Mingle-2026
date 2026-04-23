import type { SessionSnapshot } from "../../types/mingle.ts";

export type AuthorityBackend = "file" | "db";

export type AuthorityReadOptions = {
  fresh?: boolean;
};

export interface SessionAuthorityRepository {
  kind: AuthorityBackend;
  getSessionSnapshot(options?: AuthorityReadOptions): Promise<SessionSnapshot>;
  getExistingSessionSnapshot(options?: AuthorityReadOptions): Promise<SessionSnapshot | null>;
  persistSessionSnapshot(nextSnapshot: SessionSnapshot): Promise<SessionSnapshot>;
  subscribeToSessionSnapshots(listener: (snapshot: SessionSnapshot) => void): () => void;
}
