import { daysBetween, maxDateKey } from "../date";
import { assessBloodPressure } from "./blood-pressure";
import { classifyGlucose } from "./glucose";
import { maxLevel, severity } from "./levels";
import { findMissingThresholds, type GlucoseThresholdKey } from "./rules";
import type { BloodPressureInput, GlucoseReadingInput, RiskLevel, RiskReason, RiskRules } from "./types";

export type CurrentRiskInput = {
  glucoseReadings: GlucoseReadingInput[];
  bloodPressures: BloodPressureInput[];
  rules: RiskRules;
  /** วันนี้ตามเวลาไทย (date key) ใช้ตรวจข้อมูลเก่าและตัดวันที่ในอนาคต */
  today: string;
};

export type CurrentRisk = {
  /** null = ยังไม่มีข้อมูลให้ประเมิน */
  level: RiskLevel | null;
  reasons: RiskReason[];
  glucoseDate: string | null;
  bloodPressureDate: string | null;
  /** จำนวนวันนับจากวันที่วัดน้ำตาลล่าสุดถึงวันนี้ */
  glucoseAgeDays: number | null;
  /** ข้อมูลน้ำตาลเก่ากว่า staleDataDays (หน้าจอควรแสดงป้ายเตือนข้างระดับ) */
  isStale: boolean;
  /** เกณฑ์ที่แพทย์ยังไม่ได้กำหนด */
  missingThresholds: GlucoseThresholdKey[];
  /** id ของรายการที่ลงวันที่ในอนาคต ถูกข้าม (น่าจะกรอกวันที่ผิด) */
  ignoredFutureDated: string[];
};

/**
 * ระดับความเสี่ยงปัจจุบัน (AUTO) ของผู้ป่วย ตามที่ตกลงกับแพทย์:
 *  1) น้ำตาล: ค่าที่ "แย่ที่สุด" ของ "วันที่วัดล่าสุด" (นับจากวันที่วัด ไม่ใช่วันที่กรอก
 *     การกรอกย้อนหลังจึงไม่ดึงระดับกลับไปเป็นของวันเก่า)
 *  2) ความดัน: ผลของ "วันที่ตรวจล่าสุด" ถ้าวิกฤตให้ระดับรวมเป็นวิกฤต
 *  3) ระดับรวม = ระดับที่รุนแรงที่สุดของทั้งสองส่วน
 * รายการที่ถูกยกเลิก (void) ไม่ถูกนับ
 */
export function computeCurrentRisk(input: CurrentRiskInput): CurrentRisk {
  const { rules, today } = input;
  const ignoredFutureDated: string[] = [];

  const glucose = input.glucoseReadings.filter((r) => {
    if (r.isVoided) return false;
    if (r.valueMgDl === null && r.meterFlag === "NONE") return false;
    if (r.measuredDate > today) {
      ignoredFutureDated.push(r.id);
      return false;
    }
    return true;
  });

  const pressures = input.bloodPressures.filter((r) => {
    if (r.isVoided) return false;
    if (r.sbp === null && r.dbp === null) return false;
    if (r.recordedDate > today) {
      ignoredFutureDated.push(r.id);
      return false;
    }
    return true;
  });

  const glucoseDate = maxDateKey(glucose.map((r) => r.measuredDate));
  const bloodPressureDate = maxDateKey(pressures.map((r) => r.recordedDate));

  const glucoseAssessments = glucose
    .filter((r) => r.measuredDate === glucoseDate)
    .flatMap((r) => {
      const a = classifyGlucose(r, rules);
      return a ? [a] : [];
    });

  const bpCritical = pressures
    .filter((r) => r.recordedDate === bloodPressureDate)
    .flatMap((r) => {
      const a = assessBloodPressure(r, rules);
      return a ? [a] : [];
    });

  const level = maxLevel([
    ...glucoseAssessments.map((a) => a.level),
    ...(bpCritical.length > 0 ? (["CRITICAL"] as RiskLevel[]) : []),
  ]);

  const reasons: RiskReason[] = [
    ...glucoseAssessments
      .filter((a) => a.level !== "WELL_CONTROLLED")
      .map<RiskReason>((a) => ({
        code: a.code,
        metric: "glucose",
        level: a.level,
        message: a.message,
        sourceId: a.readingId,
      })),
    ...bpCritical.map<RiskReason>((a) => ({
      code: a.code,
      metric: "bloodPressure",
      level: "CRITICAL",
      message: a.message,
      sourceId: a.recordId,
    })),
  ].sort((a, b) => severity(b.level) - severity(a.level));

  // ไม่มีค่าผิดปกติเลย แต่มีค่าน้ำตาล: ระบุเหตุผลว่าอยู่ในช่วงปกติ
  if (reasons.length === 0 && glucoseAssessments.length > 0) {
    const sample = glucoseAssessments[0];
    reasons.push({
      code: "GLUCOSE_WELL_CONTROLLED",
      metric: "glucose",
      level: "WELL_CONTROLLED",
      message: `ค่าน้ำตาลทุกค่าของวันที่ ${glucoseDate} อยู่ในช่วงควบคุมได้ดี (${rules.goodMin}–${rules.goodMax})`,
      sourceId: sample.readingId,
    });
  }

  const glucoseAgeDays = glucoseDate === null ? null : daysBetween(glucoseDate, today);
  // ไม่มีค่าน้ำตาลเลยแต่มีระดับจากความดัน ถือว่าข้อมูลน้ำตาลเก่า (ไม่ควรดูเหมือนข้อมูลสด)
  const isStale =
    glucoseAgeDays === null ? level !== null : glucoseAgeDays > rules.staleDataDays;

  return {
    level,
    reasons,
    glucoseDate,
    bloodPressureDate,
    glucoseAgeDays,
    isStale,
    missingThresholds: findMissingThresholds(rules),
    ignoredFutureDated,
  };
}
