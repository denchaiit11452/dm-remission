import { describe, expect, it } from "vitest";
import { alertHref, formatThaiDateTime, formatThaiTime, parseAlertQuery, sortNewAlerts, valueTextOf } from "./alert-center";

describe("parseAlertQuery / alertHref", () => {
  it("ค่าเริ่มต้นและค่าที่ผิดรูปแบบ", () => {
    expect(parseAlertQuery({})).toEqual({ tab: "new", page: 1 });
    expect(parseAlertQuery({ tab: "x", page: "-3" })).toEqual({ tab: "new", page: 1 });
  });
  it("แท็บ ack/cancel มีเลขหน้า แท็บ new ไม่มี", () => {
    expect(parseAlertQuery({ tab: "ack", page: "3" })).toEqual({ tab: "ack", page: 3 });
    expect(parseAlertQuery({ tab: "new", page: "3" })).toEqual({ tab: "new", page: 1 });
    expect(parseAlertQuery({ tab: ["cancel", "ack"], page: "abc" })).toEqual({ tab: "cancel", page: 1 });
  });
  it("สร้างลิงก์สั้น ไม่ใส่ค่าเริ่มต้น", () => {
    expect(alertHref("new")).toBe("/alerts");
    expect(alertHref("ack")).toBe("/alerts?tab=ack");
    expect(alertHref("cancel", 2)).toBe("/alerts?tab=cancel&page=2");
  });
});

describe("sortNewAlerts", () => {
  it("วิกฤตก่อนความเสี่ยงสูง แล้วใหม่ก่อน", () => {
    const rows = [
      { id: "h-old", level: "HIGH" as const, createdAt: "2026-10-15T01:00:00Z" },
      { id: "c-old", level: "CRITICAL" as const, createdAt: "2026-10-15T02:00:00Z" },
      { id: "h-new", level: "HIGH" as const, createdAt: "2026-10-15T05:00:00Z" },
      { id: "c-new", level: "CRITICAL" as const, createdAt: "2026-10-15T03:00:00Z" },
    ];
    expect(sortNewAlerts(rows).map((r) => r.id)).toEqual(["c-new", "c-old", "h-new", "h-old"]);
  });
  it("ไม่แก้อาร์เรย์เดิม", () => {
    const rows = [{ level: "HIGH" as const, createdAt: "a" }, { level: "CRITICAL" as const, createdAt: "b" }];
    sortNewAlerts(rows);
    expect(rows[0].level).toBe("HIGH");
  });
});

describe("valueTextOf", () => {
  it("น้ำตาล ความดัน LO/HI และไม่มีข้อมูล", () => {
    expect(valueTextOf({ glucose: { valueMgDl: 452, meterFlag: "NONE" }, lab: null })).toBe("452 mg/dL");
    expect(valueTextOf({ glucose: { valueMgDl: null, meterFlag: "METER_HIGH" }, lab: null })).toBe("HI");
    expect(valueTextOf({ glucose: null, lab: { sbp: 186, dbp: 102 } })).toBe("186/102 mmHg");
    expect(valueTextOf({ glucose: null, lab: { sbp: 190, dbp: null } })).toBe("190/- mmHg");
    expect(valueTextOf({ glucose: null, lab: null })).toBeNull();
  });
});

describe("formatThaiDateTime", () => {
  it("แปลง UTC เป็นเวลาไทยและข้ามวันได้", () => {
    expect(formatThaiDateTime("2026-10-15T02:12:00.000Z")).toBe("15 ต.ค. 09:12 น.");
    expect(formatThaiDateTime("2026-10-14T18:30:00.000Z")).toBe("15 ต.ค. 01:30 น.");
    expect(formatThaiTime("2026-10-15T02:12:00.000Z")).toBe("09:12 น.");
  });
  it("ไม่มีค่า/ผิดรูปแบบ", () => {
    expect(formatThaiDateTime(null)).toBe("-");
    expect(formatThaiDateTime("abc")).toBe("-");
  });
});
