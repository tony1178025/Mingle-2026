export type ManualReservationRound = "1부" | "2부" | "1+2부";
export type ManualReservationStatus = "예약" | "확정" | "취소" | "노쇼" | "체크인 완료";

export interface ManualReservationRow {
  source: "NAVER" | "MANUAL" | "IMWEB" | "CSV";
  externalReservationId?: string;
  branchId?: string;
  eventDate: string;
  slot: ManualReservationRound;
  name: string;
  phone: string;
  normalizedPhone: string;
  gender: string;
  birthYear?: string;
  age?: string;
  paymentStatus: string;
  reservationStatus: string;
  memo: string;
  privacyConsent?: string;
  marketingConsent?: string;
  importedAt: string;
  rawRow: Record<string, string>;
}

export interface ManualReservationImportIssue {
  row: number;
  message: string;
}

export interface ManualReservationImportResult {
  rows: ManualReservationRow[];
  issues: ManualReservationImportIssue[];
  duplicatePhones: string[];
}

const ALIASES = {
  name: ["이름", "예약자명", "방문자명"],
  phone: ["전화번호", "휴대폰", "연락처"],
  reservationDate: ["예약일", "이용일", "방문일"],
  reservationTime: ["예약시간", "이용시간"],
  productName: ["상품명", "예약상품", "프로그램명"],
  slot: ["회차", "옵션", "상품옵션"],
  people: ["인원수"],
  paymentStatus: ["결제상태"],
  reservationStatus: ["예약상태"],
  memo: ["요청사항", "메모"],
  gender: ["성별"],
  birthYear: ["출생연도"],
  age: ["나이"],
  externalReservationId: ["externalReservationId", "예약번호", "주문번호"]
} as const;

const ALLOWED_ROUNDS = new Set<ManualReservationRound>(["1부", "2부", "1+2부"]);
const ALLOWED_STATUSES = new Set<ManualReservationStatus>([
  "예약",
  "확정",
  "취소",
  "노쇼",
  "체크인 완료"
]);

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    const next = line[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82")) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function parseManualReservationCsv(csvText: string): ManualReservationImportResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      rows: [],
      issues: [{ row: 1, message: "CSV 내용이 비어 있습니다." }],
      duplicatePhones: []
    };
  }

  const headers = splitCsvLine(lines[0]!);
  const resolveAlias = (keys: readonly string[]) => keys.find((key) => headers.includes(key)) ?? null;
  const nameKey = resolveAlias(ALIASES.name);
  const phoneKey = resolveAlias(ALIASES.phone);
  const dateKey = resolveAlias(ALIASES.reservationDate);
  const slotKey = resolveAlias(ALIASES.slot);
  const paymentStatusKey = resolveAlias(ALIASES.paymentStatus);
  const genderKey = resolveAlias(ALIASES.gender);
  const missingHeaders = [
    ["이름", nameKey],
    ["전화번호", phoneKey],
    ["예약일", dateKey],
    ["회차", slotKey],
    ["결제상태", paymentStatusKey],
    ["성별", genderKey]
  ]
    .filter(([, resolved]) => !resolved)
    .map(([label]) => label);
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      issues: [{ row: 1, message: `필수 컬럼 누락: ${missingHeaders.join(", ")}` }],
      duplicatePhones: []
    };
  }

  const rows: ManualReservationRow[] = [];
  const issues: ManualReservationImportIssue[] = [];
  const phoneCount = new Map<string, number>();

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = splitCsvLine(lines[lineIndex]!);
    const rowMap = Object.fromEntries(headers.map((header, idx) => [header, cells[idx] ?? ""]));

    const rowNumber = lineIndex + 1;
    const name = String(rowMap[nameKey!] ?? "").trim();
    const phoneRaw = String(rowMap[phoneKey!] ?? "").trim();
    const normalizedPhone = normalizePhone(phoneRaw);
    const gender = String(rowMap[genderKey!] ?? "").trim();
    const birthYear = String(rowMap[resolveAlias(ALIASES.birthYear) ?? ""] ?? "").trim();
    const age = String(rowMap[resolveAlias(ALIASES.age) ?? ""] ?? "").trim();
    const reservationDate = String(rowMap[dateKey!] ?? "").trim();
    const round = String(rowMap[slotKey!] ?? "").trim() as ManualReservationRound;
    const paymentStatus = String(rowMap[paymentStatusKey!] ?? "").trim();
    const reservationStatus = String(rowMap[resolveAlias(ALIASES.reservationStatus) ?? ""] ?? "").trim() || paymentStatus;
    const memo = String(rowMap[resolveAlias(ALIASES.memo) ?? ""] ?? "").trim();
    const externalReservationId = String(
      rowMap[resolveAlias(ALIASES.externalReservationId) ?? ""] ?? ""
    ).trim();

    if (!name || !normalizedPhone || !gender || !reservationDate || !round || !paymentStatus) {
      issues.push({ row: rowNumber, message: "필수 값이 비어 있습니다." });
      continue;
    }
    if (!ALLOWED_ROUNDS.has(round)) {
      issues.push({ row: rowNumber, message: `지원하지 않는 회차 값: ${round}` });
      continue;
    }
    if (ALLOWED_STATUSES.has(paymentStatus as ManualReservationStatus) === false) {
      issues.push({ row: rowNumber, message: `지원하지 않는 결제상태 값: ${paymentStatus}` });
      continue;
    }

    rows.push({
      source: "CSV",
      externalReservationId: externalReservationId || undefined,
      eventDate: reservationDate,
      slot: round,
      name,
      phone: phoneRaw,
      normalizedPhone,
      gender,
      birthYear: birthYear || undefined,
      age: age || undefined,
      paymentStatus,
      reservationStatus,
      memo,
      importedAt: new Date().toISOString(),
      rawRow: rowMap
    });
    phoneCount.set(normalizedPhone, (phoneCount.get(normalizedPhone) ?? 0) + 1);
  }

  const duplicatePhones = [...phoneCount.entries()]
    .filter(([, count]) => count > 1)
    .map(([phone]) => phone);

  return { rows, issues, duplicatePhones };
}

export function createCsvFromRows<T extends Record<string, string | number | null | undefined>>(
  rows: T[],
  headers: Array<keyof T>
) {
  const escapeCell = (value: string | number | null | undefined) => {
    const raw = value == null ? "" : String(value);
    if (!raw.includes(",") && !raw.includes("\"") && !raw.includes("\n")) {
      return raw;
    }
    return `"${raw.replace(/"/g, "\"\"")}"`;
  };

  const head = headers.map((header) => escapeCell(String(header))).join(",");
  const body = rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","));
  return [head, ...body].join("\n");
}
