import { describe, expect, it } from "vitest";
import { computeCurrentRisk } from "@/lib/risk/current-risk";
import { glucose, TEST_RULES } from "@/lib/risk/fixtures";
import { buildAssessmentDetail, parseAssessmentDetail, pickHeadline } from "./assessment-store";

const day = "2026-10-14";
const readings = [
  glucose({ measuredDate: day, period: "BEFORE_BREAKFAST", valueMgDl: 132 }),
  glucose({ measuredDate: day, period: "AFTER_DINNER", valueMgDl: 452 }),
  glucose({ measuredDate: day, period: "AFTER_BREAKFAST", valueMgDl: 168 }),
];

describe("pickHeadline", () => {
  it("เลือกค่าที่แย่ที่สุดของวัน", () => {
    const h = pickHeadline(readings, TEST_RULES);
    expect(h).toMatchObject({ valueMgDl: 452, period: "AFTER_DINNER", measuredDate: day });
  });
  it("เครื่องขึ้น LO/HI ถือว่าแย่ที่สุด", () => {
    const h = pickHeadline([...readings, glucose({ measuredDate: day, period: "BEFORE_DINNER", valueMgDl: null, meterFlag: "METER_HIGH" })], TEST_RULES);
    expect(h).toMatchObject({ meterFlag: "METER_HIGH", valueMgDl: null, period: "BEFORE_DINNER" });
  });
  it("ไม่มีค่าที่ประเมินได้ -> null", () => {
    expect(pickHeadline([], TEST_RULES)).toBeNull();
    expect(pickHeadline([glucose({ valueMgDl: 500, isVoided: true })], TEST_RULES)).toBeNull();
  });
});

describe("buildAssessmentDetail / parseAssessmentDetail", () => {
  const current = computeCurrentRisk({ glucoseReadings: readings, bloodPressures: [], rules: TEST_RULES, today: "2026-10-15" });

  it("เก็บวันที่ เหตุผล ค่าที่ใช้ตัดสิน และเวอร์ชันเกณฑ์", () => {
    const d = buildAssessmentDetail(current, readings, TEST_RULES, 7);
    expect(d.v).toBe(1);
    expect(d.glucoseDate).toBe(day);
    expect(d.ruleVersion).toBe(7);
    expect(d.headline?.valueMgDl).toBe(452);
    expect(d.reasons.length).toBeGreaterThan(0);
  });

  it("แปลงเป็น JSON แล้วอ่านกลับได้เหมือนเดิม", () => {
    const d = buildAssessmentDetail(current, readings, TEST_RULES, 7);
    expect(parseAssessmentDetail(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it("รูปแบบที่ไม่ตรงหรือไม่ใช่ออบเจ็กต์ -> null (ไม่พัง)", () => {
    expect(parseAssessmentDetail(null)).toBeNull();
    expect(parseAssessmentDetail("x")).toBeNull();
    expect(parseAssessmentDetail({ v: 2, reasons: [] })).toBeNull();
    expect(parseAssessmentDetail({ v: 1, reasons: "no" })).toBeNull();
    expect(parseAssessmentDetail({ v: 1, reasons: [] })?.headline).toBeNull();
  });
});
