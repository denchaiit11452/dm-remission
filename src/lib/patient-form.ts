// ตัวช่วยของฟอร์มข้อมูลผู้ป่วย (ฟังก์ชันล้วน ทดสอบได้)
import type { DiabetesType } from "@prisma/client";

export const DIABETES_TYPE_LABELS: Record<DiabetesType, string> = {
  TYPE1: "เบาหวานชนิดที่ 1",
  TYPE2: "เบาหวานชนิดที่ 2",
  OTHER: "ชนิดอื่น",
  UNKNOWN: "ยังไม่ระบุ",
};

/** ค่าของฟอร์มเก็บเป็นข้อความทั้งหมด ("" = ไม่ได้กรอก) */
export type PatientFormValues = {
  hn: string;
  prefix: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  diabetesType: string;
  diagnosedAt: string;
  programStartDate: string;
  notes: string;
};

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  hn: "", prefix: "", firstName: "", lastName: "", gender: "", birthDate: "", phone: "", address: "",
  emergencyContactName: "", emergencyContactPhone: "", diabetesType: "UNKNOWN", diagnosedAt: "", programStartDate: "", notes: "",
};

/** จำนวนตัวอักษรสูงสุดของแต่ละช่อง ใช้ทั้งข้อความบอกผู้กรอกและการตรวจฝั่ง server */
export const PATIENT_FIELD_LIMITS = {
  hn: 7,
  prefix: 30,
  firstName: 100,
  lastName: 100,
  phone: 10,
  address: 500,
  emergencyContactName: 200,
  emergencyContactPhone: 10,
  notes: 2000,
} as const;

/**
 * เหลือเฉพาะเลข 0-9 แล้วค่อยตัดความยาว
 * ไม่ใช้ maxLength เพราะเบราว์เซอร์จะตัดตอนวางก่อน "081-234-5678" จึงเหลือเลขไม่ครบ
 */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, PATIENT_FIELD_LIMITS.phone);
}

/** เหลือเฉพาะเลข 0-9 ก่อนตัดความยาว ช่องว่างที่ติดมาตอนวางจึงไม่ทำให้เลขท้ายของ HN หายไป */
export function sanitizeHnInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, PATIENT_FIELD_LIMITS.hn);
}

/** วันที่เหล่านี้เกิดขึ้นแล้วเท่านั้น จึงห้ามเป็นวันในอนาคต */
export const PATIENT_PAST_DATE_FIELDS = {
  birthDate: "วันเกิด",
  diagnosedAt: "วันที่วินิจฉัย",
  programStartDate: "วันที่เริ่มโปรแกรม",
} as const;

/** ช่องที่ server บังคับกรอก (ตรงกับ patientSchema) ช่องอื่นเติมภายหลังได้ */
export const REQUIRED_PATIENT_FIELDS = [
  { name: "hn", label: "HN", missing: "กรุณากรอก HN" },
  { name: "firstName", label: "ชื่อ", missing: "กรุณากรอกชื่อ" },
  { name: "lastName", label: "นามสกุล", missing: "กรุณากรอกนามสกุล" },
] as const;

/** ชื่อช่องตามลำดับที่เห็นบนฟอร์ม รายการแจ้งเตือนจึงเรียงตรงกับหน้าจอ */
const PATIENT_FIELD_LABELS: Record<keyof PatientFormValues, string> = {
  hn: "HN",
  prefix: "คำนำหน้า",
  firstName: "ชื่อ",
  lastName: "นามสกุล",
  gender: "เพศ",
  birthDate: "วันเกิด",
  phone: "เบอร์โทรศัพท์",
  emergencyContactName: "ชื่อผู้ติดต่อฉุกเฉิน",
  emergencyContactPhone: "เบอร์ผู้ติดต่อฉุกเฉิน",
  address: "ที่อยู่",
  diabetesType: "ชนิดเบาหวาน",
  diagnosedAt: "วันที่วินิจฉัย",
  programStartDate: "วันที่เริ่มโปรแกรม",
  notes: "หมายเหตุ",
};

export type PatientFormIssue = {
  name: keyof PatientFormValues;
  label: string;
  kind: "missing" | "invalid";
  message: string;
};

function identifierMessage(name: "hn" | "phone" | "emergencyContactPhone", value: string): string | null {
  if (!/^\d+$/.test(value)) return name === "hn" ? "HN ต้องเป็นตัวเลขเท่านั้น" : `${PATIENT_FIELD_LABELS[name]}ต้องเป็นตัวเลขเท่านั้น`;
  if (name === "hn") return value.length > PATIENT_FIELD_LIMITS.hn ? `HN ต้องไม่เกิน ${PATIENT_FIELD_LIMITS.hn} หลัก` : null;
  const digits = PATIENT_FIELD_LIMITS[name];
  return value.length === digits ? null : `ต้องครบ ${digits} หลัก ตอนนี้มี ${value.length} หลัก`;
}

function sortIssues(issues: PatientFormIssue[]): PatientFormIssue[] {
  const order = Object.keys(PATIENT_FIELD_LABELS);
  return [...issues].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
}

/**
 * ตรวจฟอร์มก่อนส่งเพื่อบอกปัญหาได้ครบทุกช่องทันที ใช้กฎเดียวกับ patientSchema โดยไม่ดึง zod มาไว้ฝั่ง browser
 * (มีเทสต์ยืนยันว่าสองฝั่งตรงกัน และ server ยังตรวจซ้ำเสมอ)
 * ส่ง initial มาเมื่อเป็นการแก้ไข: HN และเบอร์เก่าที่ไม่ได้เปลี่ยนจะไม่ถูกตรวจ เช่นเดียวกับฝั่ง server
 */
export function validatePatientForm(values: PatientFormValues, { today, initial }: { today: string; initial?: PatientFormValues }): PatientFormIssue[] {
  const issues: PatientFormIssue[] = [];
  const invalid = (name: keyof PatientFormValues, message: string) =>
    issues.push({ name, label: PATIENT_FIELD_LABELS[name], kind: "invalid", message });

  for (const field of REQUIRED_PATIENT_FIELDS) {
    if (values[field.name].trim() === "") {
      issues.push({ name: field.name, label: field.label, kind: "missing", message: field.missing });
    }
  }
  for (const name of ["hn", "phone", "emergencyContactPhone"] as const) {
    const value = values[name].trim();
    if (value === "" || value === initial?.[name].trim()) continue;
    const message = identifierMessage(name, value);
    if (message) invalid(name, message);
  }
  for (const [name, label] of Object.entries(PATIENT_PAST_DATE_FIELDS)) {
    const value = values[name as keyof typeof PATIENT_PAST_DATE_FIELDS];
    if (value && value > today) invalid(name as keyof typeof PATIENT_PAST_DATE_FIELDS, `${label}ต้องไม่เป็นวันในอนาคต`);
  }
  return sortIssues(issues);
}

/** แปลงข้อผิดพลาดรายช่องจาก server เช่น HN ซ้ำ ให้แสดงในรายการเดียวกัน ช่องที่ฟอร์มไม่รู้จักจะถูกข้าม */
export function issuesFromFieldErrors(fieldErrors: Record<string, string>): PatientFormIssue[] {
  const issues = Object.entries(fieldErrors).flatMap(([name, message]): PatientFormIssue[] =>
    name in PATIENT_FIELD_LABELS
      ? [{ name: name as keyof PatientFormValues, label: PATIENT_FIELD_LABELS[name as keyof PatientFormValues], kind: "invalid", message }]
      : [],
  );
  return sortIssues(issues);
}

/** ช่องบังคับแต่ละช่องกรอกแล้วหรือยัง ช่องที่มีแต่ช่องว่างถือว่ายังไม่กรอก */
export function requiredFieldStatus(values: PatientFormValues) {
  return REQUIRED_PATIENT_FIELDS.map((field) => ({ ...field, filled: values[field.name].trim() !== "" }));
}

/** แปลงค่าจากฟอร์มเป็นข้อมูลส่งเข้า server: ช่องว่างกลายเป็น null */
export function toPatientPayload(values: PatientFormValues): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim() === "" ? null : value]),
  );
}

/** เก็บเฉพาะช่องที่เปลี่ยน สำหรับ audit log (ไม่เก็บข้อมูลส่วนบุคคลเกินจำเป็น) */
export function changedFields(
  before: PatientFormValues,
  after: PatientFormValues,
): { before: Partial<PatientFormValues>; after: Partial<PatientFormValues> } {
  const changedBefore: Partial<PatientFormValues> = {};
  const changedAfter: Partial<PatientFormValues> = {};
  for (const key of Object.keys(before) as (keyof PatientFormValues)[]) {
    if (before[key] !== after[key]) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }
  return { before: changedBefore, after: changedAfter };
}
