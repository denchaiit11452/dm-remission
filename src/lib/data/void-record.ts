// ยกเลิกค่าน้ำตาลหรือผลตรวจ (ไม่ลบจริง): ทำเครื่องหมาย -> ยกเลิก Alert ที่เกิดจากค่านั้น -> ประเมินระดับใหม่ -> audit log
// ทั้งหมดอยู่ในธุรกรรมเดียว
import type { Prisma } from "@prisma/client";
import { RECORD_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { toDateKey, todayInBangkok } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import type { RiskLevel } from "@/lib/risk/types";
import { NoActiveRuleSetError, getActiveRuleSet, recomputeRisk, type Tx } from "./risk-service";
import { toFieldErrors, voidRecordSchema } from "./schemas";

export type VoidResult =
  | { ok: true; alertsCancelled: number; levelAfter: RiskLevel | null }
  | { ok: false; error: string };

export type VoidCoreResult =
  | { kind: "voided"; alertsCancelled: number; levelAfter: RiskLevel | null }
  | { kind: "not_found" }
  | { kind: "already" };

type VoidParams = {
  userId: string;
  id: string;
  reason: string;
  now: Date;
  /** ประเมินระดับใหม่หลังยกเลิก (คืน null เมื่อไม่เหลือข้อมูลให้ประเมิน) */
  recompute: (patientId: string) => Promise<RiskLevel | null>;
};

type VoidSource = {
  entity: "glucose_reading" | "lab_record";
  alertSource: { glucoseReadingId: string } | { labRecordId: string };
  patientId: string;
  snapshot: Prisma.InputJsonValue;
  markVoided: () => Promise<{ count: number }>;
};

async function finishVoid(tx: Tx, p: VoidParams, source: VoidSource): Promise<VoidCoreResult> {
  const marked = await source.markVoided();
  if (marked.count === 0) return { kind: "already" }; // มีผู้อื่นยกเลิกไปก่อนหน้านี้ไม่กี่วินาที

  // รายการที่ดำเนินการแล้ว (DONE) คงไว้เป็นประวัติการดูแลจริง
  const cancelled = await tx.alert.updateMany({
    where: { ...source.alertSource, status: { in: ["NEW", "ACKNOWLEDGED"] } },
    data: { status: "CANCELLED" },
  });
  const levelAfter = await p.recompute(source.patientId);

  await tx.auditLog.create({
    data: {
      userId: p.userId, action: "VOID", entity: source.entity, entityId: p.id, patientId: source.patientId,
      before: source.snapshot,
      after: { voidReason: p.reason, alertsCancelled: cancelled.count, levelAfter } as Prisma.InputJsonValue,
    },
  });
  return { kind: "voided", alertsCancelled: cancelled.count, levelAfter };
}

export async function voidGlucoseCore(tx: Tx, p: VoidParams): Promise<VoidCoreResult> {
  const row = await tx.glucoseReading.findFirst({
    where: { id: p.id, patient: { deletedAt: null } },
    select: { patientId: true, measuredDate: true, period: true, valueMgDl: true, meterFlag: true, voidedAt: true },
  });
  if (!row) return { kind: "not_found" };
  if (row.voidedAt) return { kind: "already" };

  return finishVoid(tx, p, {
    entity: "glucose_reading",
    alertSource: { glucoseReadingId: p.id },
    patientId: row.patientId,
    snapshot: { measuredDate: toDateKey(row.measuredDate), period: row.period, valueMgDl: row.valueMgDl, meterFlag: row.meterFlag },
    markVoided: () => tx.glucoseReading.updateMany({
      where: { id: p.id, voidedAt: null },
      data: { voidedAt: p.now, voidedById: p.userId, voidReason: p.reason },
    }),
  });
}

export async function voidLabCore(tx: Tx, p: VoidParams): Promise<VoidCoreResult> {
  const row = await tx.labRecord.findFirst({
    where: { id: p.id, patient: { deletedAt: null } },
    select: { patientId: true, recordedDate: true, hba1c: true, fbs: true, weightKg: true, heightCm: true, bmi: true, sbp: true, dbp: true, voidedAt: true },
  });
  if (!row) return { kind: "not_found" };
  if (row.voidedAt) return { kind: "already" };

  return finishVoid(tx, p, {
    entity: "lab_record",
    alertSource: { labRecordId: p.id },
    patientId: row.patientId,
    snapshot: {
      recordedDate: toDateKey(row.recordedDate), hba1c: row.hba1c, fbs: row.fbs, weightKg: row.weightKg, heightCm: row.heightCm,
      bmi: row.bmi, sbp: row.sbp, dbp: row.dbp,
    },
    markVoided: () => tx.labRecord.updateMany({
      where: { id: p.id, voidedAt: null },
      data: { voidedAt: p.now, voidedById: p.userId, voidReason: p.reason },
    }),
  });
}

async function runVoid(raw: unknown, core: (tx: Tx, p: VoidParams) => Promise<VoidCoreResult>): Promise<VoidResult> {
  const user = await requireRole(...RECORD_MANAGER_ROLES);
  const parsed = voidRecordSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: toFieldErrors(parsed.error).message };
  const today = todayInBangkok();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const active = await getActiveRuleSet(tx);
        return core(tx, {
          userId: user.id, id: parsed.data.id, reason: parsed.data.reason, now: new Date(),
          recompute: async (patientId) => (await recomputeRisk(tx, patientId, active, today)).level,
        });
      },
      { timeout: 15_000 },
    );
    if (result.kind === "not_found") return { ok: false, error: "ไม่พบรายการนี้" };
    if (result.kind === "already") return { ok: false, error: "รายการนี้ถูกยกเลิกไปแล้ว" };
    return { ok: true, alertsCancelled: result.alertsCancelled, levelAfter: result.levelAfter };
  } catch (e) {
    if (e instanceof NoActiveRuleSetError) return { ok: false, error: "ยังไม่มีชุดเกณฑ์ความเสี่ยง กรุณาแจ้งผู้ดูแลระบบ" };
    console.error("void record failed", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return { ok: false, error: "ยกเลิกรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}

export function voidGlucoseReading(raw: unknown): Promise<VoidResult> {
  return runVoid(raw, voidGlucoseCore);
}

export function voidLabRecord(raw: unknown): Promise<VoidResult> {
  return runVoid(raw, voidLabCore);
}
