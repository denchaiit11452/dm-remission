// แปลงข้อมูลจากฐานข้อมูล (Prisma) เป็นชนิดข้อมูลของตรรกะความเสี่ยง
import type { GlucoseReading, LabRecord, RiskRuleSet } from "@prisma/client";
import type { BloodPressureInput, GlucoseReadingInput, RiskRules } from "@/lib/risk/types";
import { toDateKey } from "@/lib/date";

/** date key "YYYY-MM-DD" -> Date ที่ 00:00 UTC (ตรงกับคอลัมน์ @db.Date) */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function toRiskRules(row: RiskRuleSet): RiskRules {
  return {
    goodMin: row.goodMin,
    goodMax: row.goodMax,
    watchBelow: row.watchBelow,
    watchAbove: row.watchAbove,
    highBelow: row.highBelow,
    highAbove: row.highAbove,
    criticalGlucoseBelow: row.criticalGlucoseBelow,
    criticalGlucoseAbove: row.criticalGlucoseAbove,
    criticalSbp: row.criticalSbp,
    criticalDbp: row.criticalDbp,
    remissionHba1cMax: row.remissionHba1cMax,
    remissionMedFreeDays: row.remissionMedFreeDays,
    staleDataDays: row.staleDataDays,
    alertOnHighRisk: row.alertOnHighRisk,
  };
}

export function toGlucoseInput(
  row: Pick<GlucoseReading, "id" | "measuredDate" | "period" | "valueMgDl" | "meterFlag" | "voidedAt">,
): GlucoseReadingInput {
  return {
    id: row.id,
    measuredDate: toDateKey(row.measuredDate),
    period: row.period,
    valueMgDl: row.valueMgDl,
    meterFlag: row.meterFlag,
    isVoided: row.voidedAt !== null,
  };
}

export function toBloodPressureInput(
  row: Pick<LabRecord, "id" | "recordedDate" | "sbp" | "dbp" | "voidedAt">,
): BloodPressureInput {
  return {
    id: row.id,
    recordedDate: toDateKey(row.recordedDate),
    sbp: row.sbp,
    dbp: row.dbp,
    isVoided: row.voidedAt !== null,
  };
}
