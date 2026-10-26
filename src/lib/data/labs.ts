// บันทึกผลตรวจตามนัด: HbA1c, น้ำหนัก/ส่วนสูง/BMI, ความดันโลหิต
// ความดันวิกฤต (SBP >= เกณฑ์ หรือ DBP >= เกณฑ์) สร้าง Alert ทันที และประเมินความเสี่ยงใหม่
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import type { RiskLevel } from "@/lib/risk/types";
import { dateFromKey, toBloodPressureInput } from "./mappers";
import {
  NoActiveRuleSetError, createBloodPressureAlert, getActiveRuleSet, recomputeRisk, type ActiveRuleSet, type Tx,
} from "./risk-service";
import { saveLabSchema, toFieldErrors, type SaveLabInput } from "./schemas";
import type { SaveFailure } from "./glucose";
import { computeBmi } from "./view";

export type SaveLabData = {
  recordId: string;
  levelBefore: RiskLevel | null;
  levelAfter: RiskLevel | null;
  alertsCreated: number;
  newAlertTotal: number;
};
export type SaveLabResult = { ok: true; data: SaveLabData } | SaveFailure;

class PatientNotFoundError extends Error {
  constructor() { super("ไม่พบผู้ป่วย"); this.name = "PatientNotFoundError"; }
}

export async function saveLabCore(
  tx: Tx,
  p: { userId: string; input: SaveLabInput; recordedOn: string; today: string; active: ActiveRuleSet },
): Promise<SaveLabData> {
  const { userId, input, recordedOn, today, active } = p;
  const patient = await tx.patient.findFirst({ where: { id: input.patientId, deletedAt: null }, select: { id: true } });
  if (!patient) throw new PatientNotFoundError();

  const before = await tx.riskAssessment.findFirst({
    where: { patientId: input.patientId }, orderBy: { createdAt: "desc" }, select: { level: true },
  });

  const rec = await tx.labRecord.create({
    data: {
      patientId: input.patientId,
      recordedDate: dateFromKey(input.recordedDate),
      hba1c: input.hba1c ?? null,
      weightKg: input.weightKg ?? null,
      heightCm: input.heightCm ?? null,
      bmi: computeBmi(input.weightKg, input.heightCm),
      sbp: input.sbp ?? null,
      dbp: input.dbp ?? null,
      note: input.note?.trim() || null,
      source: "MANUAL",
      createdById: userId,
    },
    select: { id: true, recordedDate: true, sbp: true, dbp: true, voidedAt: true },
  });

  const { current } = await recomputeRisk(tx, input.patientId, active, today, { labRecordId: rec.id });
  const alertsCreated = await createBloodPressureAlert(tx, input.patientId, toBloodPressureInput(rec), active.rules, recordedOn);
  const newAlertTotal = await tx.alert.count({ where: { status: "NEW" } });

  await tx.auditLog.create({
    data: {
      userId, action: "CREATE", entity: "lab_record", entityId: rec.id, patientId: input.patientId,
      after: { recordedDate: input.recordedDate, hba1c: input.hba1c ?? null, sbp: input.sbp ?? null, dbp: input.dbp ?? null } as Prisma.InputJsonValue,
    },
  });

  return { recordId: rec.id, levelBefore: before?.level ?? null, levelAfter: current.level, alertsCreated, newAlertTotal };
}

export async function saveLabRecord(raw: unknown): Promise<SaveLabResult> {
  const user = await requireUser();
  const parsed = saveLabSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const input = parsed.data;

  const today = todayInBangkok();
  if (input.recordedDate > today) {
    return { ok: false, error: "วันที่ตรวจต้องไม่เป็นวันในอนาคต", fieldErrors: { recordedDate: "วันที่ตรวจต้องไม่เป็นวันในอนาคต" } };
  }
  try {
    const data = await prisma.$transaction(
      async (tx) => {
        const active = await getActiveRuleSet(tx);
        return saveLabCore(tx, { userId: user.id, input, recordedOn: today, today, active });
      },
      { timeout: 15_000 },
    );
    return { ok: true, data };
  } catch (e) {
    if (e instanceof PatientNotFoundError) return { ok: false, error: "ไม่พบผู้ป่วยรายนี้" };
    if (e instanceof NoActiveRuleSetError) return { ok: false, error: "ยังไม่มีชุดเกณฑ์ความเสี่ยง กรุณาแจ้งผู้ดูแลระบบ" };
    console.error("saveLabRecord failed", e);
    return { ok: false, error: "บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง" };
  }
}
