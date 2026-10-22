import { describe, expect, it } from "vitest";
import { glucose, TEST_RULES } from "./fixtures";
import { classifyGlucose } from "./glucose";
import { DEFAULT_RISK_RULES } from "./rules";
import type { RiskLevel } from "./types";

describe("classifyGlucose: ขอบเขตของแต่ละระดับ (เกณฑ์ทดสอบ)", () => {
  // [ค่าน้ำตาล, ระดับที่ควรได้]
  const cases: Array<[number, RiskLevel]> = [
    // ควบคุมได้ดี 80-140 รวมขอบ
    [80, "WELL_CONTROLLED"],
    [110, "WELL_CONTROLLED"],
    [140, "WELL_CONTROLLED"],
    // ยังคุมไม่ได้
    [79, "UNCONTROLLED"],
    [141, "UNCONTROLLED"],
    [70, "UNCONTROLLED"], // เท่ากับเกณฑ์เฝ้าระวัง ยังไม่ถึง (เกณฑ์เคร่งครัด)
    [200, "UNCONTROLLED"],
    // เฝ้าระวัง
    [69, "WATCH"],
    [201, "WATCH"],
    [60, "WATCH"],
    [300, "WATCH"],
    // ความเสี่ยงสูง
    [59, "HIGH"],
    [301, "HIGH"],
    [50, "HIGH"],
    [400, "HIGH"],
    // วิกฤต
    [49, "CRITICAL"],
    [401, "CRITICAL"],
    [10, "CRITICAL"],
    [600, "CRITICAL"],
  ];

  it.each(cases)("ค่า %i mg/dL -> %s", (value, expected) => {
    expect(classifyGlucose(glucose({ valueMgDl: value }), TEST_RULES)?.level).toBe(expected);
  });

  it("บอกทิศทางต่ำ/สูงถูกต้อง", () => {
    expect(classifyGlucose(glucose({ valueMgDl: 79 }), TEST_RULES)?.direction).toBe("LOW");
    expect(classifyGlucose(glucose({ valueMgDl: 141 }), TEST_RULES)?.direction).toBe("HIGH");
    expect(classifyGlucose(glucose({ valueMgDl: 100 }), TEST_RULES)?.direction).toBeNull();
  });

  it("ข้อความระบุช่วงเวลาอาหารและค่า", () => {
    const a = classifyGlucose(glucose({ valueMgDl: 450, period: "AFTER_DINNER" }), TEST_RULES);
    expect(a?.message).toContain("หลังอาหารเย็น");
    expect(a?.message).toContain("450");
  });

  it("ใช้เกณฑ์เดียวกันทุกช่วงเวลาอาหาร", () => {
    for (const period of ["BEFORE_BREAKFAST", "AFTER_BREAKFAST", "BEFORE_DINNER", "AFTER_DINNER"] as const) {
      expect(classifyGlucose(glucose({ valueMgDl: 141, period }), TEST_RULES)?.level).toBe("UNCONTROLLED");
    }
  });
});

describe("classifyGlucose: เครื่อง DTX ขึ้น LO / HI", () => {
  it("LO = วิกฤต ทิศทางต่ำ", () => {
    const a = classifyGlucose(glucose({ valueMgDl: null, meterFlag: "METER_LOW" }), TEST_RULES);
    expect(a).toMatchObject({ level: "CRITICAL", direction: "LOW" });
  });
  it("HI = วิกฤต ทิศทางสูง", () => {
    const a = classifyGlucose(glucose({ valueMgDl: null, meterFlag: "METER_HIGH" }), TEST_RULES);
    expect(a).toMatchObject({ level: "CRITICAL", direction: "HIGH" });
  });
  it("LO/HI เป็นวิกฤตแม้แพทย์ยังไม่กำหนดเกณฑ์น้ำตาล", () => {
    const a = classifyGlucose(glucose({ valueMgDl: null, meterFlag: "METER_HIGH" }), DEFAULT_RISK_RULES);
    expect(a?.level).toBe("CRITICAL");
  });
});

describe("classifyGlucose: ประเมินไม่ได้", () => {
  it("รายการที่ยกเลิกคืน null", () => {
    expect(classifyGlucose(glucose({ isVoided: true, valueMgDl: 500 }), TEST_RULES)).toBeNull();
  });
  it("ไม่มีค่าและเครื่องไม่ได้ขึ้น LO/HI คืน null", () => {
    expect(classifyGlucose(glucose({ valueMgDl: null }), TEST_RULES)).toBeNull();
  });
});

describe("classifyGlucose: เมื่อแพทย์ยังไม่กำหนดเกณฑ์", () => {
  it("ข้ามเกณฑ์ที่เป็น null และไม่พัง", () => {
    expect(classifyGlucose(glucose({ valueMgDl: 100 }), DEFAULT_RISK_RULES)?.level).toBe("WELL_CONTROLLED");
    expect(classifyGlucose(glucose({ valueMgDl: 141 }), DEFAULT_RISK_RULES)?.level).toBe("UNCONTROLLED");
  });
  it("น้ำตาลสูง/ต่ำมากยังไม่ถูกจัดเป็นวิกฤต (จึงต้องให้แพทย์กรอกเกณฑ์ก่อนใช้จริง)", () => {
    expect(classifyGlucose(glucose({ valueMgDl: 600 }), DEFAULT_RISK_RULES)?.level).toBe("UNCONTROLLED");
    expect(classifyGlucose(glucose({ valueMgDl: 20 }), DEFAULT_RISK_RULES)?.level).toBe("UNCONTROLLED");
  });
  it("กรอกเกณฑ์เพียงบางส่วน ใช้เฉพาะส่วนที่กรอก", () => {
    const rules = { ...DEFAULT_RISK_RULES, criticalGlucoseAbove: 400 };
    expect(classifyGlucose(glucose({ valueMgDl: 401 }), rules)?.level).toBe("CRITICAL");
    expect(classifyGlucose(glucose({ valueMgDl: 399 }), rules)?.level).toBe("UNCONTROLLED");
  });
});
