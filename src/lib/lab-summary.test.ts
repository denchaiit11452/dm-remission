import { describe, expect, it } from "vitest";
import { buildLabSeries, changeBetween, compareLabEntries, latestUpTo } from "./lab-summary";
import type { LabFormValues } from "./record-forms";
import { DEFAULT_RISK_RULES } from "./risk/rules";

let n = 0;
const row = (recordedDate: string, patch: Partial<Parameters<typeof buildLabSeries>[0][number]> = {}) => ({
  id: `l${++n}`, recordedDate, hba1c: null, fbs: null, weightKg: null, heightCm: null, bmi: null, sbp: null, dbp: null, voided: null,
  ...patch,
});
const series = (rows: Parameters<typeof buildLabSeries>[0]) => buildLabSeries(rows, DEFAULT_RISK_RULES);
const EMPTY: LabFormValues = { recordedDate: "2026-10-15", hba1c: "", fbs: "", weightKg: "", heightCm: "", sbp: "", dbp: "", note: "" };

describe("buildLabSeries", () => {
  it("เรียงจากเก่าไปใหม่ และข้ามค่าว่าง", () => {
    const s = series([row("2026-09-01", { hba1c: 5.8 }), row("2026-08-01", { fbs: 110 }), row("2026-06-01", { hba1c: 6.4 })]);
    expect(s.hba1c).toEqual([{ date: "2026-06-01", value: 6.4 }, { date: "2026-09-01", value: 5.8 }]);
    expect(s.fbs).toEqual([{ date: "2026-08-01", value: 110 }]);
  });
  it("ไม่นับรายการที่ยกเลิก", () => {
    const s = series([row("2026-09-01", { hba1c: 5.8, voided: { at: "x" } }), row("2026-06-01", { hba1c: 6.4 })]);
    expect(s.hba1c).toEqual([{ date: "2026-06-01", value: 6.4 }]);
  });
  it("HbA1c วันเดียวกันใช้ค่าสูงสุด น้ำหนักใช้ค่าที่กรอกล่าสุด", () => {
    const s = series([row("2026-09-01", { hba1c: 5.8, weightKg: 70 }), row("2026-09-01", { hba1c: 6.8, weightKg: 75 })]);
    expect(s.hba1c).toEqual([{ date: "2026-09-01", value: 6.8 }]);
    expect(s.weightKg).toEqual([{ date: "2026-09-01", value: 70 }]);
  });
  it("ความดันวันเดียวกัน ค่าวิกฤตไม่ถูกบังด้วยค่าที่กรอกทีหลัง", () => {
    const s = series([row("2026-09-01", { sbp: 120, dbp: 80 }), row("2026-09-01", { sbp: 190, dbp: 100 })]);
    expect(s.bloodPressure).toEqual([{ date: "2026-09-01", sbp: 190, dbp: 100, critical: true }]);
  });
});

describe("changeBetween", () => {
  it("คำนวณทิศทางโดยไม่มีเศษทศนิยมเพี้ยน", () => {
    expect(changeBetween(6.1, 5.8)).toEqual({ direction: "up", amount: 0.3, label: undefined });
    expect(changeBetween(5.8, 6.1).direction).toBe("down");
    expect(changeBetween(6, 6)).toMatchObject({ direction: "same", amount: 0 });
  });
});

describe("latestUpTo", () => {
  const points = [{ date: "2026-06-01" }, { date: "2026-09-01" }];
  it("กรอกย้อนหลังเทียบกับผลก่อนวันนั้น", () => {
    expect(latestUpTo(points, "2026-07-01")?.date).toBe("2026-06-01");
    expect(latestUpTo(points, "2026-10-01")?.date).toBe("2026-09-01");
    expect(latestUpTo(points, "2026-05-01")).toBeNull();
  });
});

describe("compareLabEntries", () => {
  const s = series([row("2026-09-01", { hba1c: 5.8, sbp: 130, dbp: 85, weightKg: 70, heightCm: 170, bmi: 24.2 })]);

  it("แสดงเฉพาะรายการที่กรอก พร้อมการเปลี่ยนจากผลก่อนหน้า", () => {
    const r = compareLabEntries({ ...EMPTY, hba1c: "6.1", sbp: "120", dbp: "90" }, s, DEFAULT_RISK_RULES);
    expect(r.map((c) => c.key)).toEqual(["hba1c", "bloodPressure"]);
    expect(r[0]).toMatchObject({ valueText: "6.1%", previous: { text: "5.8%", date: "2026-09-01" } });
    expect(r[0].changes[0]).toMatchObject({ direction: "up", amount: 0.3 });
    expect(r[1].changes).toEqual([
      { direction: "down", amount: 10, label: "ตัวบน" },
      { direction: "up", amount: 5, label: "ตัวล่าง" },
    ]);
  });
  it("ไม่มีผลก่อนหน้า = ไม่แสดงการเปลี่ยนแปลง", () => {
    const r = compareLabEntries({ ...EMPTY, fbs: "110" }, s, DEFAULT_RISK_RULES);
    expect(r[0].previous).toBeNull();
    expect(r[0].changes).toEqual([]);
  });
  it("ค่าที่ใช้ไม่ได้ถูกแจ้ง ไม่ทิ้งเงียบ ๆ", () => {
    expect(compareLabEntries({ ...EMPTY, hba1c: "abc" }, s, DEFAULT_RISK_RULES)[0].valueText).toBeNull();
    expect(compareLabEntries({ ...EMPTY, sbp: "abc", dbp: "80" }, s, DEFAULT_RISK_RULES)[0].pending).toBeUndefined();
  });
  it("กรอกความดันไม่ครบเป็นสถานะรอ ไม่ใช่ความผิดพลาด", () => {
    expect(compareLabEntries({ ...EMPTY, sbp: "120" }, s, DEFAULT_RISK_RULES)[0]).toMatchObject({ valueText: null, pending: "รอกรอกตัวล่าง" });
    expect(compareLabEntries({ ...EMPTY, dbp: "80" }, s, DEFAULT_RISK_RULES)[0]).toMatchObject({ valueText: null, pending: "รอกรอกตัวบน" });
  });
  it("ความดันถึงเกณฑ์ถูกระบุว่าวิกฤต", () => {
    expect(compareLabEntries({ ...EMPTY, sbp: "190", dbp: "100" }, s, DEFAULT_RISK_RULES)[0].critical).toBe(true);
    expect(compareLabEntries({ ...EMPTY, sbp: "120", dbp: "80" }, s, DEFAULT_RISK_RULES)[0].critical).toBe(false);
  });
  it("คำนวณ BMI เมื่อมีน้ำหนักและส่วนสูง", () => {
    const r = compareLabEntries({ ...EMPTY, weightKg: "72", heightCm: "170" }, s, DEFAULT_RISK_RULES);
    expect(r.map((c) => c.key)).toEqual(["weightKg", "heightCm", "bmi"]);
    expect(r[2].valueText).toBe("24.9");
  });
});
