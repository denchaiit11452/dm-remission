import { describe, expect, it } from "vitest";
import { ageInYears, computeBmi, fullName, glucoseFreshness } from "./view";

describe("fullName", () => {
  it("ต่อคำนำหน้า ชื่อ นามสกุล ข้ามค่าว่าง", () => {
    expect(fullName({ firstName: "สมชาย", lastName: "ตัวอย่างหนึ่ง" })).toBe("สมชาย ตัวอย่างหนึ่ง");
    expect(fullName({ prefix: "นาย", firstName: "สมชาย", lastName: "ตัวอย่างหนึ่ง" })).toBe("นาย สมชาย ตัวอย่างหนึ่ง");
    expect(fullName({ prefix: " ", firstName: "ก", lastName: "ข" })).toBe("ก ข");
  });
});

describe("ageInYears", () => {
  it("นับอายุเต็มปี", () => {
    expect(ageInYears("1968-03-12", "2026-10-15")).toBe(58);
    expect(ageInYears("1968-10-16", "2026-10-15")).toBe(57); // ยังไม่ถึงวันเกิด
    expect(ageInYears("1968-10-15", "2026-10-15")).toBe(58); // วันเกิดพอดี
    expect(ageInYears("2028-02-29", "2029-02-28")).toBe(0);
  });
});

describe("glucoseFreshness", () => {
  it("เก่ากว่า staleDays ถึงถือว่าเก่า (เท่ากับไม่เก่า)", () => {
    expect(glucoseFreshness("2026-10-08", "2026-10-15", 7, true)).toEqual({ ageDays: 7, isStale: false });
    expect(glucoseFreshness("2026-10-06", "2026-10-15", 7, true)).toEqual({ ageDays: 9, isStale: true });
  });
  it("ไม่มีค่าน้ำตาล: เก่าก็ต่อเมื่อมีระดับจากข้อมูลอื่น", () => {
    expect(glucoseFreshness(null, "2026-10-15", 7, false)).toEqual({ ageDays: null, isStale: false });
    expect(glucoseFreshness(null, "2026-10-15", 7, true)).toEqual({ ageDays: null, isStale: true });
  });
});

describe("computeBmi", () => {
  it("คำนวณและปัดทศนิยม 1 ตำแหน่ง", () => {
    expect(computeBmi(82, 170)).toBe(28.4);
    expect(computeBmi(60, 160)).toBe(23.4);
  });
  it("ขาดน้ำหนักหรือส่วนสูง -> null", () => {
    expect(computeBmi(82, null)).toBeNull();
    expect(computeBmi(undefined, 170)).toBeNull();
  });
});
