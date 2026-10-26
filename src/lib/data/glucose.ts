// บันทึกค่าน้ำตาล DTX: ตรวจข้อมูล -> บันทึก -> ประเมินความเสี่ยง -> สร้าง Alert -> audit log
// ทั้งหมดอยู่ในธุรกรรมเดียว (ถ้าขั้นใดล้มเหลว ไม่มีอะไรถูกบันทึกครึ่งเดียว)
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import type { RiskLevel } from "@/lib/risk/types";
import { dateFromKey, toGlucoseInput } from "./mappers";
import {
  NoActiveRuleSetError, createGlucoseAlerts, getActiveRuleSet, recomputeRisk, type ActiveRuleSet, type Tx,
} from "./risk-service";
import { saveGlucoseSchema, toFieldErrors, type SaveGlucoseInput } from "./schemas";

export type SaveFailure = { ok: false; error: string; fieldErrors?: Record<string, string> };

export type SaveGlucoseData = {
  measuredDate: string;
  savedCount: number;
  readingIds: string[];
  levelBefore: RiskLevel | null;
  levelAfter: RiskLevel | null;
  alertsCreated: number;
  /** จำนวน Alert ที่ยังไม่รับทราบ (ทั้งระบบ) หลังบันทึก ใช้ปรับตัวเลขบนเมนู */
  newAlertTotal: number;
};
export type SaveGlucoseResult = { ok: true; data: SaveGlucoseData } | SaveFailure;

class PatientNotFoundError extends Error {
  constructor() { super("ไม่พบผู้ป่วย"); this.name = "PatientNotFoundError"; }
}

/** แกนของการบันทึก (ใช้ซ้ำโดยข้อมูลสาธิต) ผู้เรียกต้องเปิดธุรกรรมและตรวจสิทธิ์ไว้แล้ว */
export async function saveGlucoseCore(
  tx: Tx,
  p: { userId: string; input: SaveGlucoseInput; recordedOn: string; today: string; active: ActiveRuleSet },
): Promise<SaveGlucoseData> {
  const { userId, input, recordedOn, today, active } = p;

  const patient = await tx.patient.findFirst({ where: { id: input.patientId, deletedAt: null }, select: { id: true } });
  if (!patient) throw new PatientNotFoundError();

  const before = await tx.riskAssessment.findFirst({
    where: { patientId: input.patientId }, orderBy: { createdAt: "desc" }, select: { level: true },
  });

  const created = [];
  for (const e of input.entries) {
    created.push(
      await tx.glucoseReading.create({
        data: {
          patientId: input.patientId,
          measuredDate: dateFromKey(input.measuredDate),
          measuredTime: e.measuredTime ?? null,
          period: e.period,
          valueMgDl: e.meterFlag === "NONE" ? (e.valueMgDl ?? null) : null,
          meterFlag: e.meterFlag,
          note: e.note?.trim() || null,
          source: "MANUAL",
          createdById: userId,
        },
        select: { id: true, measuredDate: true, period: true, valueMgDl: true, meterFlag: true, voidedAt: true },
      }),
    );
  }

  const { current } = await recomputeRisk(tx, input.patientId, active, today, { glucoseReadingId: created[0]?.id });
  const alertsCreated = await createGlucoseAlerts(tx, input.patientId, created.map(toGlucoseInput), active.rules, recordedOn);
  const newAlertTotal = await tx.alert.count({ where: { status: "NEW" } });

  await tx.auditLog.create({
    data: {
      userId,
      action: "CREATE",
      entity: "glucose_reading",
      entityId: created[0]?.id ?? null,
      patientId: input.patientId,
      after: {
        measuredDate: input.measuredDate,
        entries: input.entries.map((e) => ({ period: e.period, valueMgDl: e.valueMgDl ?? null, meterFlag: e.meterFlag })),
      } as Prisma.InputJsonValue,
    },
  });

  return {
    measuredDate: input.measuredDate,
    savedCount: created.length,
    readingIds: created.map((c) => c.id),
    levelBefore: before?.level ?? null,
    levelAfter: current.level,
    alertsCreated,
    newAlertTotal,
  };
}

/** Server-side เท่านั้น: เรียกจาก Server Action ของฟอร์มบันทึกน้ำตาล */
export async function saveGlucoseReadings(raw: unknown): Promise<SaveGlucoseResult> {
  const user = await requireUser(); // ทุกบทบาทบันทึกค่าน้ำตาลได้ (ตามตารางสิทธิ์)

  const parsed = saveGlucoseSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const input = parsed.data;

  const today = todayInBangkok();
  if (input.measuredDate > today) {
    return {
      ok: false,
      error: "วันที่ผู้ป่วยวัดต้องไม่เป็นวันในอนาคต",
      fieldErrors: { measuredDate: "วันที่ผู้ป่วยวัดต้องไม่เป็นวันในอนาคต" },
    };
  }

  try {
    const data = await prisma.$transaction(
      async (tx) => {
        const active = await getActiveRuleSet(tx);
        return saveGlucoseCore(tx, { userId: user.id, input, recordedOn: today, today, active });
      },
      { timeout: 15_000 },
    );
    return { ok: true, data };
  } catch (e) {
    if (e instanceof PatientNotFoundError) return { ok: false, error: "ไม่พบผู้ป่วยรายนี้" };
    if (e instanceof NoActiveRuleSetError) {
      return { ok: false, error: "ยังไม่มีชุดเกณฑ์ความเสี่ยง กรุณาแจ้งผู้ดูแลระบบ" };
    }
    console.error("saveGlucoseReadings failed", e);
    return { ok: false, error: "บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง" };
  }
}
