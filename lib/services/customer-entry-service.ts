import { getServerSessionSnapshot } from "@/lib/repositories/server-repository";
import type { CustomerEntryResponse } from "@/types/mingle";

type ResolveEntryInput = {
  branchId: string;
  tableId: number;
};

function isOpenSessionPhase(phase: string) {
  return phase === "WAITING" || phase === "CHECKIN" || phase === "ROUND_1" || phase === "ROUND_2";
}

export async function resolveCustomerEntry(input: ResolveEntryInput): Promise<CustomerEntryResponse> {
  const snapshot = await getServerSessionSnapshot();
  const { branchId, tableId } = input;

  if (
    !branchId ||
    !Number.isInteger(tableId) ||
    tableId < 1 ||
    branchId !== snapshot.session.branchId ||
    tableId > snapshot.session.tableCount
  ) {
    return {
      status: "INVALID",
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

  return {
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
}
