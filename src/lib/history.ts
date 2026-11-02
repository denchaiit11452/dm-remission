// ประวัติน้ำตาลรายวัน (ฟังก์ชันล้วน ไม่ต่อฐานข้อมูล ทดสอบได้)
// แสดง 4 ช่วงเวลาต่อวัน, ค่าวัดซ้ำ, "ระดับของวัน" = ค่าที่แย่ที่สุดของวัน (ตรงกับที่ใช้ประเมินระดับปัจจุบัน)
import { addDays, daysBetween } from "@/lib/date";
import { classifyGlucose } from "@/lib/risk/glucose";
import { maxLevel, severity } from "@/lib/risk/levels";
import type { GlucosePeriod, GlucoseReadingInput, MeterFlag, RiskLevel, RiskRules } from "@/lib/risk/types";

export const PERIODS: readonly GlucosePeriod[] = ["BEFORE_BREAKFAST", "AFTER_BREAKFAST", "BEFORE_DINNER", "AFTER_DINNER"];
export const PRESET_RANGES = [7, 14, 30] as const;
export const MAX_CUSTOM_DAYS = 90;
export const MAX_RANGE_DAYS = 90;

const WEEKDAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

export function weekdayName(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export type HistoryReading = {
  id: string;
  valueMgDl: number | null;
  meterFlag: MeterFlag;
  level: RiskLevel | null; // null = ประเมินไม่ได้
  direction: "LOW" | "HIGH" | null;
};

export type HistoryCell = {
  period: GlucosePeriod;
  /** ค่าที่แสดงเป็นหลัก = ค่าที่แย่ที่สุดในช่วงเวลานั้น (null = ไม่ได้บันทึก) */
  primary: HistoryReading | null;
  /** ค่าวัดซ้ำในช่วงเวลาเดียวกัน (ที่เหลือจาก primary) */
  repeats: HistoryReading[];
};

export type HistoryDay = {
  date: string;
  weekday: string;
  recorded: boolean;
  isLatest: boolean;
  /** ระดับของวัน = ค่าที่แย่ที่สุดของวัน (null = ไม่ได้บันทึก) */
  level: RiskLevel | null;
  cells: Record<GlucosePeriod, HistoryCell>;
};

export type HistoryStats = {
  /** ค่าเฉลี่ยของค่าตัวเลขทั้งหมดในช่วง (ไม่รวม LO/HI ที่ไม่มีตัวเลข) */
  mean: number | null;
  valueCount: number;
  inRangeCount: number;
  inRangePercent: number | null;
  unrecordedDays: string[];
};

export type DailyHistory = { from: string; to: string; days: HistoryDay[]; stats: HistoryStats };

function toHistoryReading(r: GlucoseReadingInput, rules: RiskRules): HistoryReading {
  const a = classifyGlucose(r, rules);
  return { id: r.id, valueMgDl: r.valueMgDl, meterFlag: r.meterFlag, level: a?.level ?? null, direction: a?.direction ?? null };
}

/** ใครแย่กว่า: ระดับสูงกว่าก่อน แล้วค่าที่เบี่ยงเบนมากกว่า (สูง = ค่ามากกว่า, ต่ำ = ค่าน้อยกว่า) */
function worseFirst(a: HistoryReading, b: HistoryReading): number {
  const sa = a.level ? severity(a.level) : -1;
  const sb = b.level ? severity(b.level) : -1;
  if (sa !== sb) return sb - sa;
  if (a.direction === "HIGH" && b.direction === "HIGH") return (b.valueMgDl ?? Infinity) - (a.valueMgDl ?? Infinity);
  if (a.direction === "LOW" && b.direction === "LOW") return (a.valueMgDl ?? -Infinity) - (b.valueMgDl ?? -Infinity);
  return 0; // เท่ากัน คงลำดับเดิม
}

export function buildDailyHistory(input: {
  readings: GlucoseReadingInput[];
  rules: RiskRules;
  from: string;
  to: string;
  /** วันที่วัดล่าสุดของผู้ป่วย (ทั้งหมด ไม่ใช่เฉพาะในช่วง) ไว้ติดป้าย "ล่าสุด" */
  latestDate: string | null;
}): DailyHistory {
  const { rules, from, to, latestDate } = input;
  const span = daysBetween(from, to);
  if (span < 0) throw new Error("ช่วงวันที่ไม่ถูกต้อง: from ต้องไม่เกิน to");
  if (span + 1 > MAX_RANGE_DAYS) throw new Error(`ช่วงวันที่ยาวเกิน ${MAX_RANGE_DAYS} วัน`);

  const valid = input.readings.filter((r) => !r.isVoided && r.measuredDate >= from && r.measuredDate <= to);
  const byDay = new Map<string, GlucoseReadingInput[]>();
  for (const r of valid) byDay.set(r.measuredDate, [...(byDay.get(r.measuredDate) ?? []), r]);

  const days: HistoryDay[] = [];
  const unrecordedDays: string[] = [];
  for (let i = span; i >= 0; i--) {
    const date = addDays(from, i); // ใหม่ไปเก่า
    const list = byDay.get(date) ?? [];
    const cells = {} as Record<GlucosePeriod, HistoryCell>;
    for (const period of PERIODS) {
      const sorted = list.filter((r) => r.period === period).map((r) => toHistoryReading(r, rules)).sort(worseFirst);
      cells[period] = { period, primary: sorted[0] ?? null, repeats: sorted.slice(1) };
    }
    const levels = list.map((r) => toHistoryReading(r, rules).level).filter((l): l is RiskLevel => l !== null);
    const recorded = list.length > 0;
    if (!recorded) unrecordedDays.push(date);
    days.push({ date, weekday: weekdayName(date), recorded, isLatest: date === latestDate, level: maxLevel(levels), cells });
  }

  const numbers = valid.map((r) => (r.meterFlag === "NONE" ? r.valueMgDl : null)).filter((v): v is number => v !== null);
  const inRangeCount = numbers.filter((v) => v >= rules.goodMin && v <= rules.goodMax).length;
  return {
    from,
    to,
    days,
    stats: {
      mean: numbers.length ? Math.round(numbers.reduce((s, v) => s + v, 0) / numbers.length) : null,
      valueCount: numbers.length,
      inRangeCount,
      inRangePercent: numbers.length ? Math.round((inRangeCount / numbers.length) * 100) : null,
      unrecordedDays: unrecordedDays.sort(),
    },
  };
}

// ---------------------------------------------------------------- ช่วงวันที่จาก URL
type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isDateKey = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;

export type HistoryRange = { from: string; to: string; preset: number | null; custom: boolean };

/**
 * range=7|14|30 (ค่าเริ่มต้น 7), หรือกำหนดเอง from/to (ไม่เกิน 90 วัน)
 * ปลายช่วงเริ่มต้น = วันที่วัดล่าสุด (ถ้าไม่มีข้อมูลเลยใช้วันนี้)
 * days = จำนวนวันที่ขอ (ปุ่ม "ดูย้อนหลังเพิ่ม" บนมือถือ) ใช้ได้ถึง 90
 */
export function parseHistoryRange(raw: Raw, latestDate: string | null, today: string): HistoryRange {
  const end = latestDate ?? today;
  const f = first(raw.from);
  const t = first(raw.to);
  if (isDateKey(f) && isDateKey(t) && f <= t && daysBetween(f, t) + 1 <= MAX_CUSTOM_DAYS) {
    return { from: f, to: t, preset: null, custom: true };
  }
  const n = Number(first(raw.days));
  const r = Number(first(raw.range));
  let days: number = 7;
  if (Number.isInteger(n) && n >= 1 && n <= MAX_RANGE_DAYS) days = n;
  else if ((PRESET_RANGES as readonly number[]).includes(r)) days = r;
  return { from: addDays(end, -(days - 1)), to: end, preset: (PRESET_RANGES as readonly number[]).includes(days) ? days : null, custom: false };
}
