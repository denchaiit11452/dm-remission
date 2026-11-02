// ตัวอย่างผลก่อนบันทึก: ระดับปัจจุบันจะเป็นอะไรหลังเพิ่มค่าเหล่านี้ (อ่านอย่างเดียว ไม่เขียนฐานข้อมูล)
import { computeCurrentRisk } from "@/lib/risk/current-risk";
import { classifyGlucose } from "@/lib/risk/glucose";
import { maxLevel } from "@/lib/risk/levels";
import type { BloodPressureInput, GlucosePeriod, GlucoseReadingInput, MeterFlag, RiskLevel, RiskRules } from "@/lib/risk/types";

export type ProposedReading = { period: GlucosePeriod; valueMgDl: number | null; meterFlag: MeterFlag };

export type SavePreview = {
  levelBefore: RiskLevel | null;
  levelAfter: RiskLevel | null;
  /** ค่าที่แย่ที่สุดของ "วันที่วัดที่เลือก" (รวมค่าที่มีอยู่แล้วในวันนั้นกับค่าที่กำลังจะบันทึก) */
  worstOfDay: RiskLevel | null;
};

export function previewSave(input: {
  /** ค่าที่มีอยู่แล้วของผู้ป่วย (อย่างน้อยของวันล่าสุดและวันที่วัดที่เลือก) */
  existing: GlucoseReadingInput[];
  bloodPressures: BloodPressureInput[];
  proposed: ProposedReading[];
  measuredDate: string;
  rules: RiskRules;
  today: string;
}): SavePreview {
  const { existing, bloodPressures, proposed, measuredDate, rules, today } = input;
  const added: GlucoseReadingInput[] = proposed.map((p, i) => ({
    id: `preview-${i}`, measuredDate, period: p.period, valueMgDl: p.valueMgDl, meterFlag: p.meterFlag, isVoided: false,
  }));

  const before = computeCurrentRisk({ glucoseReadings: existing, bloodPressures, rules, today });
  const after = computeCurrentRisk({ glucoseReadings: [...existing, ...added], bloodPressures, rules, today });

  const sameDay = [...existing, ...added].filter((r) => !r.isVoided && r.measuredDate === measuredDate);
  const worstOfDay = maxLevel(sameDay.flatMap((r) => { const a = classifyGlucose(r, rules); return a ? [a.level] : []; }));

  return { levelBefore: before.level, levelAfter: after.level, worstOfDay };
}
