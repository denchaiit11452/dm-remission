import { describe, expect, it } from "vitest";
import { buildPatientQueryString, hasActiveFilters, parsePatientQuery } from "./patient-query";

describe("parsePatientQuery", () => {
  it("ค่าเริ่มต้นเมื่อไม่มีพารามิเตอร์", () => {
    expect(parsePatientQuery({})).toEqual({ q: "", level: null, status: null, staleOnly: false, page: 1, pageSize: 25 });
  });
  it("อ่านค่าที่ถูกต้อง", () => {
    const q = parsePatientQuery({ q: " 6700 ", level: "CRITICAL", status: "REMISSION", stale: "1", page: "3", size: "50" });
    expect(q).toEqual({ q: "6700", level: "CRITICAL", status: "REMISSION", staleOnly: true, page: 3, pageSize: 50 });
  });
  it("ยอมรับ level=NONE (ยังไม่มีข้อมูล)", () => {
    expect(parsePatientQuery({ level: "NONE" }).level).toBe("NONE");
  });
  it("ค่าที่ไม่รู้จักหรือผิดรูปแบบถูกทิ้ง ไม่ทำให้หน้าล้ม", () => {
    const q = parsePatientQuery({ level: "SUPER", status: "x", stale: "yes", page: "-2", size: "99999" });
    expect(q).toEqual({ q: "", level: null, status: null, staleOnly: false, page: 1, pageSize: 100 });
    expect(parsePatientQuery({ page: "abc", size: "1.5" })).toMatchObject({ page: 1, pageSize: 25 });
  });
  it("ใช้ค่าแรกเมื่อพารามิเตอร์ซ้ำ", () => {
    expect(parsePatientQuery({ level: ["HIGH", "WATCH"] }).level).toBe("HIGH");
  });
});

describe("buildPatientQueryString", () => {
  it("ไม่ใส่ค่าเริ่มต้น", () => {
    expect(buildPatientQueryString({ q: "", page: 1, pageSize: 25 })).toBe("");
  });
  it("ใส่เฉพาะที่มีค่า", () => {
    expect(buildPatientQueryString({ q: "สมชาย", level: "HIGH", staleOnly: true, page: 2, pageSize: 50 })).toBe(
      "?q=%E0%B8%AA%E0%B8%A1%E0%B8%8A%E0%B8%B2%E0%B8%A2&level=HIGH&stale=1&size=50&page=2",
    );
  });
  it("อ่านกลับได้เท่าเดิม", () => {
    const original = parsePatientQuery({ q: "ab", level: "WATCH", status: "IN_PROGRAM", stale: "1", page: "4" });
    const again = parsePatientQuery(Object.fromEntries(new URLSearchParams(buildPatientQueryString(original))));
    expect(again).toEqual(original);
  });
});

describe("hasActiveFilters", () => {
  it("ไม่มีตัวกรอง", () => expect(hasActiveFilters(parsePatientQuery({ page: "2" }))).toBe(false));
  it("มีตัวกรอง", () => expect(hasActiveFilters(parsePatientQuery({ stale: "1" }))).toBe(true));
});
