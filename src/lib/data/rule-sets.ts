// ชุดเกณฑ์ความเสี่ยงและ Remission: ทุกการแก้ไขสร้างเวอร์ชันใหม่ แล้วประเมินระดับความเสี่ยงของผู้ป่วยทุกคนใหม่
// การประเมินใหม่จากการเปลี่ยนเกณฑ์ไม่สร้าง Alert ย้อนหลัง และไม่ล้าง Override ของแพทย์ (โรงพยาบาลยืนยันแล้ว)
import { Prisma } from "@prisma/client";
import { RULE_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { DEFAULT_RISK_RULES, changedRuleFields, validateRiskRules } from "@/lib/risk/rules";
import type { RiskLevel, RiskRules } from "@/lib/risk/types";
import { recomputeRisk, type ActiveRuleSet, type Tx } from "./risk-service";
import { toRiskRules } from "./mappers";
import { saveRuleSetSchema, toFieldErrors } from "./schemas";
import type { SaveFailure } from "./glucose";
import { fullName } from "./view";

export type RuleVersionRow = {
  version: number;
  isActive: boolean;
  changeReason: string | null;
  createdAt: string;
  createdByName: string;
};

export type RuleSettings = {
  /** 0 = ยังไม่มีชุดเกณฑ์ที่ใช้งาน ฟอร์มจะเริ่มจากค่าเริ่มต้นของระบบ */
  activeVersion: number;
  rules: RiskRules;
  versions: RuleVersionRow[];
};

export type PatientLevelChange = {
  patientId: string;
  hn: string;
  fullName: string;
  before: RiskLevel | null;
  after: RiskLevel;
};

export type RecomputeSummary = {
  assessedCount: number;
  overrideKeptCount: number;
  changes: PatientLevelChange[];
};

export type SaveRuleSetResult = { ok: true; version: number; summary: RecomputeSummary } | SaveFailure;

const VERSION_LIST_LIMIT = 20;
// ผู้ป่วยระดับหลักร้อยใช้หลายคำสั่งต่อคน จึงต้องให้เวลาธุรกรรมมากกว่าการบันทึกปกติ
const RECOMPUTE_TIMEOUT_MS = 120_000;

export async function getRuleSettings(): Promise<RuleSettings> {
  await requireRole(...RULE_MANAGER_ROLES);
  const rows = await prisma.riskRuleSet.findMany({
    orderBy: { version: "desc" },
    take: VERSION_LIST_LIMIT,
    include: { createdBy: { select: { fullName: true } } },
  });
  const active = rows.find((r) => r.isActive);
  return {
    activeVersion: active?.version ?? 0,
    rules: active ? toRiskRules(active) : DEFAULT_RISK_RULES,
    versions: rows.map((r) => ({
      version: r.version,
      isActive: r.isActive,
      changeReason: r.changeReason,
      createdAt: r.createdAt.toISOString(),
      createdByName: r.createdBy.fullName,
    })),
  };
}

/** แกนของการประเมินใหม่ทุกคน ผู้เรียกต้องเปิดธุรกรรมและตรวจสิทธิ์ไว้แล้ว */
export async function recomputeAllPatients(tx: Tx, active: ActiveRuleSet, today: string): Promise<RecomputeSummary> {
  const patients = await tx.patient.findMany({
    where: { deletedAt: null },
    orderBy: { hn: "asc" },
    select: {
      id: true, hn: true, prefix: true, firstName: true, lastName: true,
      riskAssessments: { orderBy: { createdAt: "desc" }, take: 1, select: { level: true } },
    },
  });

  const summary: RecomputeSummary = { assessedCount: 0, overrideKeptCount: 0, changes: [] };
  for (const p of patients) {
    const { level, overrideKept } = await recomputeRisk(tx, p.id, active, today);
    if (level === null) continue; // ไม่มีข้อมูลให้ประเมิน
    summary.assessedCount += 1;
    if (overrideKept) {
      summary.overrideKeptCount += 1;
      continue;
    }
    const before = p.riskAssessments[0]?.level ?? null;
    if (before !== level) {
      summary.changes.push({ patientId: p.id, hn: p.hn, fullName: fullName(p), before, after: level });
    }
  }
  return summary;
}

class StaleVersionError extends Error {}
class NoChangeError extends Error {}

const STALE_MESSAGE = "มีผู้อื่นเพิ่งเปลี่ยนเกณฑ์ กรุณาโหลดหน้าใหม่แล้วตรวจสอบอีกครั้ง";

export async function saveRuleSet(raw: unknown): Promise<SaveRuleSetResult> {
  const user = await requireRole(...RULE_MANAGER_ROLES);
  const parsed = saveRuleSetSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const { baseVersion, changeReason, ...values } = parsed.data;

  try {
    return await prisma.$transaction(
      async (tx): Promise<SaveRuleSetResult> => {
        const current = await tx.riskRuleSet.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } });
        if ((current?.version ?? 0) !== baseVersion) throw new StaleVersionError();

        // ตัวเลือก Alert ระดับความเสี่ยงสูงยังไม่เปิดให้แก้ในหน้าจอ จึงคงค่าเดิม
        const beforeRules = current ? toRiskRules(current) : DEFAULT_RISK_RULES;
        const rules: RiskRules = { ...values, alertOnHighRisk: beforeRules.alertOnHighRisk };
        const problems = validateRiskRules(rules);
        if (problems.length > 0) return { ok: false, error: problems[0] };

        const changedFields = changedRuleFields(beforeRules, rules);
        if (current && changedFields.length === 0) throw new NoChangeError();

        const max = await tx.riskRuleSet.aggregate({ _max: { version: true } });
        const version = (max._max.version ?? 0) + 1;
        await tx.riskRuleSet.updateMany({ where: { isActive: true }, data: { isActive: false } });
        const row = await tx.riskRuleSet.create({
          data: { ...rules, version, isActive: true, changeReason, createdById: user.id },
          select: { id: true },
        });

        const summary = await recomputeAllPatients(tx, { id: row.id, version, rules }, todayInBangkok());

        await tx.auditLog.create({
          data: {
            userId: user.id, action: "RULE_CHANGE", entity: "risk_rule_set", entityId: row.id,
            before: { version: current?.version ?? null, rules: beforeRules } as Prisma.InputJsonValue,
            after: {
              version, rules, changeReason, changedFields,
              assessedCount: summary.assessedCount,
              overrideKeptCount: summary.overrideKeptCount,
              levelChangedPatientIds: summary.changes.map((c) => c.patientId),
            } as Prisma.InputJsonValue,
          },
        });
        return { ok: true, version, summary };
      },
      { timeout: RECOMPUTE_TIMEOUT_MS },
    );
  } catch (e) {
    if (e instanceof StaleVersionError) return { ok: false, error: STALE_MESSAGE };
    if (e instanceof NoChangeError) return { ok: false, error: "ค่าเกณฑ์เหมือนเดิม ไม่มีอะไรให้บันทึก" };
    // สองคนบันทึกพร้อมกันจนเลขเวอร์ชันชนกัน
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: STALE_MESSAGE };
    console.error("saveRuleSet failed", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return { ok: false, error: "บันทึกเกณฑ์ไม่สำเร็จ เกณฑ์เดิมยังใช้งานอยู่ กรุณาลองใหม่อีกครั้ง" };
  }
}
