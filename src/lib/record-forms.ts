// แปลงค่าจากฟอร์มผลตรวจและยาเป็นข้อมูลส่งเข้า server (ฟังก์ชันล้วน ทดสอบได้)
import type { MedicationPeriodInput } from "@/lib/remission/remission";

/** "" = ไม่ได้กรอก, ข้อความที่ไม่ใช่ตัวเลขคืน NaN เพื่อให้ขั้นตรวจข้อมูลแจ้งเตือน ไม่ทิ้งค่าเงียบ ๆ */
export function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export type LabFormValues = {
  recordedDate: string;
  hba1c: string;
  fbs: string;
  weightKg: string;
  heightCm: string;
  sbp: string;
  dbp: string;
  note: string;
};

export function toLabPayload(patientId: string, v: LabFormValues) {
  return {
    patientId,
    recordedDate: v.recordedDate,
    hba1c: parseOptionalNumber(v.hba1c),
    fbs: parseOptionalNumber(v.fbs),
    weightKg: parseOptionalNumber(v.weightKg),
    heightCm: parseOptionalNumber(v.heightCm),
    sbp: parseOptionalNumber(v.sbp),
    dbp: parseOptionalNumber(v.dbp),
    note: v.note.trim() === "" ? null : v.note,
  };
}

/** ข้อความสถานะของยาในรายการ (endDate = วันแรกที่ไม่ได้ใช้ยาแล้ว ตรงกับ assessRemission) */
export function medicationStatus(m: Pick<MedicationPeriodInput, "endDate">, today: string): "ACTIVE" | "STOPPED" {
  return m.endDate === null || today < m.endDate ? "ACTIVE" : "STOPPED";
}
