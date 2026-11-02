import { describe, expect, it } from "vitest";
import { formatAgo, formatGlucoseValue, formatRange, formatThaiDate, formatThaiRange, periodLabel } from "./format";

describe("formatThaiDate", () => {
  it("แปลงเป็นวันที่ไทย พ.ศ.", () => {
    expect(formatThaiDate("2026-10-14")).toBe("14 ต.ค. 2569");
    expect(formatThaiDate("2026-01-05")).toBe("5 ม.ค. 2569");
  });
  it("ไม่มีค่าหรือรูปแบบผิดได้เครื่องหมายขีด", () => {
    expect(formatThaiDate(null)).toBe("-");
    expect(formatThaiDate("abc")).toBe("-");
    expect(formatThaiDate("2026-13-01")).toBe("-");
  });
});

describe("formatGlucoseValue", () => {
  it("ตัวเลขปกติ", () => expect(formatGlucoseValue(452, "NONE")).toEqual({ text: "452", unit: "mg/dL" }));
  it("LO / HI จากเครื่อง", () => {
    expect(formatGlucoseValue(null, "METER_LOW")).toEqual({ text: "LO", unit: null });
    expect(formatGlucoseValue(null, "METER_HIGH")).toEqual({ text: "HI", unit: null });
  });
  it("ไม่มีค่า", () => expect(formatGlucoseValue(null, "NONE")).toEqual({ text: "-", unit: null }));
});

describe("formatRange", () => {
  it("หน้าแรกและหน้าสุดท้าย", () => {
    expect(formatRange(1, 25, 248)).toBe("แสดง 1–25 จาก 248 ราย");
    expect(formatRange(10, 25, 248)).toBe("แสดง 226–248 จาก 248 ราย");
  });
  it("ว่าง", () => expect(formatRange(1, 25, 0)).toBe("ไม่พบผู้ป่วย"));
});

describe("periodLabel", () => {
  it("ชื่อช่วงเวลา", () => expect(periodLabel("AFTER_DINNER")).toBe("หลังอาหารเย็น"));
});

describe("formatThaiRange", () => {
  it("เดือนเดียวกันรวบเป็นช่วง", () => expect(formatThaiRange("2026-10-08", "2026-10-14")).toBe("8–14 ต.ค. 2569"));
  it("ข้ามเดือนเขียนเต็ม", () => expect(formatThaiRange("2026-09-28", "2026-10-04")).toBe("28 ก.ย. 2569 – 4 ต.ค. 2569"));
});

describe("formatAgo", () => {
  it("แปลงอายุข้อมูล", () => {
    expect(formatAgo(0)).toBe("วันนี้");
    expect(formatAgo(1)).toBe("1 วันที่แล้ว");
    expect(formatAgo(null)).toBe("");
  });
});
