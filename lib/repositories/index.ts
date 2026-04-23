import { createHttpRepository } from "@/lib/repositories/http-repository";
import type {
  CommandResult,
  GrantHeartsRequest,
  GrantHeartsResponse,
  MingleCommand,
  ReservationSessionContextRequest,
  SessionSnapshotResponse
} from "@/types/mingle";

export interface MingleRepository {
  getSessionSnapshot(): Promise<SessionSnapshotResponse>;
  getReservationSessionContext(request: ReservationSessionContextRequest): Promise<CommandResult>;
  executeCommand(command: MingleCommand): Promise<CommandResult>;
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
