// ช่วงเวลาของหน้าภาพรวม: อ่าน/สร้างพารามิเตอร์ใน URL จุดบนกราฟ และตารางปฏิทิน (ฟังก์ชันล้วน ทดสอบได้)
import { addDays, daysBetween } from "@/lib/date";
import { formatThaiDate } from "@/lib/format";

export const RANGE_PRESETS = ["3m", "6m", "12m"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  "3m": "3 เดือน",
  "6m": "6 เดือน",
  "12m": "12 เดือน",
};

const DEFAULT_PRESET: RangePreset = "12m";
const PRESET_MONTHS: Record<RangePreset, number> = { "3m": 3, "6m": 6, "12m": 12 };

/** ไม่รับวันที่เก่ากว่านี้จาก URL กันการสร้างจุดบนกราฟจำนวนมากจากค่าที่พิมพ์ผิด */
const EARLIEST_ALLOWED = "2000-01-01";

export type DashboardRange = {
  /** null = ผู้ใช้เลือกวันที่เอง */
  preset: RangePreset | null;
  from: string;
  to: string;
};

export type Granularity = "day" | "week" | "month";

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isValidDateKey(key: string | undefined): key is string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function toKey(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/** เลื่อนเดือน ถ้าเดือนปลายทางไม่มีวันนั้นให้ใช้วันสุดท้ายของเดือน เช่น 31 ต.ค. ย้อน 1 เดือน = 30 ก.ย. */
export function addMonths(key: string, months: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  return toKey(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

/** 12 เดือนเริ่มต้นวันที่ 1 เพื่อให้กราฟรายเดือนมีครบ 12 เดือนไม่ซ้ำเดือน */
export function presetRange(preset: RangePreset, today: string): DashboardRange {
  const months = PRESET_MONTHS[preset];
  const from = preset === "12m" ? startOfMonth(addMonths(today, -(months - 1))) : addDays(addMonths(today, -months), 1);
  return { preset, from, to: today };
}

/** ค่าที่ไม่ถูกต้องจะกลับไปใช้ค่าเริ่มต้นแทนการแสดงข้อผิดพลาด วันสิ้นสุดในอนาคตจะถูกปรับเป็นวันนี้ */
export function parseDashboardRange(raw: RawParams, today: string): DashboardRange {
  const preset = RANGE_PRESETS.find((p) => p === first(raw.range));
  if (preset) return presetRange(preset, today);

  const from = first(raw.from);
  const rawTo = first(raw.to);
  if (isValidDateKey(from) && isValidDateKey(rawTo) && from >= EARLIEST_ALLOWED) {
    const to = rawTo > today ? today : rawTo;
    if (from <= to) return { preset: null, from, to };
  }
  return presetRange(DEFAULT_PRESET, today);
}

/** ค่าเริ่มต้นไม่ใส่ใน URL เพื่อให้ลิงก์สั้น */
export function buildRangeQuery(range: Pick<DashboardRange, "preset" | "from" | "to">): string {
  if (range.preset === DEFAULT_PRESET) return "";
  const params = new URLSearchParams();
  if (range.preset) params.set("range", range.preset);
  else {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  return `?${params.toString()}`;
}

/** นับรวมทั้งวันเริ่มต้นและวันสิ้นสุด */
export function inclusiveDays(from: string, to: string): number {
  return daysBetween(from, to) + 1;
}

/** ไม่เกิน 31 วันแสดงรายวัน ไม่เกิน 6 เดือนแสดงรายสัปดาห์ เกินนั้นแสดงรายเดือน */
export function rangeGranularity(from: string, to: string): Granularity {
  const days = inclusiveDays(from, to);
  if (days <= 31) return "day";
  if (days <= 186) return "week";
  return "month";
}

/** วันที่ของแต่ละจุดบนกราฟ จุดสุดท้ายเป็นวันสิ้นสุดของช่วงเสมอ */
export function trendDates(from: string, to: string): string[] {
  const granularity = rangeGranularity(from, to);
  const dates: string[] = [];
  if (granularity === "month") {
    let cursor = startOfMonth(from);
    while (cursor <= to) {
      const [year, month] = cursor.split("-").map(Number);
      const monthEnd = toKey(year, month - 1, daysInMonth(year, month - 1));
      if (monthEnd < to) dates.push(monthEnd);
      cursor = addMonths(cursor, 1);
    }
  } else {
    const step = granularity === "day" ? 1 : 7;
    for (let cursor = from; cursor < to; cursor = addDays(cursor, step)) dates.push(cursor);
  }
  dates.push(to);
  return dates;
}

/** ป้ายใต้กราฟ: รายเดือนเป็นชื่อเดือน (ถ้าเกิน 12 จุดเติมปี พ.ศ. 2 หลัก) นอกนั้นเป็นวันและเดือน */
export function trendLabel(date: string, granularity: Granularity, pointCount: number): string {
  const [day, month, year] = formatThaiDate(date).split(" ");
  if (granularity !== "month") return `${day} ${month}`;
  return pointCount > 12 ? `${month} ${year.slice(2)}` : month;
}

/** จุดเทียบของตารางตัวชี้วัด: ช่วงที่เลือกเองเทียบต้นช่วง ปุ่มเดือนเทียบ 6 เดือนก่อน */
export function comparisonOf(range: DashboardRange): { date: string; label: string } {
  return range.preset === null
    ? { date: range.from, label: "เทียบต้นช่วง" }
    : { date: addMonths(range.to, -6), label: "เทียบ 6 เดือนก่อน" };
}

// ---------------------------------------------------------------- ปฏิทิน
export const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const THAI_WEEKDAYS_SHORT = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** ตารางวันของเดือน แถวละ 7 วัน เริ่มวันอาทิตย์ ช่องว่างเป็น null */
export function monthGrid(monthKey: string): (string | null)[][] {
  const [year, month] = monthKey.split("-").map(Number);
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= daysInMonth(year, month - 1); day++) cells.push(toKey(year, month - 1, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthTitle(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${THAI_MONTHS_FULL[month - 1]} ${year + 543}`;
}

export type RangeDraft = { from: string | null; to: string | null };

/** กดครั้งแรกคือวันเริ่มต้น กดครั้งที่สองคือวันสิ้นสุด กดวันก่อนวันเริ่มต้นจะเริ่มเลือกใหม่จากวันนั้น */
export function nextDraft(draft: RangeDraft, clicked: string): RangeDraft {
  if (draft.from === null || draft.to !== null || clicked < draft.from) return { from: clicked, to: null };
  return { from: draft.from, to: clicked };
}
