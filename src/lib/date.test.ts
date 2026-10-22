import { describe, expect, it } from "vitest";
import { addDays, daysBetween, maxDateKey, toBangkokDateKey, toDateKey, todayInBangkok } from "./date";

describe("date helpers", () => {
  it("นับจำนวนวันระหว่างสองวันที่", () => {
    expect(daysBetween("2026-01-01", "2026-04-01")).toBe(90);
    expect(daysBetween("2026-10-10", "2026-10-10")).toBe(0);
    expect(daysBetween("2026-10-12", "2026-10-10")).toBe(-2);
  });

  it("บวกวันข้ามเดือนและปีได้ถูกต้อง", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", 90)).toBe("2026-04-01");
  });

  it("ปฏิเสธรูปแบบหรือวันที่ที่ไม่มีจริง", () => {
    expect(() => daysBetween("2026-02-31", "2026-03-01")).toThrow();
    expect(() => daysBetween("10/10/2026", "2026-10-11")).toThrow();
  });

  it("toDateKey อ่านค่า @db.Date (00:00 UTC) ได้ตรงวัน", () => {
    expect(toDateKey(new Date("2026-10-15T00:00:00.000Z"))).toBe("2026-10-15");
  });

  it("วันตามเวลาไทยเลื่อนเป็นวันถัดไปหลัง 17:00 UTC", () => {
    // 20:00 UTC = 03:00 ของวันถัดไปในไทย
    expect(toBangkokDateKey(new Date("2026-10-15T20:00:00Z"))).toBe("2026-10-16");
    expect(todayInBangkok(new Date("2026-10-15T10:00:00Z"))).toBe("2026-10-15");
  });

  it("maxDateKey", () => {
    expect(maxDateKey([])).toBeNull();
    expect(maxDateKey(["2026-10-01", "2026-10-09", "2026-09-30"])).toBe("2026-10-09");
  });
});
