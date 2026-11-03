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

/** วันที่เหล่านี้เกิดขึ้นแล้วเท่านั้น จึงห้ามเป็นวันในอนาคต */
export const PATIENT_PAST_DATE_FIELDS = {
  birthDate: "วันเกิด",
  diagnosedAt: "วันที่วินิจฉัย",
  programStartDate: "วันที่เริ่มโปรแกรม",
} as const;

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
