// รูปแบบข้อมูลที่เก็บใน risk_assessments.reasons (คอลัมน์ Json) และตัวแปลงอ่าน/เขียน
// แยกเป็นฟังก์ชันล้วนเพื่อทดสอบได้โดยไม่ต่อฐานข้อมูล
import { classifyGlucose } from "@/lib/risk/glucose";
import { severity } from "@/lib/risk/levels";
import type { CurrentRisk } from "@/lib/risk/current-risk";
import type { GlucosePeriod, GlucoseReadingInput, MeterFlag, RiskReason, RiskRules } from "@/lib/risk/types";

/** ค่าที่ใช้ตัดสินระดับน้ำตาล (ค่าที่แย่ที่สุดของวันล่าสุด) ใช้แสดงในรายชื่อผู้ป่วย */
export type AssessmentHeadline = {
  valueMgDl: number | null;
  meterFlag: MeterFlag;
  period: GlucosePeriod;
  measuredDate: string;
};

export type StoredAssessmentDetail = {
  v: 1;
  reasons: RiskReason[];
  glucoseDate: string | null;
  bloodPressureDate: string | null;
  headline: AssessmentHeadline | null;
  ruleVersion: number;
};

/** เลือกค่าที่แย่ที่สุดจากค่าของวันเดียวกัน (เท่ากันให้เอาค่าท้ายสุดในรายการ) */
export function pickHeadline(readings: GlucoseReadingInput[], rules: RiskRules): AssessmentHeadline | null {
  let best: { reading: GlucoseReadingInput; sev: number } | null = null;
  for (const reading of readings) {
    const a = classifyGlucose(reading, rules);
    if (!a) continue;
    const sev = severity(a.level);
    if (best === null || sev >= best.sev) best = { reading, sev };
  }
  if (!best) return null;
  return {
    valueMgDl: best.reading.valueMgDl,
    meterFlag: best.reading.meterFlag,
    period: best.reading.period,
    measuredDate: best.reading.measuredDate,
  };
}

export function buildAssessmentDetail(
  current: CurrentRisk,
  latestDayReadings: GlucoseReadingInput[],
  rules: RiskRules,
  ruleVersion: number,
): StoredAssessmentDetail {
  return {
    v: 1,
    reasons: current.reasons,
    glucoseDate: current.glucoseDate,
    bloodPressureDate: current.bloodPressureDate,
    headline: pickHeadline(latestDayReadings, rules),
    ruleVersion,
  };
}

/** อ่านค่าที่เก็บไว้กลับมา (คืน null ถ้ารูปแบบไม่ตรง เช่น แถวที่ผู้ใช้อื่นเขียน) */
export function parseAssessmentDetail(json: unknown): StoredAssessmentDetail | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.reasons)) return null;
  return {
    v: 1,
    reasons: o.reasons as RiskReason[],
    glucoseDate: typeof o.glucoseDate === "string" ? o.glucoseDate : null,
    bloodPressureDate: typeof o.bloodPressureDate === "string" ? o.bloodPressureDate : null,
    headline: (o.headline as AssessmentHeadline | null) ?? null,
    ruleVersion: typeof o.ruleVersion === "number" ? o.ruleVersion : 0,
  };
}
