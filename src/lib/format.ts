// ตัวช่วยจัดรูปแบบข้อความสำหรับหน้าจอ (ฟังก์ชันล้วน ทดสอบได้)
import type { ProgramStatus } from "@prisma/client";
import { GLUCOSE_PERIOD_LABELS } from "@/lib/risk/levels";
import type { GlucosePeriod, MeterFlag } from "@/lib/risk/types";

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  IN_PROGRAM: "กำลังเข้าโปรแกรม",
  REMISSION: "อยู่ในภาวะสงบ",
  LOST_REMISSION: "หลุดจากภาวะสงบ",
  DISCHARGED: "ออกจากโปรแกรม",
};

/** "2026-10-14" -> "14 ต.ค. 2569" (ไม่ผ่าน Date จึงไม่มีปัญหาเขตเวลา) */
export function formatThaiDate(dateKey: string | null | undefined): string {
  if (!dateKey) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateKey);
  if (!m) return "-";
  const month = THAI_MONTHS_SHORT[Number(m[2]) - 1];
  if (!month) return "-";
  return `${Number(m[3])} ${month} ${Number(m[1]) + 543}`;
}

export function periodLabel(period: GlucosePeriod): string {
  return GLUCOSE_PERIOD_LABELS[period];
}

/** ค่าน้ำตาลที่แสดง: ตัวเลข mg/dL หรือ LO / HI ตามที่เครื่อง DTX แสดง */
export function formatGlucoseValue(valueMgDl: number | null, meterFlag: MeterFlag): { text: string; unit: string | null } {
  if (meterFlag === "METER_LOW") return { text: "LO", unit: null };
  if (meterFlag === "METER_HIGH") return { text: "HI", unit: null };
  if (valueMgDl === null) return { text: "-", unit: null };
  return { text: String(valueMgDl), unit: "mg/dL" };
}

/** "แสดง 1–7 จาก 248 ราย" (ไม่มีรายการ = "ไม่พบผู้ป่วย") */
export function formatRange(page: number, pageSize: number, total: number): string {
  if (total === 0) return "ไม่พบผู้ป่วย";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `แสดง ${from}–${to} จาก ${total} ราย`;
}

export const GENDER_LABELS: Record<"MALE" | "FEMALE" | "OTHER", string> = { MALE: "ชาย", FEMALE: "หญิง", OTHER: "อื่น ๆ" };

/** "8–14 ต.ค. 2569" (เดือนเดียวกัน) หรือ "28 ก.ย. 2569 – 4 ต.ค. 2569" */
export function formatThaiRange(from: string, to: string): string {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!a || !b) return "-";
  if (a[1] === b[1] && a[2] === b[2]) {
    const end = formatThaiDate(to);
    return `${Number(a[3])}–${end}`;
  }
  return `${formatThaiDate(from)} – ${formatThaiDate(to)}`;
}

/** อายุข้อมูลเป็นข้อความ: 0 = วันนี้, 1 = 1 วันที่แล้ว */
export function formatAgo(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "วันนี้";
  return `${days} วันที่แล้ว`;
}
