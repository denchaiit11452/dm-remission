// ชนิดข้อมูลของตรรกะประเมินความเสี่ยง
// ตั้งใจให้เป็นชนิดของตัวเอง (ไม่ import จาก @prisma/client) เพื่อให้ทดสอบได้โดยไม่ต้องมีฐานข้อมูล
// ค่าของ enum ตรงกับใน prisma/schema.prisma ทุกตัว จึงส่งค่าจาก Prisma เข้ามาได้โดยตรง

export type RiskLevel = "WELL_CONTROLLED" | "UNCONTROLLED" | "WATCH" | "HIGH" | "CRITICAL";

export type GlucosePeriod =
  | "BEFORE_BREAKFAST"
  | "AFTER_BREAKFAST"
  | "BEFORE_DINNER"
  | "AFTER_DINNER";

/** กรณีเครื่อง DTX ไม่แสดงตัวเลข */
export type MeterFlag = "NONE" | "METER_LOW" | "METER_HIGH";

/**
 * เกณฑ์ความเสี่ยง 1 ชุด (ตรงกับตาราง risk_rule_sets)
 * ค่า null = แพทย์ยังไม่กำหนดเกณฑ์นั้น (ระบบจะข้ามระดับนั้น)
 *
 * ความหมายของเกณฑ์น้ำตาล (mg/dL):
 *  - ควบคุมได้ดี: goodMin <= ค่า <= goodMax (รวมขอบ)
 *  - xxxBelow: ค่า < เกณฑ์ (เคร่งครัด)    xxxAbove: ค่า > เกณฑ์ (เคร่งครัด)
 */
export type RiskRules = {
  goodMin: number;
  goodMax: number;
  watchBelow: number | null;
  watchAbove: number | null;
  highBelow: number | null;
  highAbove: number | null;
  criticalGlucoseBelow: number | null;
  criticalGlucoseAbove: number | null;
  /** ความดันวิกฤต: SBP >= criticalSbp หรือ DBP >= criticalDbp */
  criticalSbp: number;
  criticalDbp: number;
  remissionHba1cMax: number;
  remissionMedFreeDays: number;
  staleDataDays: number;
  alertOnHighRisk: boolean;
};

/** ค่าน้ำตาล DTX 1 ค่า (วันที่เป็น date key "YYYY-MM-DD" = วันที่ผู้ป่วยวัดจริง) */
export type GlucoseReadingInput = {
  id: string;
  measuredDate: string;
  period: GlucosePeriod;
  valueMgDl: number | null;
  meterFlag: MeterFlag;
  /** true เมื่อรายการถูกยกเลิก (voidedAt != null) */
  isVoided: boolean;
};

/** ความดันโลหิต 1 ครั้ง (มาจาก lab_records) */
export type BloodPressureInput = {
  id: string;
  recordedDate: string;
  sbp: number | null;
  dbp: number | null;
  isVoided: boolean;
};

/** เหตุผลที่ทำให้ได้ระดับนั้น ใช้แสดงในหน้าจอ "ทำไมได้ระดับนี้" และเก็บใน risk_assessments.reasons */
export type RiskReason = {
  code: string;
  metric: "glucose" | "bloodPressure";
  level: RiskLevel;
  message: string;
  /** id ของ glucose_reading หรือ lab_record ต้นเหตุ */
  sourceId: string;
};
