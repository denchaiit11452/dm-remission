// ข้อมูลสำหรับชุดทดสอบเท่านั้น (ห้ามนำไปใช้ในระบบจริง)
import { DEFAULT_RISK_RULES } from "./rules";
import type { BloodPressureInput, GlucoseReadingInput, RiskRules } from "./types";

/**
 * เกณฑ์ "สมมติ" สำหรับทดสอบตรรกะเท่านั้น ตัวเลขเลือกให้ต่างกันชัดเจนเพื่อดูขอบเขต
 * ไม่ใช่เกณฑ์ทางคลินิก เกณฑ์จริงต้องกำหนดโดยแพทย์ในหน้าตั้งค่า
 */
export const TEST_RULES: RiskRules = {
  ...DEFAULT_RISK_RULES,
  watchBelow: 70,
  watchAbove: 200,
  highBelow: 60,
  highAbove: 300,
  criticalGlucoseBelow: 50,
  criticalGlucoseAbove: 400,
};

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export function glucose(overrides: Partial<GlucoseReadingInput> = {}): GlucoseReadingInput {
  return {
    id: nextId("g"),
    measuredDate: "2026-10-10",
    period: "BEFORE_BREAKFAST",
    valueMgDl: 100,
    meterFlag: "NONE",
    isVoided: false,
    ...overrides,
  };
}

export function bp(overrides: Partial<BloodPressureInput> = {}): BloodPressureInput {
  return {
    id: nextId("bp"),
    recordedDate: "2026-10-10",
    sbp: 120,
    dbp: 80,
    isVoided: false,
    ...overrides,
  };
}
