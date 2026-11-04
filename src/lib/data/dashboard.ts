// อ่านข้อมูลของหน้าภาพรวม (เรียกจากฝั่ง server เท่านั้น)
// ส่งออกเฉพาะตัวเลขสรุปและรายชื่อที่หน้าจอใช้ ไม่มีพิกัด ที่อยู่ หรือเบอร์โทร
import { requireUser } from "@/lib/auth/session";
import { buildDashboardStats, type DashboardPatient, type DashboardStats } from "@/lib/dashboard-stats";
import type { DashboardRange } from "@/lib/dashboard-range";
import { toBangkokDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { findMissingThresholds, type GlucoseThresholdKey } from "@/lib/risk/rules";
import type { RiskLevel } from "@/lib/risk/types";
import { parseAssessmentDetail } from "./assessment-store";
import { countNewAlerts } from "./alerts";
import { assessableDataCounts, loadRules } from "./patients";
import { fullName, glucoseFreshness } from "./view";

export type DashboardData = {
  stats: DashboardStats;
  alertCount: number;
  missingThresholds: GlucoseThresholdKey[];
  ruleSetMissing: boolean;
  /** เวลาที่โหลดข้อมูลชุดนี้ (ISO) */
  loadedAt: string;
};

export async function getDashboardData(range: DashboardRange, today: string, now: Date = new Date()): Promise<DashboardData> {
  await requireUser();
  const { rules, ruleSetMissing } = await loadRules();

  const [rows, alertCount] = await Promise.all([
    prisma.patient.findMany({
      where: { deletedAt: null },
      select: {
        id: true, hn: true, prefix: true, firstName: true, lastName: true, createdAt: true, noDrugConfirmedAt: true,
        riskAssessments: { orderBy: { createdAt: "desc" }, take: 1, select: { level: true, reasons: true } },
        labRecords: {
          where: { voidedAt: null },
          select: { recordedDate: true, hba1c: true, fbs: true, weightKg: true, bmi: true, sbp: true, dbp: true },
        },
        medications: { where: { voidedAt: null }, select: { startDate: true, endDate: true, isDiabetesDrug: true } },
        // ตรงกับหน้ารายชื่อผู้ป่วย: ถ้ายกเลิกข้อมูลจนไม่เหลือ แถวประเมินเดิมใช้ไม่ได้แล้ว
        _count: { select: { alerts: { where: { status: "NEW" } }, ...assessableDataCounts(today) } },
      },
    }),
    countNewAlerts(),
  ]);

  const patients: DashboardPatient[] = rows.map((p) => {
    const assessment = p._count.glucoseReadings + p._count.labRecords > 0 ? p.riskAssessments[0] : undefined;
    const detail = assessment ? parseAssessmentDetail(assessment.reasons) : null;
    const level: RiskLevel | null = assessment?.level ?? null;
    const fresh = glucoseFreshness(detail?.glucoseDate ?? null, today, rules.staleDataDays, level !== null);
    const reason = detail?.reasons.find((r) => r.level === level) ?? detail?.reasons[0] ?? null;
    return {
      id: p.id,
      hn: p.hn,
      name: fullName(p),
      createdDate: toBangkokDateKey(p.createdAt),
      level,
      isStale: level !== null && fresh.isStale,
      reason: reason?.message ?? null,
      eventDate: reason?.metric === "bloodPressure" ? detail?.bloodPressureDate ?? null : detail?.glucoseDate ?? null,
      hasOpenAlert: p._count.alerts > 0,
      noDrugConfirmedDate: p.noDrugConfirmedAt ? toBangkokDateKey(p.noDrugConfirmedAt) : null,
      labs: p.labRecords
        .map((l) => ({ date: toDateKey(l.recordedDate), hba1c: l.hba1c, fbs: l.fbs, weightKg: l.weightKg, bmi: l.bmi, sbp: l.sbp, dbp: l.dbp }))
        .filter((l) => l.date <= today),
      medications: p.medications.map((m) => ({
        startDate: toDateKey(m.startDate), endDate: m.endDate ? toDateKey(m.endDate) : null, isDiabetesDrug: m.isDiabetesDrug,
      })),
    };
  });

  return {
    stats: buildDashboardStats({ patients, rules, ruleSetMissing, range, today }),
    alertCount,
    missingThresholds: findMissingThresholds(rules),
    ruleSetMissing,
    loadedAt: now.toISOString(),
  };
}
