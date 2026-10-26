// อ่านข้อมูลผู้ป่วยสำหรับหน้ารายชื่อและหน้าโปรไฟล์
// ไม่ส่งเลขบัตรประชาชนและพิกัดออกจากชั้นนี้ (ต้องขอผ่านฟังก์ชันที่ตรวจสิทธิ์โดยเฉพาะในอนาคต)
import type { DiabetesType, Gender, Prisma, ProgramStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { toDateKey, todayInBangkok } from "@/lib/date";
import { severity } from "@/lib/risk/levels";
import { DEFAULT_RISK_RULES, findMissingThresholds, type GlucoseThresholdKey } from "@/lib/risk/rules";
import type { RiskLevel, RiskReason, RiskRules } from "@/lib/risk/types";
import { assessRemission, type RemissionAssessment } from "@/lib/remission/remission";
import { parseAssessmentDetail, type AssessmentHeadline } from "./assessment-store";
import { NoActiveRuleSetError, getActiveRuleSet } from "./risk-service";
import { ageInYears, fullName, glucoseFreshness } from "./view";

async function loadRules(): Promise<{ rules: RiskRules; ruleSetMissing: boolean }> {
  try {
    const active = await getActiveRuleSet(prisma);
    return { rules: active.rules, ruleSetMissing: false };
  } catch (e) {
    if (e instanceof NoActiveRuleSetError) return { rules: DEFAULT_RISK_RULES, ruleSetMissing: true };
    throw e;
  }
}

// ---------------------------------------------------------------- รายชื่อผู้ป่วย
export type PatientListRow = {
  id: string;
  hn: string;
  fullName: string;
  programStatus: ProgramStatus;
  /** null = ยังไม่มีข้อมูลให้ประเมิน */
  level: RiskLevel | null;
  levelSource: "AUTO" | "OVERRIDE" | null;
  isStale: boolean;
  glucoseAgeDays: number | null;
  glucoseDate: string | null;
  headline: AssessmentHeadline | null;
  openAlertCount: number;
};

export type ListPatientsParams = {
  q?: string;
  level?: RiskLevel | "NONE";
  status?: ProgramStatus;
  staleOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListPatientsResult = {
  rows: PatientListRow[];
  total: number;
  page: number;
  pageSize: number;
  today: string;
  /** เกณฑ์น้ำตาลที่แพทย์ยังไม่กำหนด (หน้าจอควรแสดงแถบเตือน) */
  missingThresholds: GlucoseThresholdKey[];
  ruleSetMissing: boolean;
};

export async function listPatients(params: ListPatientsParams = {}): Promise<ListPatientsResult> {
  await requireUser();
  const today = todayInBangkok();
  const { rules, ruleSetMissing } = await loadRules();

  const q = params.q?.trim().slice(0, 100);
  const where: Prisma.PatientWhereInput = {
    deletedAt: null,
    ...(params.status ? { programStatus: params.status } : {}),
    ...(q
      ? {
          OR: [
            { hn: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // ผู้ป่วยระดับหลักร้อย: ดึงมาคำนวณแล้วกรอง/เรียง/แบ่งหน้าฝั่งแอป (ระดับปัจจุบันคือแถวล่าสุดของแต่ละคน)
  const patients = await prisma.patient.findMany({
    where,
    select: {
      id: true, hn: true, prefix: true, firstName: true, lastName: true, programStatus: true,
      riskAssessments: { orderBy: { createdAt: "desc" }, take: 1, select: { level: true, source: true, reasons: true } },
      _count: { select: { alerts: { where: { status: "NEW" } } } },
    },
  });

  let rows: PatientListRow[] = patients.map((p) => {
    const a = p.riskAssessments[0];
    const detail = a ? parseAssessmentDetail(a.reasons) : null;
    const level = a?.level ?? null;
    const fresh = glucoseFreshness(detail?.glucoseDate ?? null, today, rules.staleDataDays, level !== null);
    return {
      id: p.id,
      hn: p.hn,
      fullName: fullName(p),
      programStatus: p.programStatus,
      level,
      levelSource: a?.source ?? null,
      isStale: level !== null && fresh.isStale,
      glucoseAgeDays: fresh.ageDays,
      glucoseDate: detail?.glucoseDate ?? null,
      headline: detail?.headline ?? null,
      openAlertCount: p._count.alerts,
    };
  });

  if (params.level) rows = rows.filter((r) => (params.level === "NONE" ? r.level === null : r.level === params.level));
  if (params.staleOnly) rows = rows.filter((r) => r.isStale);

  // เรียง: ระดับรุนแรงก่อน (ไม่มีข้อมูลไว้ท้าย) แล้วตาม HN
  rows.sort((a, b) => {
    const sa = a.level ? severity(a.level) : -1;
    const sb = b.level ? severity(b.level) : -1;
    return sb - sa || a.hn.localeCompare(b.hn);
  });

  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
  const total = rows.length;
  const page = Math.min(Math.max(params.page ?? 1, 1), Math.max(1, Math.ceil(total / pageSize)));
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    total, page, pageSize, today,
    missingThresholds: findMissingThresholds(rules),
    ruleSetMissing,
  };
}

// ---------------------------------------------------------------- สรุปผู้ป่วยรายคน
export type PatientSummary = {
  patient: {
    id: string; hn: string; fullName: string; gender: Gender | null; ageYears: number | null;
    diabetesType: DiabetesType; programStartDate: string | null; programStatus: ProgramStatus;
  };
  risk: {
    level: RiskLevel | null;
    source: "AUTO" | "OVERRIDE" | null;
    overrideReason: string | null;
    reasons: RiskReason[];
    glucoseDate: string | null;
    bloodPressureDate: string | null;
    glucoseAgeDays: number | null;
    isStale: boolean;
    headline: AssessmentHeadline | null;
  };
  remission: RemissionAssessment;
  openAlertCount: number;
  missingThresholds: GlucoseThresholdKey[];
  ruleSetMissing: boolean;
  today: string;
};

export async function getPatientSummary(id: string): Promise<PatientSummary | null> {
  await requireUser();
  const today = todayInBangkok();
  const { rules, ruleSetMissing } = await loadRules();

  const p = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, hn: true, prefix: true, firstName: true, lastName: true, gender: true, birthDate: true,
      diabetesType: true, programStartDate: true, programStatus: true,
      riskAssessments: { orderBy: { createdAt: "desc" }, take: 1, select: { level: true, source: true, reasons: true, overrideReason: true } },
      labRecords: { where: { voidedAt: null, hba1c: { not: null } }, select: { id: true, recordedDate: true, hba1c: true, voidedAt: true } },
      medications: { select: { startDate: true, endDate: true, isDiabetesDrug: true } },
      _count: { select: { alerts: { where: { status: "NEW" } } } },
    },
  });
  if (!p) return null;

  const a = p.riskAssessments[0];
  const detail = a ? parseAssessmentDetail(a.reasons) : null;
  const level = a?.level ?? null;
  const fresh = glucoseFreshness(detail?.glucoseDate ?? null, today, rules.staleDataDays, level !== null);

  const remission = assessRemission({
    hba1cRecords: p.labRecords.map((l) => ({
      id: l.id, recordedDate: toDateKey(l.recordedDate), hba1c: l.hba1c, isVoided: l.voidedAt !== null,
    })),
    medications: p.medications.map((m) => ({
      startDate: toDateKey(m.startDate), endDate: m.endDate ? toDateKey(m.endDate) : null, isDiabetesDrug: m.isDiabetesDrug,
    })),
    asOf: today,
    rules,
  });

  return {
    patient: {
      id: p.id, hn: p.hn, fullName: fullName(p), gender: p.gender,
      ageYears: p.birthDate ? ageInYears(toDateKey(p.birthDate), today) : null,
      diabetesType: p.diabetesType,
      programStartDate: p.programStartDate ? toDateKey(p.programStartDate) : null,
      programStatus: p.programStatus,
    },
    risk: {
      level,
      source: a?.source ?? null,
      overrideReason: a?.overrideReason ?? null,
      reasons: detail?.reasons ?? [],
      glucoseDate: detail?.glucoseDate ?? null,
      bloodPressureDate: detail?.bloodPressureDate ?? null,
      glucoseAgeDays: fresh.ageDays,
      isStale: level !== null && fresh.isStale,
      headline: detail?.headline ?? null,
    },
    remission,
    openAlertCount: p._count.alerts,
    missingThresholds: findMissingThresholds(rules),
    ruleSetMissing,
    today,
  };
}
