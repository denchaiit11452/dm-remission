import { describe, expect, it } from "vitest";
import { buildRemissionTrack, graticule, hba1cScale, percentOn, toDms } from "./patient-overview";
import type { RemissionAssessment } from "./remission/remission";

const RULES = { remissionHba1cMax: 6.0, remissionMedFreeDays: 90, remissionHba1cMinDaysAfterStop: 7 };

function assessment(over: Partial<RemissionAssessment>): RemissionAssessment {
  return {
    status: "INSUFFICIENT_DATA",
    latestHba1c: null,
    onDiabetesMedication: false,
    medFreeDays: null,
    lastStopDate: null,
    hasDiabetesDrugHistory: false,
    reasons: [],
    ...over,
  };
}

describe("buildRemissionTrack", () => {
  it("นับวันหยุดยาและวันที่จะครบกำหนด", () => {
    const t = buildRemissionTrack(
      assessment({ lastStopDate: "2026-09-01", medFreeDays: 45, hasDiabetesDrugHistory: true, latestHba1c: { value: 5.8, date: "2026-10-01" } }),
      RULES, "2026-10-16", false,
    );
    expect(t.medication).toMatchObject({ kind: "COUNTING", days: 45, required: 90, progress: 0.5, completeOn: "2026-11-30", met: false });
    expect(t.hba1c).toMatchObject({ value: 5.8, threshold: 6.0, met: true });
    expect(t.timing).toEqual({ earliestValidDate: "2026-09-08", minDays: 7, met: true });
  });

  it("หยุดยาเกินกำหนด แถบเต็มแต่ไม่ล้น", () => {
    const t = buildRemissionTrack(assessment({ lastStopDate: "2026-01-01", hasDiabetesDrugHistory: true }), RULES, "2026-10-16", false);
    expect(t.medication).toMatchObject({ kind: "COUNTING", progress: 1, met: true });
    expect(t.timing).toBeNull();
  });

  it("HbA1c เท่ากับเกณฑ์ไม่ผ่าน", () => {
    const t = buildRemissionTrack(assessment({ latestHba1c: { value: 6.0, date: "2026-10-01" } }), RULES, "2026-10-16", false);
    expect(t.hba1c?.met).toBe(false);
  });

  it("แยกกรณียังใช้ยา ไม่มีวันหยุดยา และไม่เคยใช้ยา", () => {
    expect(buildRemissionTrack(assessment({ onDiabetesMedication: true }), RULES, "2026-10-16", false).medication).toEqual({ kind: "ON_DRUG" });
    expect(buildRemissionTrack(assessment({ hasDiabetesDrugHistory: true }), RULES, "2026-10-16", false).medication).toEqual({ kind: "NO_STOP_RECORD" });
    expect(buildRemissionTrack(assessment({}), RULES, "2026-10-16", true).medication).toEqual({ kind: "NEVER_MEDICATED", confirmed: true });
  });

  it("ผล HbA1c ตรวจเร็วเกินหลังหยุดยา", () => {
    const t = buildRemissionTrack(
      assessment({ lastStopDate: "2026-09-01", hasDiabetesDrugHistory: true, latestHba1c: { value: 5.5, date: "2026-09-05" } }),
      RULES, "2026-12-30", false,
    );
    expect(t.timing?.met).toBe(false);
  });
});

describe("ไม้บรรทัด HbA1c", () => {
  it("ช่วงเริ่มต้น 4–10 และขยายเมื่อค่าเกิน", () => {
    expect(hba1cScale(5.8, 6)).toEqual({ min: 4, max: 10 });
    expect(hba1cScale(12.4, 6)).toEqual({ min: 4, max: 13 });
    expect(percentOn(7, { min: 4, max: 10 })).toBe(50);
    expect(percentOn(20, { min: 4, max: 10 })).toBe(100);
  });
});

describe("พิกัด", () => {
  it("แปลงเป็นองศา ลิปดา ฟิลิปดา", () => {
    expect(toDms(13.756331, "lat")).toBe(`13°45'22.8"N`);
    expect(toDms(100.501765, "lng")).toBe(`100°30'06.4"E`);
    expect(toDms(-0.5, "lat")).toBe(`0°30'00.0"S`);
  });

  it("เส้นกริดอยู่ในกรอบและเรียงจากน้อยไปมาก", () => {
    const lines = graticule(13.7563);
    expect(lines.map((l) => l.value)).toEqual([13.753, 13.754, 13.755, 13.756, 13.757, 13.758, 13.759]);
    expect(lines.every((l) => l.percent >= 0 && l.percent <= 100)).toBe(true);
  });
});
