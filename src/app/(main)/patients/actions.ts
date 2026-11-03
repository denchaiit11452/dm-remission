"use server";

// Server Actions ของข้อมูลผู้ป่วย ผลตรวจ และยา (การตรวจสิทธิ์และตรวจข้อมูลอยู่ในชั้น src/lib/data)
import { revalidatePath } from "next/cache";
import { saveLabRecord } from "@/lib/data/labs";
import { saveMedication, stopMedication, voidMedication } from "@/lib/data/medications";
import { createPatient, updatePatient } from "@/lib/data/patient-store";
import { voidGlucoseReading, voidLabRecord } from "@/lib/data/void-record";

export async function createPatientAction(raw: unknown) {
  const result = await createPatient(raw);
  if (result.ok) revalidatePath("/patients");
  return result;
}

export async function updatePatientAction(raw: unknown) {
  const result = await updatePatient(raw);
  if (result.ok) {
    revalidatePath("/patients");
    revalidatePath(`/patients/${result.id}`);
  }
  return result;
}

export async function saveLabAction(raw: unknown) {
  const result = await saveLabRecord(raw);
  if (result.ok) revalidatePath("/alerts");
  return result;
}

export async function saveMedicationAction(raw: unknown) {
  return saveMedication(raw);
}

// การยกเลิกไม่เรียก revalidatePath โดยตั้งใจ: กล่องต้องแสดงผลลัพธ์ก่อน แล้วค่อยรีเฟรชหน้าเมื่อผู้ใช้ปิดกล่อง
export async function voidGlucoseAction(raw: unknown) {
  return voidGlucoseReading(raw);
}

export async function voidLabAction(raw: unknown) {
  return voidLabRecord(raw);
}

export async function voidMedicationAction(raw: unknown) {
  return voidMedication(raw);
}

export async function stopMedicationAction(raw: unknown) {
  return stopMedication(raw);
}
