import { describe, expect, it } from "vitest";
import { createCsvFromRows, parseManualReservationCsv } from "@/lib/reservations/manual-reservation";

describe("manual reservation csv", () => {
  it("parses valid reservation rows and finds duplicate phones", () => {
    const csv = [
      "예약자명,휴대폰,성별,출생연도,이용일,회차,결제상태,예약상태,메모",
      "홍길동,010-1111-2222,남,1994,2026-04-26,1부,확정,확정,재방문",
      "김하나,01011112222,여,1997,2026-04-26,2부,예약,예약,",
      "이둘,010-9999-8888,남,1992,2026-04-26,1+2부,체크인 완료,체크인 완료,현장입장"
    ].join("\n");

    const result = parseManualReservationCsv(csv);
    expect(result.issues).toHaveLength(0);
    expect(result.rows).toHaveLength(3);
    expect(result.duplicatePhones).toEqual(["01011112222"]);
    expect(result.rows[0]?.source).toBe("CSV");
    expect(result.rows[0]?.slot).toBe("1부");
  });

  it("returns issues when required headers are missing", () => {
    const csv = ["이름,전화번호,성별", "홍길동,010-1111-2222,남"].join("\n");
    const result = parseManualReservationCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.issues[0]?.message).toContain("필수 컬럼 누락");
  });

  it("creates csv output", () => {
    const csv = createCsvFromRows(
      [
        { name: "홍길동", phone: "01011112222", status: "확정" },
        { name: "김하나", phone: "01033334444", status: "예약" }
      ],
      ["name", "phone", "status"]
    );
    expect(csv.split("\n")[0]).toBe("name,phone,status");
    expect(csv).toContain("홍길동");
  });
});
