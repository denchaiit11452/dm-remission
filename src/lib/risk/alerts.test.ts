import { describe, expect, it } from "vitest";
import { decideBloodPressureAlert, decideGlucoseAlert } from "./alerts";
import { bp, glucose, TEST_RULES } from "./fixtures";

const RECORDED_ON = "2026-10-12";

describe("decideGlucoseAlert", () => {
  it("น้ำตาลสูงวิกฤต -> Alert CRITICAL_GLUCOSE_HIGH", () => {
    const reading = glucose({ valueMgDl: 450, measuredDate: "2026-10-12" });
    const d = decideGlucoseAlert(reading, TEST_RULES, RECORDED_ON);
    expect(d).toMatchObject({
      type: "CRITICAL_GLUCOSE_HIGH",
      level: "CRITICAL",
      glucoseReadingId: reading.id,
      labRecordId: null,
      isBackdated: false,
      backdatedDays: 0,
    });
    expect(d?.dedupeKey).toBe(`CRITICAL_GLUCOSE_HIGH:${reading.id}`);
  });

  it("น้ำตาลต่ำวิกฤต -> Alert CRITICAL_GLUCOSE_LOW", () => {
    expect(decideGlucoseAlert(glucose({ valueMgDl: 40 }), TEST_RULES, RECORDED_ON)?.type).toBe("CRITICAL_GLUCOSE_LOW");
  });

  it("เครื่องขึ้น LO / HI -> Alert", () => {
    expect(
      decideGlucoseAlert(glucose({ valueMgDl: null, meterFlag: "METER_LOW" }), TEST_RULES, RECORDED_ON)?.type,
    ).toBe("CRITICAL_GLUCOSE_LOW");
    expect(
      decideGlucoseAlert(glucose({ valueMgDl: null, meterFlag: "METER_HIGH" }), TEST_RULES, RECORDED_ON)?.type,
    ).toBe("CRITICAL_GLUCOSE_HIGH");
  });

  it("ระดับต่ำกว่าวิกฤตไม่สร้าง Alert", () => {
    for (const value of [100, 150, 250]) {
      expect(decideGlucoseAlert(glucose({ valueMgDl: value }), TEST_RULES, RECORDED_ON)).toBeNull();
    }
  });

  it("ความเสี่ยงสูง: ไม่สร้าง Alert เมื่อปิดตัวเลือก (ค่าเริ่มต้น)", () => {
    expect(decideGlucoseAlert(glucose({ valueMgDl: 350 }), TEST_RULES, RECORDED_ON)).toBeNull();
  });

  it("ความเสี่ยงสูง: สร้าง HIGH_RISK เมื่อเปิดตัวเลือก", () => {
    const rules = { ...TEST_RULES, alertOnHighRisk: true };
    const d = decideGlucoseAlert(glucose({ valueMgDl: 350 }), rules, RECORDED_ON);
    expect(d).toMatchObject({ type: "HIGH_RISK", level: "HIGH" });
  });

  it("ค่าย้อนหลังยังสร้าง Alert และระบุจำนวนวันที่ย้อน", () => {
    const d = decideGlucoseAlert(glucose({ valueMgDl: 450, measuredDate: "2026-10-09" }), TEST_RULES, RECORDED_ON);
    expect(d).toMatchObject({ isBackdated: true, backdatedDays: 3, eventDate: "2026-10-09" });
  });

  it("รายการที่ยกเลิกไม่สร้าง Alert", () => {
    expect(decideGlucoseAlert(glucose({ valueMgDl: 450, isVoided: true }), TEST_RULES, RECORDED_ON)).toBeNull();
  });

  it("dedupeKey ต่างกันตามรายการ แม้ค่าและวันเหมือนกัน", () => {
    const a = decideGlucoseAlert(glucose({ valueMgDl: 450 }), TEST_RULES, RECORDED_ON);
    const b = decideGlucoseAlert(glucose({ valueMgDl: 450 }), TEST_RULES, RECORDED_ON);
    expect(a?.dedupeKey).not.toBe(b?.dedupeKey);
  });
});

describe("decideBloodPressureAlert", () => {
  it("ความดันวิกฤต -> Alert CRITICAL_BP ผูกกับ lab record", () => {
    const record = bp({ sbp: 185, dbp: 100, recordedDate: "2026-10-12" });
    const d = decideBloodPressureAlert(record, TEST_RULES, RECORDED_ON);
    expect(d).toMatchObject({ type: "CRITICAL_BP", labRecordId: record.id, glucoseReadingId: null });
    expect(d?.dedupeKey).toBe(`CRITICAL_BP:${record.id}`);
  });

  it("ความดันไม่วิกฤตไม่สร้าง Alert", () => {
    expect(decideBloodPressureAlert(bp({ sbp: 179, dbp: 119 }), TEST_RULES, RECORDED_ON)).toBeNull();
  });

  it("รายการที่ยกเลิกไม่สร้าง Alert", () => {
    expect(decideBloodPressureAlert(bp({ sbp: 200, dbp: 130, isVoided: true }), TEST_RULES, RECORDED_ON)).toBeNull();
  });
});
