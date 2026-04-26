import { createHttpRepository } from "@/lib/repositories/http-repository";
import type {
  GrantHeartsRequest,
  GrantHeartsResponse,
  MingleCommand,
  ReservationSessionContextRequest,
  SessionCommandResponse,
  SessionSnapshotResponse
} from "@/types/mingle";

export interface MingleRepository {
  getSessionSnapshot(): Promise<SessionSnapshotResponse>;
  getReservationSessionContext(request: ReservationSessionContextRequest): Promise<SessionCommandResponse>;
  executeCommand(command: MingleCommand): Promise<SessionCommandResponse>;
  grantHearts(request: GrantHeartsRequest): Promise<GrantHeartsResponse>;
}

let repository: MingleRepository | null = null;

export function getMingleRepository(): MingleRepository {
  if (repository) {
    return repository;
  }

  repository = createHttpRepository();
  return repository;
}

export function setMingleRepository(nextRepository: MingleRepository) {
  repository = nextRepository;
}
