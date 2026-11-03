// อ่านประวัติน้ำตาลรายวันของผู้ป่วยหนึ่งคน (ต่อฐานข้อมูลที่นี่ ส่วนคำนวณอยู่ใน src/lib/history.ts)
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { toDateKey, todayInBangkok } from "@/lib/date";
import { buildDailyHistory, parseHistoryRange, type DailyHistory, type HistoryRange } from "@/lib/history";
import type { GlucoseReadingInput, RiskRules } from "@/lib/risk/types";
import { dateFromKey, toGlucoseInput } from "./mappers";
import { loadRules } from "./patients";

export type PatientHistory = {
  range: HistoryRange;
  history: DailyHistory;
  rules: Pick<RiskRules, "goodMin" | "goodMax">;
  latestDate: string | null;
};

export type GlucoseRecordRow = {
  id: string;
  period: GlucoseReadingInput["period"];
  valueMgDl: number | null;
  meterFlag: GlucoseReadingInput["meterFlag"];
  measuredTime: string | null;
  note: string | null;
  createdByName: string;
  createdAt: string;
  voided: { at: string; byName: string | null; reason: string | null } | null;
};

/** ทุกรายการของวันที่วัด รวมรายการที่ยกเลิกแล้ว เพื่อให้ตรวจสอบย้อนหลังได้ */
export async function listGlucoseRecordsOfDay(patientId: string, date: string): Promise<GlucoseRecordRow[]> {
  await requireUser();
  const rows = await prisma.glucoseReading.findMany({
    where: { patientId, measuredDate: dateFromKey(date) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, period: true, valueMgDl: true, meterFlag: true, measuredTime: true, note: true, createdAt: true,
      voidedAt: true, voidReason: true,
      createdBy: { select: { fullName: true } },
      voidedBy: { select: { fullName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    period: r.period,
    valueMgDl: r.valueMgDl,
    meterFlag: r.meterFlag,
    measuredTime: r.measuredTime,
    note: r.note,
    createdByName: r.createdBy.fullName,
    createdAt: r.createdAt.toISOString(),
    voided: r.voidedAt ? { at: r.voidedAt.toISOString(), byName: r.voidedBy?.fullName ?? null, reason: r.voidReason } : null,
  }));
}

export async function getDailyHistory(
  patientId: string,
  rawParams: Record<string, string | string[] | undefined>,
): Promise<PatientHistory> {
  await requireUser();
  const today = todayInBangkok();
  const { rules } = await loadRules();

  const latest = await prisma.glucoseReading.findFirst({
    where: { patientId, voidedAt: null },
    orderBy: { measuredDate: "desc" },
    select: { measuredDate: true },
  });
  const latestDate = latest ? toDateKey(latest.measuredDate) : null;
  const range = parseHistoryRange(rawParams, latestDate, today);

  const rows = await prisma.glucoseReading.findMany({
    where: { patientId, voidedAt: null, measuredDate: { gte: dateFromKey(range.from), lte: dateFromKey(range.to) } },
    orderBy: [{ measuredDate: "asc" }, { createdAt: "asc" }],
    select: { id: true, measuredDate: true, period: true, valueMgDl: true, meterFlag: true, voidedAt: true },
  });

  const history = buildDailyHistory({ readings: rows.map(toGlucoseInput), rules, from: range.from, to: range.to, latestDate });
  return { range, history, rules: { goodMin: rules.goodMin, goodMax: rules.goodMax }, latestDate };
}
