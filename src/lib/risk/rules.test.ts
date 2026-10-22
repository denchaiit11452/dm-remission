import { describe, expect, it } from "vitest";
import { TEST_RULES } from "./fixtures";
import { DEFAULT_RISK_RULES, findMissingThresholds, validateRiskRules } from "./rules";

describe("findMissingThresholds", () => {
  it("เกณฑ์เริ่มต้นยังไม่มีตัวเลขของแพทย์ทั้ง 6 ตัว", () => {
    expect(findMissingThresholds(DEFAULT_RISK_RULES)).toHaveLength(6);
  });
  it("กรอกครบแล้วไม่เหลือ", () => {
    expect(findMissingThresholds(TEST_RULES)).toEqual([]);
  });
  it("กรอกบางส่วน แสดงเฉพาะที่ยังขาด", () => {
    const rules = { ...DEFAULT_RISK_RULES, criticalGlucoseAbove: 400 };
    expect(findMissingThresholds(rules)).not.toContain("criticalGlucoseAbove");
    expect(findMissingThresholds(rules)).toHaveLength(5);
  });
});

describe("validateRiskRules", () => {
  it("เกณฑ์เริ่มต้นและเกณฑ์ทดสอบผ่าน", () => {
    expect(validateRiskRules(DEFAULT_RISK_RULES)).toEqual([]);
    expect(validateRiskRules(TEST_RULES)).toEqual([]);
  });
  it("จับกรณีเกณฑ์ฝั่งสูงเรียงสลับ", () => {
    const bad = { ...TEST_RULES, highAbove: 150, watchAbove: 200 };
    expect(validateRiskRules(bad).length).toBeGreaterThan(0);
  });
  it("จับกรณีเกณฑ์ฝั่งต่ำเรียงสลับ", () => {
    const bad = { ...TEST_RULES, criticalGlucoseBelow: 65, highBelow: 60 };
    expect(validateRiskRules(bad).length).toBeGreaterThan(0);
  });
  it("จับกรณีเกณฑ์วิกฤตทับช่วงควบคุมได้ดี", () => {
    const bad = { ...TEST_RULES, watchAbove: 130 };
    expect(validateRiskRules(bad).length).toBeGreaterThan(0);
  });
  it("ข้ามเกณฑ์ที่ยังไม่กำหนดเมื่อตรวจลำดับ", () => {
    expect(validateRiskRules({ ...DEFAULT_RISK_RULES, criticalGlucoseAbove: 400 })).toEqual([]);
  });
});
