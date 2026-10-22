import { GLUCOSE_PERIOD_LABELS } from "./levels";
import type { GlucoseReadingInput, RiskLevel, RiskRules } from "./types";

export type GlucoseAssessment = {
  readingId: string;
  level: RiskLevel;
  /** ทิศทางที่ผิดปกติ (null = อยู่ในช่วงควบคุมได้ดี) */
  direction: "LOW" | "HIGH" | null;
  code: string;
  message: string;
};

const below = (value: number, threshold: number | null): boolean =>
  threshold !== null && value < threshold;
const above = (value: number, threshold: number | null): boolean =>
  threshold !== null && value > threshold;

/**
 * ประเมินค่าน้ำตาล DTX 1 ค่า ตามเกณฑ์ชุดเดียวใช้ร่วมกันทุกช่วงเวลาอาหาร
 *
 * ตรวจจากระดับรุนแรงที่สุดลงมา เกณฑ์ที่แพทย์ยังไม่กำหนด (null) จะถูกข้าม
 * คืน null เมื่อประเมินไม่ได้ (รายการถูกยกเลิก หรือไม่มีค่าและเครื่องไม่ได้ขึ้น LO/HI)
 */
export function classifyGlucose(
  reading: GlucoseReadingInput,
  rules: RiskRules,
): GlucoseAssessment | null {
  if (reading.isVoided) return null;

  const periodLabel = GLUCOSE_PERIOD_LABELS[reading.period];
  const base = { readingId: reading.id };

  // เครื่องขึ้น LO / HI = นอกช่วงที่เครื่องวัดได้ ถือเป็นวิกฤตทันที
  if (reading.meterFlag === "METER_LOW") {
    return {
      ...base,
      level: "CRITICAL",
      direction: "LOW",
      code: "GLUCOSE_METER_LOW",
      message: `${periodLabel}: เครื่องวัดแสดง LO (ต่ำกว่าช่วงที่เครื่องวัดได้)`,
    };
  }
  if (reading.meterFlag === "METER_HIGH") {
    return {
      ...base,
      level: "CRITICAL",
      direction: "HIGH",
      code: "GLUCOSE_METER_HIGH",
      message: `${periodLabel}: เครื่องวัดแสดง HI (สูงกว่าช่วงที่เครื่องวัดได้)`,
    };
  }

  const value = reading.valueMgDl;
  if (value === null || !Number.isFinite(value)) return null;

  const label = `${periodLabel}: ${value} mg/dL`;

  if (below(value, rules.criticalGlucoseBelow)) {
    return { ...base, level: "CRITICAL", direction: "LOW", code: "GLUCOSE_CRITICAL_LOW", message: `${label} ต่ำกว่า ${rules.criticalGlucoseBelow} (วิกฤต)` };
  }
  if (above(value, rules.criticalGlucoseAbove)) {
    return { ...base, level: "CRITICAL", direction: "HIGH", code: "GLUCOSE_CRITICAL_HIGH", message: `${label} สูงกว่า ${rules.criticalGlucoseAbove} (วิกฤต)` };
  }
  if (below(value, rules.highBelow)) {
    return { ...base, level: "HIGH", direction: "LOW", code: "GLUCOSE_HIGH_LOW", message: `${label} ต่ำกว่า ${rules.highBelow} (ความเสี่ยงสูง)` };
  }
  if (above(value, rules.highAbove)) {
    return { ...base, level: "HIGH", direction: "HIGH", code: "GLUCOSE_HIGH_HIGH", message: `${label} สูงกว่า ${rules.highAbove} (ความเสี่ยงสูง)` };
  }
  if (below(value, rules.watchBelow)) {
    return { ...base, level: "WATCH", direction: "LOW", code: "GLUCOSE_WATCH_LOW", message: `${label} ต่ำกว่า ${rules.watchBelow} (เฝ้าระวัง)` };
  }
  if (above(value, rules.watchAbove)) {
    return { ...base, level: "WATCH", direction: "HIGH", code: "GLUCOSE_WATCH_HIGH", message: `${label} สูงกว่า ${rules.watchAbove} (เฝ้าระวัง)` };
  }
  if (value < rules.goodMin) {
    return { ...base, level: "UNCONTROLLED", direction: "LOW", code: "GLUCOSE_UNCONTROLLED_LOW", message: `${label} ต่ำกว่าช่วงควบคุมได้ดี (${rules.goodMin}–${rules.goodMax})` };
  }
  if (value > rules.goodMax) {
    return { ...base, level: "UNCONTROLLED", direction: "HIGH", code: "GLUCOSE_UNCONTROLLED_HIGH", message: `${label} สูงกว่าช่วงควบคุมได้ดี (${rules.goodMin}–${rules.goodMax})` };
  }
  return {
    ...base,
    level: "WELL_CONTROLLED",
    direction: null,
    code: "GLUCOSE_WELL_CONTROLLED",
    message: `${label} อยู่ในช่วงควบคุมได้ดี (${rules.goodMin}–${rules.goodMax})`,
  };
}
