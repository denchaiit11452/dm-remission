// คำยืนยันของแพทย์ว่าผู้ป่วยไม่เคยใช้ยาเบาหวาน ใช้แทนเงื่อนไขเรื่องยาของ Remission (ยังต้องมี HbA1c ผ่านเกณฑ์)
// Remission คำนวณสดตอนอ่าน จึงไม่ต้องประเมินความเสี่ยงใหม่ ประวัติการยืนยันและการยกเลิกอยู่ใน audit log
import type { Prisma } from "@prisma/client";
import { NO_DRUG_CONFIRMER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { SaveFailure } from "./glucose";
import { noDrugConfirmationSchema, toFieldErrors } from "./schemas";

export type NoDrugResult = { ok: true; patientId: string } | SaveFailure;

const AUDIT_ENTITY = "patient_no_drug_confirmation";

function failed(label: string, e: unknown): SaveFailure {
  console.error(label, { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
  return { ok: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
}

export async function confirmNoDrug(raw: unknown): Promise<NoDrugResult> {
  const user = await requireRole(...NO_DRUG_CONFIRMER_ROLES);
  const parsed = noDrugConfirmationSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const { patientId, reason } = parsed.data;

  try {
    return await prisma.$transaction(async (tx): Promise<NoDrugResult> => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, deletedAt: null },
        select: { noDrugConfirmedAt: true },
      });
      if (!patient) return { ok: false, error: "ไม่พบผู้ป่วยรายนี้" };
      if (patient.noDrugConfirmedAt) return { ok: false, error: "ผู้ป่วยรายนี้มีคำยืนยันอยู่แล้ว" };

      const drugs = await tx.medicationPeriod.count({ where: { patientId, isDiabetesDrug: true, voidedAt: null } });
      if (drugs > 0) return { ok: false, error: "ผู้ป่วยมีรายการยาเบาหวานในประวัติ จึงยืนยันว่าไม่เคยใช้ยาไม่ได้" };

      await tx.patient.update({
        where: { id: patientId },
        data: { noDrugConfirmedAt: new Date(), noDrugConfirmedById: user.id, noDrugConfirmReason: reason },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "UPDATE", entity: AUDIT_ENTITY, entityId: patientId, patientId,
          after: { confirmed: true, reason } as Prisma.InputJsonValue,
        },
      });
      return { ok: true, patientId };
    });
  } catch (e) {
    return failed("confirmNoDrug failed", e);
  }
}

export async function cancelNoDrugConfirmation(raw: unknown): Promise<NoDrugResult> {
  const user = await requireRole(...NO_DRUG_CONFIRMER_ROLES);
  const parsed = noDrugConfirmationSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const { patientId, reason } = parsed.data;

  try {
    return await prisma.$transaction(async (tx): Promise<NoDrugResult> => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, deletedAt: null },
        select: { noDrugConfirmedAt: true, noDrugConfirmedById: true, noDrugConfirmReason: true },
      });
      if (!patient) return { ok: false, error: "ไม่พบผู้ป่วยรายนี้" };
      if (!patient.noDrugConfirmedAt) return { ok: false, error: "ผู้ป่วยรายนี้ไม่มีคำยืนยันให้ยกเลิก" };

      await tx.patient.update({
        where: { id: patientId },
        data: { noDrugConfirmedAt: null, noDrugConfirmedById: null, noDrugConfirmReason: null },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id, action: "UPDATE", entity: AUDIT_ENTITY, entityId: patientId, patientId,
          before: {
            confirmedAt: patient.noDrugConfirmedAt.toISOString(),
            confirmedById: patient.noDrugConfirmedById,
            reason: patient.noDrugConfirmReason,
          } as Prisma.InputJsonValue,
          after: { confirmed: false, cancelReason: reason } as Prisma.InputJsonValue,
        },
      });
      return { ok: true, patientId };
    });
  } catch (e) {
    return failed("cancelNoDrugConfirmation failed", e);
  }
}
