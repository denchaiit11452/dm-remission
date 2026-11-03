// เพิ่มและแก้ไขข้อมูลทะเบียนผู้ป่วย: ตรวจข้อมูล -> บันทึก -> audit log ในธุรกรรมเดียว
import type { Patient, Prisma } from "@prisma/client";
import { RECORD_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { toDateKey, todayInBangkok } from "@/lib/date";
import {
  EMPTY_PATIENT_FORM, PATIENT_PAST_DATE_FIELDS, changedFields, type PatientFormValues,
} from "@/lib/patient-form";
import { prisma } from "@/lib/prisma";
import type { SaveFailure } from "./glucose";
import { dateFromKey } from "./mappers";
import { patientSchema, toFieldErrors, updatePatientSchema, type PatientInput } from "./schemas";

export type SavePatientResult = { ok: true; id: string } | SaveFailure;

const HN_TAKEN: SaveFailure = {
  ok: false,
  error: "HN นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบก่อนบันทึก",
  fieldErrors: { hn: "HN นี้มีอยู่ในระบบแล้ว" },
};
const SAVE_FAILED: SaveFailure = { ok: false, error: "บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง" };

function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: unknown } | null)?.code === "P2002";
}

function futureDateFailure(input: PatientInput, today: string): SaveFailure | null {
  const fieldErrors: Record<string, string> = {};
  for (const [key, label] of Object.entries(PATIENT_PAST_DATE_FIELDS)) {
    const value = input[key as keyof typeof PATIENT_PAST_DATE_FIELDS];
    if (value && value > today) fieldErrors[key] = `${label}ต้องไม่เป็นวันในอนาคต`;
  }
  const messages = Object.values(fieldErrors);
  return messages.length > 0 ? { ok: false, error: messages[0], fieldErrors } : null;
}

const optionalDate = (key: string | null | undefined) => (key ? dateFromKey(key) : null);

function toPatientData(input: PatientInput) {
  return {
    hn: input.hn,
    prefix: input.prefix ?? null,
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender ?? null,
    birthDate: optionalDate(input.birthDate),
    phone: input.phone ?? null,
    address: input.address ?? null,
    emergencyContactName: input.emergencyContactName ?? null,
    emergencyContactPhone: input.emergencyContactPhone ?? null,
    diabetesType: input.diabetesType,
    diagnosedAt: optionalDate(input.diagnosedAt),
    programStartDate: optionalDate(input.programStartDate),
    notes: input.notes ?? null,
  };
}

function inputToFormValues(input: PatientInput): PatientFormValues {
  return {
    hn: input.hn,
    prefix: input.prefix ?? "",
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender ?? "",
    birthDate: input.birthDate ?? "",
    phone: input.phone ?? "",
    address: input.address ?? "",
    emergencyContactName: input.emergencyContactName ?? "",
    emergencyContactPhone: input.emergencyContactPhone ?? "",
    diabetesType: input.diabetesType,
    diagnosedAt: input.diagnosedAt ?? "",
    programStartDate: input.programStartDate ?? "",
    notes: input.notes ?? "",
  };
}

function rowToFormValues(row: Patient): PatientFormValues {
  return {
    ...EMPTY_PATIENT_FORM,
    hn: row.hn,
    prefix: row.prefix ?? "",
    firstName: row.firstName,
    lastName: row.lastName,
    gender: row.gender ?? "",
    birthDate: row.birthDate ? toDateKey(row.birthDate) : "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    emergencyContactName: row.emergencyContactName ?? "",
    emergencyContactPhone: row.emergencyContactPhone ?? "",
    diabetesType: row.diabetesType,
    diagnosedAt: row.diagnosedAt ? toDateKey(row.diagnosedAt) : "",
    programStartDate: row.programStartDate ? toDateKey(row.programStartDate) : "",
    notes: row.notes ?? "",
  };
}

/** ค่าปัจจุบันสำหรับฟอร์มแก้ไข */
export async function getPatientFormValues(id: string): Promise<PatientFormValues | null> {
  await requireRole(...RECORD_MANAGER_ROLES);
  const row = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  return row ? rowToFormValues(row) : null;
}

export async function createPatient(raw: unknown): Promise<SavePatientResult> {
  const user = await requireRole(...RECORD_MANAGER_ROLES);
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const input = parsed.data;
  const dateFailure = futureDateFailure(input, todayInBangkok());
  if (dateFailure) return dateFailure;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const row = await tx.patient.create({ data: { ...toPatientData(input), createdById: user.id }, select: { id: true } });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "CREATE", entity: "patient", entityId: row.id, patientId: row.id,
          after: inputToFormValues(input) as Prisma.InputJsonValue,
        },
      });
      return row.id;
    });
    return { ok: true, id };
  } catch (e) {
    if (isUniqueViolation(e)) return HN_TAKEN;
    console.error("createPatient failed", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return SAVE_FAILED;
  }
}

export async function updatePatient(raw: unknown): Promise<SavePatientResult> {
  const user = await requireRole(...RECORD_MANAGER_ROLES);
  const parsed = updatePatientSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const { id, ...input } = parsed.data;
  const dateFailure = futureDateFailure(input, todayInBangkok());
  if (dateFailure) return dateFailure;

  try {
    const found = await prisma.$transaction(async (tx) => {
      const existing = await tx.patient.findFirst({ where: { id, deletedAt: null } });
      if (!existing) return false;

      const diff = changedFields(rowToFormValues(existing), inputToFormValues(input));
      if (Object.keys(diff.after).length === 0) return true; // ไม่มีอะไรเปลี่ยน ไม่ต้องเขียน audit

      await tx.patient.update({ where: { id }, data: toPatientData(input) });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "UPDATE", entity: "patient", entityId: id, patientId: id,
          before: diff.before as Prisma.InputJsonValue,
          after: diff.after as Prisma.InputJsonValue,
        },
      });
      return true;
    });
    return found ? { ok: true, id } : { ok: false, error: "ไม่พบผู้ป่วยรายนี้" };
  } catch (e) {
    if (isUniqueViolation(e)) return HN_TAKEN;
    console.error("updatePatient failed", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return SAVE_FAILED;
  }
}
