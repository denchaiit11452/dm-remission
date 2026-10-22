import { describe, expect, it } from "vitest";
import { computeCurrentRisk } from "./current-risk";
import { bp, glucose, TEST_RULES } from "./fixtures";
import { DEFAULT_RISK_RULES } from "./rules";

const TODAY = "2026-10-12";
const base = { rules: TEST_RULES, today: TODAY };

describe("computeCurrentRisk: น้ำตาล", () => {
  it("ยังไม่มีข้อมูล -> level เป็น null และไม่ถือว่าข้อมูลเก่า", () => {
    const r = computeCurrentRisk({ ...base, glucoseReadings: [], bloodPressures: [] });
    expect(r.level).toBeNull();
    expect(r.isStale).toBe(false);
  });

  it("ใช้ค่าที่แย่ที่สุดของวันล่าสุด", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [
        glucose({ measuredDate: "2026-10-11", period: "BEFORE_BREAKFAST", valueMgDl: 100 }),
        glucose({ measuredDate: "2026-10-11", period: "AFTER_BREAKFAST", valueMgDl: 250 }),
        glucose({ measuredDate: "2026-10-11", period: "BEFORE_DINNER", valueMgDl: 150 }),
      ],
      bloodPressures: [],
    });
    expect(r.level).toBe("WATCH");
    expect(r.glucoseDate).toBe("2026-10-11");
  });

  it("วัดซ้ำช่วงเดียวกัน ค่าที่สองปกติ ยังนับค่าสูงตัวแรก", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [
        glucose({ measuredDate: "2026-10-11", period: "AFTER_DINNER", valueMgDl: 350 }),
        glucose({ measuredDate: "2026-10-11", period: "AFTER_DINNER", valueMgDl: 120 }),
      ],
      bloodPressures: [],
    });
    expect(r.level).toBe("HIGH");
  });

  it("ไม่นับค่าของวันก่อนหน้า แม้แย่กว่า", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [
        glucose({ measuredDate: "2026-10-10", valueMgDl: 450 }),
        glucose({ measuredDate: "2026-10-11", valueMgDl: 100 }),
      ],
      bloodPressures: [],
    });
    expect(r.level).toBe("WELL_CONTROLLED");
  });

  it("กรอกย้อนหลังของวันเก่า ไม่ดึงระดับปัจจุบันกลับ (ใช้วันที่วัด ไม่ใช่วันที่กรอก)", () => {
    const before = computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: 100 })],
      bloodPressures: [],
    });
    const after = computeCurrentRisk({
      ...base,
      glucoseReadings: [
        glucose({ measuredDate: "2026-10-11", valueMgDl: 100 }),
        glucose({ measuredDate: "2026-10-05", valueMgDl: 500 }), // เพิ่งกรอกค่าของสัปดาห์ก่อน
      ],
      bloodPressures: [],
    });
    expect(before.level).toBe("WELL_CONTROLLED");
    expect(after.level).toBe("WELL_CONTROLLED");
  });

  it("ข้ามรายการที่ยกเลิก", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [
        glucose({ measuredDate: "2026-10-11", valueMgDl: 500, isVoided: true }),
        glucose({ measuredDate: "2026-10-10", valueMgDl: 100 }),
      ],
      bloodPressures: [],
    });
    expect(r.glucoseDate).toBe("2026-10-10");
    expect(r.level).toBe("WELL_CONTROLLED");
  });

  it("LO/HI ทำให้วิกฤต", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: null, meterFlag: "METER_LOW" })],
      bloodPressures: [],
    });
    expect(r.level).toBe("CRITICAL");
  });

  it("ข้ามวันที่ในอนาคต (น่าจะกรอกผิด) และแจ้ง id", () => {
    const future = glucose({ measuredDate: "2027-10-11", valueMgDl: 500 });
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: 100 }), future],
      bloodPressures: [],
    });
    expect(r.level).toBe("WELL_CONTROLLED");
    expect(r.ignoredFutureDated).toEqual([future.id]);
  });
});

describe("computeCurrentRisk: ความดัน", () => {
  it("ความดันวิกฤตทำให้ระดับรวมเป็นวิกฤต แม้น้ำตาลปกติ", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: 100 })],
      bloodPressures: [bp({ recordedDate: "2026-10-09", sbp: 185, dbp: 100 })],
    });
    expect(r.level).toBe("CRITICAL");
    expect(r.reasons[0].metric).toBe("bloodPressure");
  });

  it("ใช้ความดันของวันที่ตรวจล่าสุด: ค่าเก่าที่วิกฤตแต่มีค่าใหม่ปกติแล้ว ไม่นับ", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: 100 })],
      bloodPressures: [
        bp({ recordedDate: "2026-09-01", sbp: 190, dbp: 100 }),
        bp({ recordedDate: "2026-10-01", sbp: 120, dbp: 80 }),
      ],
    });
    expect(r.level).toBe("WELL_CONTROLLED");
    expect(r.bloodPressureDate).toBe("2026-10-01");
  });

  it("ความดันที่ไม่วิกฤตไม่ทำให้ระดับสูงขึ้น", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: 100 })],
      bloodPressures: [bp({ recordedDate: "2026-10-11", sbp: 170, dbp: 110 })],
    });
    expect(r.level).toBe("WELL_CONTROLLED");
  });

  it("มีแต่ความดันวิกฤต ไม่มีค่าน้ำตาลเลย -> วิกฤตและถือว่าข้อมูลน้ำตาลเก่า", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [],
      bloodPressures: [bp({ recordedDate: "2026-10-11", sbp: 190, dbp: 100 })],
    });
    expect(r.level).toBe("CRITICAL");
    expect(r.isStale).toBe(true);
    expect(r.glucoseAgeDays).toBeNull();
  });
});

describe("computeCurrentRisk: ข้อมูลเก่า", () => {
  const withAge = (measuredDate: string) =>
    computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate, valueMgDl: 100 })],
      bloodPressures: [],
    });

  it("เก่าเท่ากับเกณฑ์ (7 วัน) ยังไม่ถือว่าเก่า", () => {
    const r = withAge("2026-10-05");
    expect(r.glucoseAgeDays).toBe(7);
    expect(r.isStale).toBe(false);
  });
  it("เก่ากว่าเกณฑ์ (8 วัน) ถือว่าเก่า แต่ยังแสดงระดับเดิม", () => {
    const r = withAge("2026-10-04");
    expect(r.isStale).toBe(true);
    expect(r.level).toBe("WELL_CONTROLLED");
  });
});

describe("computeCurrentRisk: เหตุผลและเกณฑ์ที่ขาด", () => {
  it("ค่าปกติทั้งหมดมีเหตุผลอธิบายว่าอยู่ในช่วงปกติ", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: 100 })],
      bloodPressures: [],
    });
    expect(r.reasons).toHaveLength(1);
    expect(r.reasons[0].code).toBe("GLUCOSE_WELL_CONTROLLED");
  });

  it("เหตุผลเรียงจากรุนแรงไปเบา", () => {
    const r = computeCurrentRisk({
      ...base,
      glucoseReadings: [
        glucose({ measuredDate: "2026-10-11", valueMgDl: 150 }),
        glucose({ measuredDate: "2026-10-11", valueMgDl: 450 }),
      ],
      bloodPressures: [],
    });
    expect(r.reasons.map((x) => x.level)).toEqual(["CRITICAL", "UNCONTROLLED"]);
  });

  it("แจ้งเกณฑ์ที่แพทย์ยังไม่กำหนด", () => {
    const r = computeCurrentRisk({
      rules: DEFAULT_RISK_RULES,
      today: TODAY,
      glucoseReadings: [glucose({ measuredDate: "2026-10-11", valueMgDl: 100 })],
      bloodPressures: [],
    });
    expect(r.missingThresholds).toHaveLength(6);
  });
});
