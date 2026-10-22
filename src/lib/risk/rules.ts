import type { RiskRules } from "./types";

/**
 * ค่าเริ่มต้นของเกณฑ์ (ตรงกับค่า default ใน prisma/schema.prisma)
 * เกณฑ์น้ำตาลที่แพทย์ต้องกำหนดเป็น null ไว้ ห้ามเติมตัวเลขเองในโค้ด
 */
export const DEFAULT_RISK_RULES: RiskRules = {
  goodMin: 80,
  goodMax: 140,
  watchBelow: null,
  watchAbove: null,
  highBelow: null,
  highAbove: null,
  criticalGlucoseBelow: null,
  criticalGlucoseAbove: null,
  criticalSbp: 180,
  criticalDbp: 120,
  remissionHba1cMax: 6.5,
  remissionMedFreeDays: 90,
  staleDataDays: 7,
  alertOnHighRisk: false,
};

export type GlucoseThresholdKey =
  | "watchBelow"
  | "watchAbove"
  | "highBelow"
  | "highAbove"
  | "criticalGlucoseBelow"
  | "criticalGlucoseAbove";

const GLUCOSE_THRESHOLD_KEYS: readonly GlucoseThresholdKey[] = [
  "watchBelow",
  "watchAbove",
  "highBelow",
  "highAbove",
  "criticalGlucoseBelow",
  "criticalGlucoseAbove",
];

/**
 * เกณฑ์น้ำตาลที่แพทย์ยังไม่ได้กำหนด
 * หน้าจอใช้แสดงแถบเตือน "ยังไม่ได้กำหนดเกณฑ์ ไม่ควรใช้กับผู้ป่วยจริง"
 */
export function findMissingThresholds(rules: RiskRules): GlucoseThresholdKey[] {
  return GLUCOSE_THRESHOLD_KEYS.filter((key) => rules[key] === null);
}

function isStrictlyIncreasing(values: Array<number | null>): boolean {
  const present = values.filter((v): v is number => v !== null);
  return present.every((v, i) => i === 0 || present[i - 1] < v);
}

/**
 * ตรวจความสอดคล้องของเกณฑ์ก่อนบันทึก (ใช้ในหน้าตั้งค่า)
 * คืนรายการข้อความที่ต้องแก้ ถ้าว่าง = ใช้ได้
 * เป็นการตรวจเชิงโครงสร้าง (เช่น เกณฑ์ที่หนักกว่าต้องไม่ซ้อนทับเกณฑ์ที่เบากว่า) ไม่ใช่การตัดสินทางคลินิก
 */
export function validateRiskRules(rules: RiskRules): string[] {
  const problems: string[] = [];

  if (!(rules.goodMin < rules.goodMax)) {
    problems.push("ช่วง 'ควบคุมได้ดี' ไม่ถูกต้อง: ค่าต่ำสุดต้องน้อยกว่าค่าสูงสุด");
  }
  if (
    !isStrictlyIncreasing([
      rules.criticalGlucoseBelow,
      rules.highBelow,
      rules.watchBelow,
      rules.goodMin,
    ])
  ) {
    problems.push(
      "เกณฑ์น้ำตาลฝั่งต่ำต้องเรียง: วิกฤต < ความเสี่ยงสูง < เฝ้าระวัง < ขอบล่างของ 'ควบคุมได้ดี'",
    );
  }
  if (
    !isStrictlyIncreasing([
      rules.goodMax,
      rules.watchAbove,
      rules.highAbove,
      rules.criticalGlucoseAbove,
    ])
  ) {
    problems.push(
      "เกณฑ์น้ำตาลฝั่งสูงต้องเรียง: ขอบบนของ 'ควบคุมได้ดี' < เฝ้าระวัง < ความเสี่ยงสูง < วิกฤต",
    );
  }
  if (!(rules.criticalSbp > 0) || !(rules.criticalDbp > 0)) {
    problems.push("เกณฑ์ความดันวิกฤตต้องเป็นค่าบวก");
  }
  if (!(rules.remissionHba1cMax > 0)) {
    problems.push("เกณฑ์ HbA1c ของ Remission ต้องเป็นค่าบวก");
  }
  if (!Number.isInteger(rules.remissionMedFreeDays) || rules.remissionMedFreeDays < 0) {
    problems.push("จำนวนวันที่หยุดยาต้องเป็นจำนวนเต็มตั้งแต่ 0");
  }
  if (!Number.isInteger(rules.staleDataDays) || rules.staleDataDays < 1) {
    problems.push("จำนวนวันที่ถือว่าข้อมูลเก่าต้องเป็นจำนวนเต็มตั้งแต่ 1");
  }
  return problems;
}
