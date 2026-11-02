// อ่านประวัติน้ำตาลรายวันของผู้ป่วยหนึ่งคน (ต่อฐานข้อมูลที่นี่ ส่วนคำนวณอยู่ใน src/lib/history.ts)
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { toDateKey, todayInBangkok } from "@/lib/date";
import { buildDailyHistory, parseHistoryRange, type DailyHistory, type HistoryRange } from "@/lib/history";
import type { RiskRules } from "@/lib/risk/types";
import { dateFromKey, toGlucoseInput } from "./mappers";
import { loadRules } from "./patients";

export type PatientHistory = {
  range: HistoryRange;
  history: DailyHistory;
  rules: Pick<RiskRules, "goodMin" | "goodMax">;
  latestDate: string | null;
};

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
