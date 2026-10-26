// บริการประเมินความเสี่ยงและสร้าง Alert (ทำงานภายในธุรกรรมของฐานข้อมูลเสมอ)
// ผู้เรียกต้องผ่านการตรวจสิทธิ์ (requireUser) มาก่อนแล้ว
import type { Prisma } from "@prisma/client";
import { buildAssessmentDetail } from "./assessment-store";
import { dateFromKey, toBloodPressureInput, toGlucoseInput, toRiskRules } from "./mappers";
import { computeCurrentRisk, type CurrentRisk } from "@/lib/risk/current-risk";
import { decideBloodPressureAlert, decideGlucoseAlert, type AlertDecision } from "@/lib/risk/alerts";
import type { BloodPressureInput, GlucoseReadingInput, RiskRules } from "@/lib/risk/types";

export type Tx = Prisma.TransactionClient;
export type ActiveRuleSet = { id: string; version: number; rules: RiskRules };

export class NoActiveRuleSetError extends Error {
  constructor() {
    super("ยังไม่มีชุดเกณฑ์ความเสี่ยงที่ใช้งานอยู่");
    this.name = "NoActiveRuleSetError";
  }
}

export async function getActiveRuleSet(db: Tx | Prisma.DefaultPrismaClient): Promise<ActiveRuleSet> {
  const row = await db.riskRuleSet.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } });
  if (!row) throw new NoActiveRuleSetError();
  return { id: row.id, version: row.version, rules: toRiskRules(row) };
}

const GLUCOSE_SELECT = {
  id: true, measuredDate: true, period: true, valueMgDl: true, meterFlag: true, voidedAt: true,
} as const;
const LAB_SELECT = { id: true, recordedDate: true, sbp: true, dbp: true, voidedAt: true } as const;

/**
 * ประเมินระดับความเสี่ยงปัจจุบันของผู้ป่วยใหม่ แล้วเพิ่มแถวใน risk_assessments (ไม่เขียนทับของเดิม)
 * ใช้ตามกติกา: ค่าที่แย่ที่สุดของ "วันที่วัดล่าสุด" รวมกับความดันของ "วันที่ตรวจล่าสุด"
 * การเพิ่มแถว AUTO ใหม่ทำให้ Override ของแพทย์สิ้นสุดลง (ตามที่ตกลง: มีผลจนกว่าจะมีผลตรวจใหม่)
 * ถ้าไม่มีข้อมูลเหลือให้ประเมิน (level = null) จะไม่สร้างแถวใหม่
 */
export async function recomputeRisk(
  tx: Tx,
  patientId: string,
  active: ActiveRuleSet,
  today: string,
  trigger: { glucoseReadingId?: string; labRecordId?: string } = {},
): Promise<{ current: CurrentRisk; assessmentId: string | null }> {
  const todayDate = dateFromKey(today);

  const latestGlucose = await tx.glucoseReading.findFirst({
    where: {
      patientId, voidedAt: null, measuredDate: { lte: todayDate },
      OR: [{ valueMgDl: { not: null } }, { meterFlag: { not: "NONE" } }],
    },
    orderBy: { measuredDate: "desc" },
    select: { measuredDate: true },
  });
  const glucoseRows = latestGlucose
    ? await tx.glucoseReading.findMany({
        where: { patientId, voidedAt: null, measuredDate: latestGlucose.measuredDate },
        select: GLUCOSE_SELECT,
      })
    : [];

  const latestLab = await tx.labRecord.findFirst({
    where: {
      patientId, voidedAt: null, recordedDate: { lte: todayDate },
      OR: [{ sbp: { not: null } }, { dbp: { not: null } }],
    },
    orderBy: { recordedDate: "desc" },
    select: { recordedDate: true },
  });
  const labRows = latestLab
    ? await tx.labRecord.findMany({
        where: {
          patientId, voidedAt: null, recordedDate: latestLab.recordedDate,
          OR: [{ sbp: { not: null } }, { dbp: { not: null } }],
        },
        select: LAB_SELECT,
      })
    : [];

  const glucoseInputs = glucoseRows.map(toGlucoseInput);
  const current = computeCurrentRisk({
    glucoseReadings: glucoseInputs,
    bloodPressures: labRows.map(toBloodPressureInput),
    rules: active.rules,
    today,
  });
  if (current.level === null) return { current, assessmentId: null };

  const detail = buildAssessmentDetail(current, glucoseInputs, active.rules, active.version);
  const row = await tx.riskAssessment.create({
    data: {
      patientId,
      level: current.level,
      source: "AUTO",
      autoLevel: current.level,
      reasons: detail as unknown as Prisma.InputJsonValue,
      ruleSetId: active.id,
      triggerGlucoseId: trigger.glucoseReadingId ?? null,
      triggerLabId: trigger.labRecordId ?? null,
    },
    select: { id: true },
  });
  return { current, assessmentId: row.id };
}

async function createAlerts(tx: Tx, patientId: string, decisions: AlertDecision[]): Promise<number> {
  if (decisions.length === 0) return 0;
  const result = await tx.alert.createMany({
    data: decisions.map((d) => ({
      patientId,
      type: d.type,
      level: d.level,
      glucoseReadingId: d.glucoseReadingId,
      labRecordId: d.labRecordId,
      eventDate: dateFromKey(d.eventDate),
      summary: d.summary,
      dedupeKey: d.dedupeKey,
    })),
    skipDuplicates: true, // dedupeKey เป็น unique: ต้นเหตุเดียวกันไม่สร้าง Alert ซ้ำ
  });
  return result.count;
}

export function createGlucoseAlerts(
  tx: Tx, patientId: string, readings: GlucoseReadingInput[], rules: RiskRules, recordedOn: string,
): Promise<number> {
  const decisions = readings.flatMap((r) => {
    const d = decideGlucoseAlert(r, rules, recordedOn);
    return d ? [d] : [];
  });
  return createAlerts(tx, patientId, decisions);
}

export function createBloodPressureAlert(
  tx: Tx, patientId: string, bp: BloodPressureInput, rules: RiskRules, recordedOn: string,
): Promise<number> {
  const d = decideBloodPressureAlert(bp, rules, recordedOn);
  return createAlerts(tx, patientId, d ? [d] : []);
}
