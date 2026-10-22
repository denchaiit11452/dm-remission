// ตัวช่วยเรื่อง "วันที่" ของระบบ
//
// หลักการ: ตรรกะทางคลินิกทั้งหมดใช้วันที่เป็นข้อความรูปแบบ "YYYY-MM-DD" (เรียกว่า date key)
// ไม่ใช้ Date โดยตรง เพื่อตัดปัญหาเขตเวลา (ไทย = UTC+7) ที่ทำให้วันที่เลื่อนผิดวันได้
//
// - ค่าจากคอลัมน์ @db.Date ของ Prisma (เช่น measuredDate, recordedDate) ใช้ toDateKey()
// - ค่าที่เป็น timestamp (เช่น createdAt) หรือ "วันนี้" ใช้ toBangkokDateKey() / todayInBangkok()

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

function parseDateKey(key: string): number {
  if (!DATE_KEY_PATTERN.test(key)) {
    throw new Error(`รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD): ${key}`);
  }
  const [year, month, day] = key.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  // กันวันที่ที่ไม่มีจริง เช่น 2026-02-31
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`วันที่ไม่มีอยู่จริง: ${key}`);
  }
  return ms;
}

/** แปลงค่าจากคอลัมน์ @db.Date (Prisma คืนเป็น 00:00 UTC) เป็น date key */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** แปลง timestamp ใด ๆ เป็นวันที่ตามเวลาประเทศไทย */
export function toBangkokDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "วันนี้" ตามเวลาประเทศไทย */
export function todayInBangkok(now: Date = new Date()): string {
  return toBangkokDateKey(now);
}

/** จำนวนวันจาก from ถึง to (to ช้ากว่า from = ค่าบวก) */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDateKey(to) - parseDateKey(from)) / MS_PER_DAY);
}

export function addDays(key: string, days: number): string {
  return new Date(parseDateKey(key) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** วันที่ล่าสุดในรายการ (คืน null ถ้าไม่มีรายการ) */
export function maxDateKey(keys: string[]): string | null {
  if (keys.length === 0) return null;
  return keys.reduce((latest, key) => (key > latest ? key : latest));
}
