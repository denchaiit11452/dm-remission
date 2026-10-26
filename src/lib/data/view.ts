// ฟังก์ชันล้วนสำหรับเตรียมข้อมูลแสดงผล (ไม่ต่อฐานข้อมูล ทดสอบได้)
import { daysBetween } from "@/lib/date";

export function fullName(p: { prefix?: string | null; firstName: string; lastName: string }): string {
  return [p.prefix, p.firstName, p.lastName].filter((x): x is string => !!x && x.trim() !== "").join(" ");
}

/** BMI = น้ำหนัก (กก.) / ส่วนสูง (ม.)^2 ปัดทศนิยม 1 ตำแหน่ง (ไม่มีน้ำหนักหรือส่วนสูง = null) */
export function computeBmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** อายุเต็มปี ณ วันที่ today (date key ทั้งคู่) */
export function ageInYears(birthKey: string, todayKey: string): number {
  const [by, bm, bd] = birthKey.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return Math.max(0, age);
}

/**
 * ความสดของข้อมูลน้ำตาล: นับวันจากวันที่วัดล่าสุด ถ้าเก่ากว่า staleDays ถือว่าเก่า
 * ไม่มีค่าน้ำตาลเลยแต่มีระดับ (มาจากความดัน) ถือว่าเก่า (ตรงกับ computeCurrentRisk)
 */
export function glucoseFreshness(
  glucoseDate: string | null,
  today: string,
  staleDays: number,
  hasLevel: boolean,
): { ageDays: number | null; isStale: boolean } {
  if (glucoseDate === null) return { ageDays: null, isStale: hasLevel };
  const ageDays = daysBetween(glucoseDate, today);
  return { ageDays, isStale: ageDays > staleDays };
}
