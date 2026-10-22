import type { GlucosePeriod, RiskLevel } from "./types";

/** เรียงจากเบาไปหนัก */
export const RISK_LEVEL_ORDER: readonly RiskLevel[] = [
  "WELL_CONTROLLED",
  "UNCONTROLLED",
  "WATCH",
  "HIGH",
  "CRITICAL",
];

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  WELL_CONTROLLED: "ควบคุมได้ดี",
  UNCONTROLLED: "ยังคุมไม่ได้",
  WATCH: "เฝ้าระวัง",
  HIGH: "ความเสี่ยงสูง",
  CRITICAL: "วิกฤต",
};

export const GLUCOSE_PERIOD_LABELS: Record<GlucosePeriod, string> = {
  BEFORE_BREAKFAST: "ก่อนอาหารเช้า",
  AFTER_BREAKFAST: "หลังอาหารเช้า",
  BEFORE_DINNER: "ก่อนอาหารเย็น",
  AFTER_DINNER: "หลังอาหารเย็น",
};

export function severity(level: RiskLevel): number {
  return RISK_LEVEL_ORDER.indexOf(level);
}

/** ระดับที่รุนแรงที่สุดในรายการ (คืน null ถ้าไม่มีรายการ) */
export function maxLevel(levels: RiskLevel[]): RiskLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((worst, level) => (severity(level) > severity(worst) ? level : worst));
}
