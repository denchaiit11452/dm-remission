// ตรรกะฟอร์มบันทึกน้ำตาล DTX (ฟังก์ชันล้วน ทดสอบได้ ใช้ได้ทั้งฝั่งหน้าจอและเซิร์ฟเวอร์)
import { GLUCOSE_ENTRY_LIMITS } from "@/lib/data/schemas";
import { decideGlucoseAlert } from "@/lib/risk/alerts";
import { classifyGlucose, type GlucoseAssessment } from "@/lib/risk/glucose";
import { maxLevel } from "@/lib/risk/levels";
import type { GlucosePeriod, GlucoseReadingInput, MeterFlag, RiskLevel, RiskRules } from "@/lib/risk/types";

export type EntryMode = "VALUE" | "LO" | "HI";

/** ค่าที่กรอก 1 ช่อง (ช่วงเวลาเดียวกันมีหลายช่องได้ = วัดซ้ำ) */
export type FormEntry = { key: string; period: GlucosePeriod; mode: EntryMode; value: string; time: string };

export type EntryCheck = {
  key: string;
  period: GlucosePeriod;
  /** true เมื่อมีค่าให้บันทึก (ตัวเลข หรือเลือก LO/HI) */
  filled: boolean;
  error: string | null;
  timeError: string | null;
  valueMgDl: number | null;
  meterFlag: MeterFlag;
  measuredTime: string | null;
  assessment: GlucoseAssessment | null;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function meterFlagOf(mode: EntryMode): MeterFlag {
  return mode === "LO" ? "METER_LOW" : mode === "HI" ? "METER_HIGH" : "NONE";
}

export function checkEntry(e: FormEntry, rules: RiskRules, measuredDate: string): EntryCheck {
  const meterFlag = meterFlagOf(e.mode);
  const time = e.time.trim();
  const timeError = time !== "" && !TIME_RE.test(time) ? "เวลาต้องเป็นรูปแบบ HH:mm เช่น 07:30" : null;
  const measuredTime = time !== "" && timeError === null ? time : null;
  const base = { key: e.key, period: e.period, timeError, measuredTime };

  if (e.mode !== "VALUE") {
    const reading: GlucoseReadingInput = { id: e.key, measuredDate, period: e.period, valueMgDl: null, meterFlag, isVoided: false };
    return { ...base, filled: true, error: null, valueMgDl: null, meterFlag, assessment: classifyGlucose(reading, rules) };
  }

  const raw = e.value.trim();
  if (raw === "") return { ...base, filled: false, error: null, valueMgDl: null, meterFlag, assessment: null };

  const { min, max } = GLUCOSE_ENTRY_LIMITS;
  let error: string | null = null;
  if (!/^\d+$/.test(raw)) error = "ค่าน้ำตาลต้องเป็นจำนวนเต็ม";
  else if (Number(raw) < min) error = `ค่าน้ำตาลต้องไม่ต่ำกว่า ${min}`;
  else if (Number(raw) > max) error = `ค่าน้ำตาลต้องไม่เกิน ${max}`;

  if (error) return { ...base, filled: true, error, valueMgDl: null, meterFlag, assessment: null };
  const valueMgDl = Number(raw);
  const reading: GlucoseReadingInput = { id: e.key, measuredDate, period: e.period, valueMgDl, meterFlag, isVoided: false };
  return { ...base, filled: true, error: null, valueMgDl, meterFlag, assessment: classifyGlucose(reading, rules) };
}

export type FormSummary = {
  checks: EntryCheck[];
  /** เฉพาะช่องที่มีค่า (เรียงตามลำดับที่กรอก) */
  filled: EntryCheck[];
  filledCount: number;
  criticalCount: number;
  hasErrors: boolean;
  /** กดบันทึกได้: มีค่าอย่างน้อย 1 ค่า และไม่มีช่องผิดพลาด */
  canSave: boolean;
  worstLevel: RiskLevel | null;
};

export function summarizeForm(entries: FormEntry[], rules: RiskRules, measuredDate: string): FormSummary {
  const checks = entries.map((e) => checkEntry(e, rules, measuredDate));
  const filled = checks.filter((c) => c.filled);
  const hasErrors = checks.some((c) => c.error !== null || c.timeError !== null);
  const levels = filled.flatMap((c) => (c.assessment ? [c.assessment.level] : []));
  return {
    checks,
    filled,
    filledCount: filled.length,
    criticalCount: levels.filter((l) => l === "CRITICAL").length,
    hasErrors,
    canSave: filled.length > 0 && !hasErrors,
    worstLevel: maxLevel(levels),
  };
}

/** ข้อมูลที่ส่งไปบันทึก (ตรงกับ saveGlucoseSchema) ผู้เรียกต้องตรวจ canSave แล้ว */
export function buildSavePayload(patientId: string, measuredDate: string, summary: FormSummary, note: string) {
  const trimmed = note.trim();
  return {
    patientId,
    measuredDate,
    entries: summary.filled.map((c) => ({
      period: c.period,
      valueMgDl: c.valueMgDl,
      meterFlag: c.meterFlag,
      measuredTime: c.measuredTime,
      note: trimmed === "" ? null : trimmed,
    })),
  };
}

/** Alert ที่จะถูกสร้างจากค่าที่กรอก (ตรงกับกติกาตอนบันทึกจริง ใช้แสดงตัวอย่างก่อนบันทึก) */
export function previewAlerts(summary: FormSummary, rules: RiskRules, measuredDate: string, today: string) {
  return summary.filled.flatMap((c) => {
    const reading: GlucoseReadingInput = { id: c.key, measuredDate, period: c.period, valueMgDl: c.valueMgDl, meterFlag: c.meterFlag, isVoided: false };
    const d = decideGlucoseAlert(reading, rules, today);
    return d ? [{ key: c.key, type: d.type, level: d.level, summary: d.summary, backdatedDays: d.backdatedDays }] : [];
  });
}

/**
 * จัดรูปแบบเวลาขณะพิมพ์: พิมพ์เฉพาะตัวเลข ระบบใส่ ":" ให้เอง
 * "0730" -> "07:30", "730" -> "07:30" (ตัวแรก 3-9 ถือเป็นชั่วโมงหลักเดียว), วางข้อความ "7.30" หรือ "07:30" ก็ได้
 */
export function formatTimeInput(raw: string): string {
  let d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length === 3 && d[0] >= "3") d = `0${d}`;
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function newEntry(period: GlucosePeriod, key: string): FormEntry {
  return { key, period, mode: "VALUE", value: "", time: "" };
}
