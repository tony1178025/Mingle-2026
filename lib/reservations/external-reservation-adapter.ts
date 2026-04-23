import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExternalReservationSessionContext } from "@/types/mingle";

export type ExternalReservationLookupInput = {
  sessionId: string;
  checkinCode: string;
  reservationExternalId?: string | null;
};

type ExternalReservationRecord = ExternalReservationSessionContext & {
  reservationExternalId?: string | null;
};

const DEFAULT_RESERVATION_FILE = path.join(process.cwd(), ".mingle-data", "reservations.json");

function getReservationSourcePath() {
  return process.env.MINGLE_EXTERNAL_RESERVATION_SOURCE_PATH || DEFAULT_RESERVATION_FILE;
}

async function loadReservationRecords() {
  const sourcePath = getReservationSourcePath();
  let raw: string;

  try {
    raw = await readFile(sourcePath, "utf8");
  } catch (error) {
    throw new Error(
      error instanceof Error && "code" in error && error.code === "ENOENT"
        ? "외부 예약 컨텍스트 소스가 설정되지 않았습니다."
        : "외부 예약 컨텍스트를 불러오지 못했습니다."
    );
  }

  const parsed = JSON.parse(raw) as ExternalReservationRecord[] | { reservations?: ExternalReservationRecord[] };
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.reservations)) {
    return parsed.reservations;
  }

  throw new Error("외부 예약 컨텍스트 형식이 올바르지 않습니다.");
}

// Future NAVER integration should replace this file-backed bridge behind the same boundary.
// This adapter intentionally models external reservation identity separately from in-app participant identity.
export async function getSessionContext(input: ExternalReservationLookupInput) {
  const records = await loadReservationRecords();

  return (
    records.find((record) => {
      if (record.sessionId !== input.sessionId || record.checkinCode !== input.checkinCode) {
        return false;
      }

      if (input.reservationExternalId) {
        return record.reservationExternalId === input.reservationExternalId;
      }

      return true;
    }) ?? null
  );
}
