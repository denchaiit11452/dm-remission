import type { BloodPressureInput, RiskRules } from "./types";

export type BloodPressureAssessment = {
  recordId: string;
  code: "BP_CRITICAL";
  message: string;
};

/**
 * ความดันวิกฤตเมื่อ SBP >= criticalSbp "หรือ" DBP >= criticalDbp (เงื่อนไขใดเงื่อนไขหนึ่ง)
 * คืน null เมื่อไม่วิกฤต ไม่มีค่า หรือรายการถูกยกเลิก
 * (ความดันที่ไม่วิกฤตไม่ส่งผลต่อระดับความเสี่ยง ระดับมาจากน้ำตาลเป็นหลัก)
 */
export function assessBloodPressure(
  bp: BloodPressureInput,
  rules: RiskRules,
): BloodPressureAssessment | null {
  if (bp.isVoided) return null;

  const sbpCritical = bp.sbp !== null && bp.sbp >= rules.criticalSbp;
  const dbpCritical = bp.dbp !== null && bp.dbp >= rules.criticalDbp;
  if (!sbpCritical && !dbpCritical) return null;

  return {
    recordId: bp.id,
    code: "BP_CRITICAL",
    message: `ความดันโลหิต ${bp.sbp ?? "-"}/${bp.dbp ?? "-"} mmHg ถึงเกณฑ์วิกฤต (${rules.criticalSbp}/${rules.criticalDbp})`,
  };
}
