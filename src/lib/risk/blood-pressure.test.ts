import { describe, expect, it } from "vitest";
import { assessBloodPressure } from "./blood-pressure";
import { bp, TEST_RULES } from "./fixtures";

describe("assessBloodPressure (วิกฤตเมื่อ SBP >= 180 หรือ DBP >= 120)", () => {
  const cases: Array<[number | null, number | null, boolean]> = [
    [180, 119, true], // SBP ถึงเกณฑ์
    [179, 120, true], // DBP ถึงเกณฑ์
    [180, 120, true],
    [179, 119, false],
    [120, 80, false],
    [200, null, true], // มีเฉพาะ SBP
    [null, 130, true], // มีเฉพาะ DBP
    [170, null, false],
    [null, 100, false],
    [null, null, false],
  ];

  it.each(cases)("%s/%s -> วิกฤต=%s", (sbp, dbp, critical) => {
    expect(assessBloodPressure(bp({ sbp, dbp }), TEST_RULES) !== null).toBe(critical);
  });

  it("รายการที่ยกเลิกไม่นับ", () => {
    expect(assessBloodPressure(bp({ sbp: 220, dbp: 130, isVoided: true }), TEST_RULES)).toBeNull();
  });

  it("ข้อความแสดงค่าที่วัดได้", () => {
    expect(assessBloodPressure(bp({ sbp: 190, dbp: 100 }), TEST_RULES)?.message).toContain("190/100");
  });

  it("ปรับเกณฑ์จากตั้งค่าได้", () => {
    const rules = { ...TEST_RULES, criticalSbp: 160 };
    expect(assessBloodPressure(bp({ sbp: 160, dbp: 80 }), rules)).not.toBeNull();
  });
});
