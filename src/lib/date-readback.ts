// อ่านวันที่ที่กรอกกลับเป็นภาษาไทย (พ.ศ.) ช่องวันที่ของเบราว์เซอร์มักแสดงเป็น ค.ศ.
// ผู้กรอกจึงเห็นทันทีว่าปีที่เลือกถูกหรือไม่ ใช้ทั้งใต้ช่องวันที่และบนแฟ้มผู้ป่วย
import { ageInYears } from "@/lib/data/view";
import { formatThaiDate } from "@/lib/format";

export type DateReadback = { text: string; warn?: boolean };

/** เกินอายุนี้มักเป็นปีที่ยังพิมพ์ไม่จบ จึงยังไม่แสดงอายุ (ใช้แสดงผลเท่านั้น ไม่ใช่เกณฑ์ตรวจข้อมูล) */
const MAX_DISPLAYED_AGE = 130;

const FUTURE_DATE_NOTE = "เป็นวันในอนาคต";

/** วันที่ที่ต้องเกิดขึ้นแล้ว ถ้าเป็นวันในอนาคตให้เตือนเป็นคำ ไม่ใช่สีอย่างเดียว */
export function pastDateReadback(value: string, today: string): DateReadback | null {
  if (!value) return null;
  const date = formatThaiDate(value);
  if (date === "-") return null; // ยังพิมพ์ไม่ครบเป็นวันที่
  return value > today ? { text: `${date} ${FUTURE_DATE_NOTE}`, warn: true } : { text: date };
}

/** วันเกิด: เหมือนวันที่ทั่วไป และต่อท้ายอายุ */
export function birthDateReadback(value: string, today: string): DateReadback | null {
  const date = pastDateReadback(value, today);
  if (!date || date.warn) return date;
  const age = ageInYears(value, today);
  return age !== null && age <= MAX_DISPLAYED_AGE ? { text: `${date.text} อายุ ${age} ปี` } : date;
}
