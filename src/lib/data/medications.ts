// ประวัติการใช้ยา ใช้ประเมินเงื่อนไข "หยุดยาเบาหวาน" ของ Remission (คำนวณสดตอนอ่าน จึงไม่ต้องประเมินความเสี่ยงใหม่)
import type { Prisma } from "@prisma/client";
import { RECORD_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole, requireUser } from "@/lib/auth/session";
import { toDateKey, todayInBangkok } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import type { SaveFailure } from "./glucose";
import { dateFromKey } from "./mappers";
import { saveMedicationSchema, stopMedicationSchema, toFieldErrors, voidRecordSchema } from "./schemas";

export type MedicationRow = {
  id: string;
  drugName: string;
  isDiabetesDrug: boolean;
  startDate: string;
  endDate: string | null;
  note: string | null;
  voided: { at: string; byName: string | null; reason: string | null } | null;
};

export type MedicationResult = { ok: true } | SaveFailure;

const SAVE_FAILED: SaveFailure = { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };

function logFailure(label: string, e: unknown) {
  console.error(label, { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
}

export async function listMedications(patientId: string): Promise<MedicationRow[]> {
  await requireUser();
  const rows = await prisma.medicationPeriod.findMany({
    where: { patientId },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, drugName: true, isDiabetesDrug: true, startDate: true, endDate: true, note: true,
      voidedAt: true, voidReason: true, voidedBy: { select: { fullName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    drugName: r.drugName,
    isDiabetesDrug: r.isDiabetesDrug,
    startDate: toDateKey(r.startDate),
    endDate: r.endDate ? toDateKey(r.endDate) : null,
    note: r.note,
    voided: r.voidedAt ? { at: r.voidedAt.toISOString(), byName: r.voidedBy?.fullName ?? null, reason: r.voidReason } : null,
  }));
}

export async function saveMedication(raw: unknown): Promise<MedicationResult> {
  const user = await requireRole(...RECORD_MANAGER_ROLES);
  const parsed = saveMedicationSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const input = parsed.data;
  const today = todayInBangkok();
  if (input.startDate > today) {
    const message = "วันที่เริ่มยาต้องไม่เป็นวันในอนาคต";
    return { ok: false, error: message, fieldErrors: { startDate: message } };
  }
  if (input.endDate && input.endDate > today) {
    const message = "วันที่หยุดยาต้องไม่เป็นวันในอนาคต";
    return { ok: false, error: message, fieldErrors: { endDate: message } };
  }

  try {
    const found = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({ where: { id: input.patientId, deletedAt: null }, select: { id: true } });
      if (!patient) return false;
      const row = await tx.medicationPeriod.create({
        data: {
          patientId: input.patientId,
          drugName: input.drugName,
          isDiabetesDrug: input.isDiabetesDrug,
          startDate: dateFromKey(input.startDate),
          endDate: input.endDate ? dateFromKey(input.endDate) : null,
          note: input.note ?? null,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "CREATE", entity: "medication_period", entityId: row.id, patientId: input.patientId,
          after: {
            drugName: input.drugName, isDiabetesDrug: input.isDiabetesDrug,
            startDate: input.startDate, endDate: input.endDate ?? null,
          } as Prisma.InputJsonValue,
        },
      });
      return true;
    });
    return found ? { ok: true } : { ok: false, error: "ไม่พบผู้ป่วยรายนี้" };
  } catch (e) {
    logFailure("saveMedication failed", e);
    return SAVE_FAILED;
  }
}

export async function stopMedication(raw: unknown): Promise<MedicationResult> {
  const user = await requireRole(...RECORD_MANAGER_ROLES);
  const parsed = stopMedicationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: toFieldErrors(parsed.error).message };
  const { id, endDate } = parsed.data;
  if (endDate > todayInBangkok()) return { ok: false, error: "วันที่หยุดยาต้องไม่เป็นวันในอนาคต" };

  try {
    return await prisma.$transaction(async (tx): Promise<MedicationResult> => {
      const row = await tx.medicationPeriod.findFirst({
        where: { id, voidedAt: null, patient: { deletedAt: null } },
        select: { patientId: true, startDate: true, endDate: true },
      });
      if (!row) return { ok: false, error: "ไม่พบรายการนี้" };
      if (row.endDate) return { ok: false, error: "รายการนี้บันทึกวันที่หยุดยาไว้แล้ว" };
      if (endDate < toDateKey(row.startDate)) return { ok: false, error: "วันที่หยุดยาต้องไม่ก่อนวันที่เริ่มยา" };

      await tx.medicationPeriod.update({ where: { id }, data: { endDate: dateFromKey(endDate) } });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "UPDATE", entity: "medication_period", entityId: id, patientId: row.patientId,
          before: { endDate: null } as Prisma.InputJsonValue,
          after: { endDate } as Prisma.InputJsonValue,
        },
      });
      return { ok: true };
    });
  } catch (e) {
    logFailure("stopMedication failed", e);
    return SAVE_FAILED;
  }
}

export async function voidMedication(raw: unknown): Promise<MedicationResult> {
  const user = await requireRole(...RECORD_MANAGER_ROLES);
  const parsed = voidRecordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: toFieldErrors(parsed.error).message };
  const { id, reason } = parsed.data;

  try {
    return await prisma.$transaction(async (tx): Promise<MedicationResult> => {
      const row = await tx.medicationPeriod.findFirst({
        where: { id, patient: { deletedAt: null } },
        select: { patientId: true, drugName: true, isDiabetesDrug: true, startDate: true, endDate: true, voidedAt: true },
      });
      if (!row) return { ok: false, error: "ไม่พบรายการนี้" };
      if (row.voidedAt) return { ok: false, error: "รายการนี้ถูกยกเลิกไปแล้ว" };

      await tx.medicationPeriod.update({
        where: { id },
        data: { voidedAt: new Date(), voidedById: user.id, voidReason: reason },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "VOID", entity: "medication_period", entityId: id, patientId: row.patientId,
          before: {
            drugName: row.drugName, isDiabetesDrug: row.isDiabetesDrug, startDate: toDateKey(row.startDate),
            endDate: row.endDate ? toDateKey(row.endDate) : null,
          } as Prisma.InputJsonValue,
          after: { voidReason: reason } as Prisma.InputJsonValue,
        },
      });
      return { ok: true };
    });
  } catch (e) {
    logFailure("voidMedication failed", e);
    return SAVE_FAILED;
  }
}
