import { describe, expect, it } from "vitest";
import { TEST_RULES } from "./risk/fixtures";
import { buildSavePayload, checkEntry, formatTimeInput, newEntry, previewAlerts, summarizeForm, type FormEntry } from "./glucose-form";
import { previewSave } from "./glucose-preview";
import type { GlucoseReadingInput, RiskRules } from "./risk/types";

const rules: RiskRules = { ...TEST_RULES, goodMin: 80, goodMax: 140, watchAbove: 200, highAbove: 300, criticalGlucoseAbove: 400, watchBelow: 70, highBelow: 60, criticalGlucoseBelow: 50, alertOnHighRisk: false };
const D = "2026-10-15";
const e = (o: Partial<FormEntry> = {}): FormEntry => ({ ...newEntry("BEFORE_BREAKFAST", "k1"), ...o });

describe("checkEntry", () => {
  it("ช่องว่าง = ยังไม่กรอก ไม่ error", () => {
    expect(checkEntry(e(), rules, D)).toMatchObject({ filled: false, error: null });
  });
  it("ตัวเลขปกติ ประเมินระดับ", () => {
    const c = checkEntry(e({ value: "132" }), rules, D);
    expect(c).toMatchObject({ filled: true, error: null, valueMgDl: 132 });
    expect(c.assessment?.level).toBe("WELL_CONTROLLED");
    expect(checkEntry(e({ value: "452" }), rules, D).assessment?.level).toBe("CRITICAL");
  });
  it("ค่าไม่ใช่จำนวนเต็ม/นอกช่วงกันพิมพ์ผิด", () => {
    expect(checkEntry(e({ value: "13.2" }), rules, D).error).toMatch(/จำนวนเต็ม/);
    expect(checkEntry(e({ value: "abc" }), rules, D).error).toMatch(/จำนวนเต็ม/);
    expect(checkEntry(e({ value: "5" }), rules, D).error).toMatch(/ไม่ต่ำกว่า 10/);
    expect(checkEntry(e({ value: "85000" }), rules, D).error).toMatch(/ไม่เกิน 1000/);
  });
  it("LO/HI ไม่ต้องกรอกตัวเลข และเป็นวิกฤต (ตัวเลขที่พิมพ์ค้างไว้ถูกทิ้ง)", () => {
    const c = checkEntry(e({ mode: "HI", value: "999" }), rules, D);
    expect(c).toMatchObject({ filled: true, error: null, valueMgDl: null, meterFlag: "METER_HIGH" });
    expect(c.assessment?.level).toBe("CRITICAL");
    expect(checkEntry(e({ mode: "LO" }), rules, D).meterFlag).toBe("METER_LOW");
  });
  it("เวลา: ว่างได้ ผิดรูปแบบเป็น error", () => {
    expect(checkEntry(e({ value: "100", time: "07:30" }), rules, D).measuredTime).toBe("07:30");
    expect(checkEntry(e({ value: "100", time: "" }), rules, D).measuredTime).toBeNull();
    const bad = checkEntry(e({ value: "100", time: "7.30" }), rules, D);
    expect(bad.timeError).toBeTruthy();
    expect(bad.measuredTime).toBeNull();
  });
});

describe("summarizeForm / buildSavePayload", () => {
  const entries = [e({ key: "a", value: "132" }), e({ key: "b", period: "AFTER_BREAKFAST", value: "452", time: "07:30" }), e({ key: "c", period: "BEFORE_DINNER" })];
  it("นับเฉพาะช่องที่มีค่า และจับค่าวิกฤต", () => {
    const s = summarizeForm(entries, rules, D);
    expect(s).toMatchObject({ filledCount: 2, criticalCount: 1, hasErrors: false, canSave: true, worstLevel: "CRITICAL" });
  });
  it("ยังไม่กรอกอะไรเลย = บันทึกไม่ได้", () => {
    expect(summarizeForm([e()], rules, D).canSave).toBe(false);
  });
  it("มีช่องผิดพลาด = บันทึกไม่ได้ แม้ช่องอื่นถูก", () => {
    expect(summarizeForm([e({ value: "100" }), e({ key: "z", value: "x" })], rules, D).canSave).toBe(false);
  });
  it("payload ตรงกับสคีมาที่บันทึก (หมายเหตุว่าง = null)", () => {
    const s = summarizeForm(entries, rules, D);
    const p = buildSavePayload("pid", D, s, "  ");
    expect(p.entries).toEqual([
      { period: "BEFORE_BREAKFAST", valueMgDl: 132, meterFlag: "NONE", measuredTime: null, note: null },
      { period: "AFTER_BREAKFAST", valueMgDl: 452, meterFlag: "NONE", measuredTime: "07:30", note: null },
    ]);
    expect(buildSavePayload("pid", D, s, " วัดซ้ำ ").entries[0].note).toBe("วัดซ้ำ");
  });
});

describe("previewAlerts", () => {
  it("ค่าวิกฤตสร้าง Alert และบอกจำนวนวันย้อนหลัง", () => {
    const s = summarizeForm([e({ value: "452" }), e({ key: "k2", value: "100" })], rules, "2026-10-13");
    const a = previewAlerts(s, rules, "2026-10-13", D);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ type: "CRITICAL_GLUCOSE_HIGH", level: "CRITICAL", backdatedDays: 2 });
  });
  it("ความเสี่ยงสูงสร้าง Alert เมื่อเปิด alertOnHighRisk เท่านั้น", () => {
    const s = summarizeForm([e({ value: "320" })], rules, D);
    expect(previewAlerts(s, rules, D, D)).toHaveLength(0);
    expect(previewAlerts(s, { ...rules, alertOnHighRisk: true }, D, D)).toHaveLength(1);
  });
});

describe("previewSave", () => {
  const old = (o: Partial<GlucoseReadingInput>): GlucoseReadingInput => ({ id: "x", measuredDate: "2026-10-14", period: "AFTER_DINNER", valueMgDl: 452, meterFlag: "NONE", isVoided: false, ...o });
  const base = { bloodPressures: [], rules, today: D };

  it("เพิ่มค่าวันใหม่ที่ดี: ระดับปัจจุบันเปลี่ยนตามวันล่าสุด (ไม่ใช่ค่าที่แย่ในอดีต)", () => {
    const p = previewSave({ ...base, existing: [old({})], proposed: [{ period: "BEFORE_BREAKFAST", valueMgDl: 100, meterFlag: "NONE" }], measuredDate: D });
    expect(p).toEqual({ levelBefore: "CRITICAL", levelAfter: "WELL_CONTROLLED", worstOfDay: "WELL_CONTROLLED" });
  });
  it("กรอกย้อนหลังไม่ดึงระดับกลับไปเป็นของวันเก่า", () => {
    const p = previewSave({ ...base, existing: [old({ measuredDate: D, valueMgDl: 100, id: "n" })], proposed: [{ period: "AFTER_DINNER", valueMgDl: 452, meterFlag: "NONE" }], measuredDate: "2026-10-10" });
    expect(p.levelBefore).toBe("WELL_CONTROLLED");
    expect(p.levelAfter).toBe("WELL_CONTROLLED");
    expect(p.worstOfDay).toBe("CRITICAL");
  });
  it("ค่าที่แย่ที่สุดของวันรวมค่าเดิมในวันนั้นด้วย", () => {
    const p = previewSave({ ...base, existing: [old({ measuredDate: D, valueMgDl: 450 })], proposed: [{ period: "BEFORE_BREAKFAST", valueMgDl: 100, meterFlag: "NONE" }], measuredDate: D });
    expect(p.worstOfDay).toBe("CRITICAL");
    expect(p.levelAfter).toBe("CRITICAL");
  });
  it("ผู้ป่วยใหม่ยังไม่มีข้อมูล: levelBefore = null", () => {
    const p = previewSave({ ...base, existing: [], proposed: [{ period: "BEFORE_BREAKFAST", valueMgDl: null, meterFlag: "METER_LOW" }], measuredDate: D });
    expect(p).toEqual({ levelBefore: null, levelAfter: "CRITICAL", worstOfDay: "CRITICAL" });
  });
});

describe("formatTimeInput", () => {
  it("พิมพ์ 4 หลักแล้วใส่ : ให้เอง", () => {
    expect(formatTimeInput("0730")).toBe("07:30");
    expect(formatTimeInput("1945")).toBe("19:45");
  });
  it("ระหว่างพิมพ์ทีละตัว", () => {
    expect(["0", "07", "073", "0730"].map(formatTimeInput)).toEqual(["0", "07", "07:3", "07:30"]);
  });
  it("ชั่วโมงหลักเดียว: 730 -> 07:30", () => {
    expect(formatTimeInput("730")).toBe("07:30");
    expect(formatTimeInput("73")).toBe("73");
    expect(formatTimeInput("173")).toBe("17:3");
  });
  it("ลบถอยหลังแล้ว : ไม่ค้าง", () => {
    expect(formatTimeInput("07:")).toBe("07");
    expect(formatTimeInput("07:3")).toBe("07:3");
    expect(formatTimeInput("")).toBe("");
  });
  it("วางข้อความที่มีตัวคั่นอื่น/ตัวอักษร และตัดเกิน 4 หลัก", () => {
    expect(formatTimeInput("7.30")).toBe("07:30");
    expect(formatTimeInput("07:30")).toBe("07:30");
    expect(formatTimeInput("เวลา 0730 น.")).toBe("07:30");
    expect(formatTimeInput("073099")).toBe("07:30");
  });
  it("ผลลัพธ์ผ่านการตรวจเวลาของฟอร์มเมื่อครบ 4 หลักที่ถูกต้อง", () => {
    const entry = { ...newEntry("BEFORE_BREAKFAST", "k"), value: "100", time: formatTimeInput("0730") };
    expect(checkEntry(entry, rules, D)).toMatchObject({ measuredTime: "07:30", timeError: null });
    const bad = { ...entry, time: formatTimeInput("2575") };
    expect(checkEntry(bad, rules, D).timeError).toBeTruthy();
  });
});
