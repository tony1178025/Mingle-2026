import { getDbAuthorityRepository } from "@/lib/repositories/authority-backend";
import {
  getReservationSessionContext,
  getServerSessionSnapshot,
  sanitizeSnapshotForClient
} from "@/lib/repositories/server-repository";
import type { CustomerEntryResponse } from "@/types/mingle";

type ResolveEntryInput = {
  branchId: string;
  tableId: number;
  checkinCode?: string;
};

function isOpenSessionPhase(phase: string) {
  return phase === "WAITING" || phase === "CHECKIN" || phase === "ROUND_1" || phase === "ROUND_2";
}

async function maybeResolveCheckinFromCode(
  branchId: string,
  tableId: number,
  checkinCode?: string
): Promise<Pick<CustomerEntryResponse, "checkinResolution" | "snapshot" | "participantId">> {
  const trimmed = checkinCode?.trim() ?? "";
  if (!trimmed) {
    return {};
  }
  const result = await getReservationSessionContext({
    branchId,
    tableId,
    checkinCode: trimmed,
    participantId: null
  });
  return {
    checkinResolution: result.checkinResolution ?? null,
    snapshot: sanitizeSnapshotForClient(result.snapshot),
    participantId: result.participantId ?? null
  };
}

export async function resolveCustomerEntry(input: ResolveEntryInput): Promise<CustomerEntryResponse> {
  const { branchId, tableId } = input;
  if (!branchId || !Number.isInteger(tableId) || tableId < 1) {
    return {
      status: "INVALID_BRANCH_OR_TABLE",
      message: "입장 정보를 확인할 수 없어요."
    };
  }

  const dbRepository = getDbAuthorityRepository();
  if (dbRepository) {
    const branch = await dbRepository.getBranch(branchId);
    if (!branch || tableId > branch.default_table_count) {
      return {
        status: "INVALID_BRANCH_OR_TABLE",
        message: "입장 정보를 확인할 수 없어요."
      };
    }
    const sessions = await dbRepository.listManagedSessions(branchId);
    const activeSession =
      sessions.find((session) => session.status === "OPEN" && session.phase !== "CLOSED") ?? null;
    if (!activeSession) {
      return {
        status: "NO_OPEN_SESSION",
        message: "현재 입장 가능한 세션이 없습니다."
      };
    }
    const base: CustomerEntryResponse = {
      status: "OK",
      sessionId: activeSession.id,
      branch: {
        id: branch.id,
        name: branch.name
      },
      table: {
        id: `${branch.id}:${tableId}`,
        tableNumber: tableId
      }
    };
    const checkin = await maybeResolveCheckinFromCode(branchId, tableId, input.checkinCode);
    return { ...base, ...checkin };
  }

  const snapshot = await getServerSessionSnapshot();

  if (
    branchId !== snapshot.session.branchId ||
    tableId > snapshot.session.tableCount
  ) {
    return {
      status: "INVALID_BRANCH_OR_TABLE",
      message: "입장 정보를 확인할 수 없어요."
    };
  }

  const isOpenByLifecycle =
    typeof snapshot.session.lifecycleStatus === "string"
      ? snapshot.session.lifecycleStatus === "OPEN"
      : true;
  if (!isOpenByLifecycle || !isOpenSessionPhase(snapshot.session.phase)) {
    return {
      status: "NO_OPEN_SESSION",
      message: "현재 입장 가능한 세션이 없습니다."
    };
  }

  const base: CustomerEntryResponse = {
    status: "OK",
    sessionId: snapshot.session.id,
    branch: {
      id: snapshot.session.branchId,
      name: snapshot.session.branchName
    },
    table: {
      id: `${snapshot.session.branchId}:${tableId}`,
      tableNumber: tableId
    }
  };
  const checkin = await maybeResolveCheckinFromCode(branchId, tableId, input.checkinCode);
  return { ...base, ...checkin };
}
