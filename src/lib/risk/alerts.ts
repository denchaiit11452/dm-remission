import { daysBetween } from "../date";
import { assessBloodPressure } from "./blood-pressure";
import { classifyGlucose } from "./glucose";
import type { BloodPressureInput, GlucoseReadingInput, RiskLevel, RiskRules } from "./types";

// ชื่อตรงกับ enum AlertType ใน prisma/schema.prisma (เฉพาะที่ Phase 1 ใช้)
export type AlertType = "CRITICAL_GLUCOSE_LOW" | "CRITICAL_GLUCOSE_HIGH" | "CRITICAL_BP" | "HIGH_RISK";

export type AlertDecision = {
  type: AlertType;
  level: RiskLevel;
  /** กันสร้าง Alert ซ้ำจากต้นเหตุเดียวกัน (คอลัมน์ alerts.dedupeKey เป็น unique) */
  dedupeKey: string;
  summary: string;
  /** วันที่วัด/ตรวจจริง */
  eventDate: string;
  /** กรอกย้อนหลังกี่วัน (0 = กรอกวันเดียวกับที่วัด) */
  backdatedDays: number;
  isBackdated: boolean;
  glucoseReadingId: string | null;
  labRecordId: string | null;
};

function backdatedInfo(eventDate: string, recordedOn: string) {
  const days = Math.max(0, daysBetween(eventDate, recordedOn));
  return { backdatedDays: days, isBackdated: days > 0 };
}

/**
 * ตัดสินว่าค่าน้ำตาลที่เพิ่งบันทึกต้องสร้าง Alert หรือไม่
 *  - วิกฤต (รวมเครื่องขึ้น LO/HI) -> Alert เสมอ
 *  - ความเสี่ยงสูง -> Alert เฉพาะเมื่อเปิด rules.alertOnHighRisk
 * recordedOn = วันที่กรอกเข้าระบบ (ตามเวลาไทย) ใช้บอกว่าเป็นค่าย้อนหลังกี่วัน
 * ค่าย้อนหลังยังสร้าง Alert เพราะผู้ป่วยอาจยังมีอาการ แต่ระบุจำนวนวันให้แพทย์ประเมินความเร่งด่วน
 */
export function decideGlucoseAlert(
  reading: GlucoseReadingInput,
  rules: RiskRules,
  recordedOn: string,
): AlertDecision | null {
  const assessment = classifyGlucose(reading, rules);
  if (!assessment) return null;

  let type: AlertType | null = null;
  if (assessment.level === "CRITICAL") {
    type = assessment.direction === "LOW" ? "CRITICAL_GLUCOSE_LOW" : "CRITICAL_GLUCOSE_HIGH";
  } else if (assessment.level === "HIGH" && rules.alertOnHighRisk) {
    type = "HIGH_RISK";
  }
  if (type === null) return null;

  return {
    type,
    level: assessment.level,
    dedupeKey: `${type}:${reading.id}`,
    summary: assessment.message,
    eventDate: reading.measuredDate,
    ...backdatedInfo(reading.measuredDate, recordedOn),
    glucoseReadingId: reading.id,
    labRecordId: null,
  };
}

/** ความดันวิกฤต (SBP >= เกณฑ์ หรือ DBP >= เกณฑ์) -> Alert เสมอ */
export function decideBloodPressureAlert(
  bp: BloodPressureInput,
  rules: RiskRules,
  recordedOn: string,
): AlertDecision | null {
  const assessment = assessBloodPressure(bp, rules);
  if (!assessment) return null;

  return {
    type: "CRITICAL_BP",
    level: "CRITICAL",
    dedupeKey: `CRITICAL_BP:${bp.id}`,
    summary: assessment.message,
    eventDate: bp.recordedDate,
    ...backdatedInfo(bp.recordedDate, recordedOn),
    glucoseReadingId: null,
    labRecordId: bp.id,
  };
}
