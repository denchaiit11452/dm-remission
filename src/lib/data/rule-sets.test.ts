import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RISK_RULES } from "@/lib/risk/rules";
import { canConfirmNoDrug } from "@/lib/auth/permissions";
import { toRuleFormValues, toRuleSetPayload } from "@/lib/rule-set-form";
import type { Tx } from "./risk-service";

const { requireRole, transaction } = vi.hoisted(() => ({ requireRole: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRole, requireUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));

const { saveRuleSet, recomputeAllPatients } = await import("./rule-sets");
const { cancelNoDrugConfirmation, confirmNoDrug } = await import("./no-drug-confirmation");

const FORBIDDEN = new Error("NEXT_REDIRECT:/forbidden");
const PID = "3f2b8c1e-9d4a-4b7e-8c21-5a6d7e8f9a0b";
const DAY = new Date("2026-10-14T00:00:00Z");
const ACTIVE = { id: "rule", version: 2, rules: { ...DEFAULT_RISK_RULES, goodMax: 90 } };

describe("สิทธิ์", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockRejectedValue(FORBIDDEN);
  });

  it.each([
    ["แก้เกณฑ์", () => saveRuleSet({}), ["ADMIN", "DOCTOR"]],
    ["ยืนยันไม่เคยใช้ยา", () => confirmNoDrug({}), ["DOCTOR"]],
    ["ยกเลิกคำยืนยัน", () => cancelNoDrugConfirmation({}), ["DOCTOR"]],
  ] as const)("%s จำกัดบทบาทและหยุดก่อนแตะฐานข้อมูล", async (_name, call, roles) => {
    await expect(call()).rejects.toBe(FORBIDDEN);
    expect(requireRole).toHaveBeenCalledWith(...roles);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ปุ่มยืนยันไม่เคยใช้ยาเห็นเฉพาะแพทย์", () => {
    expect(canConfirmNoDrug("DOCTOR")).toBe(true);
    expect(canConfirmNoDrug("ADMIN")).toBe(false);
    expect(canConfirmNoDrug("STAFF")).toBe(false);
  });
});

type FakePatient = { id: string; hn: string; before: string | null; source: "AUTO" | "OVERRIDE"; hasData: boolean };

function fakeTx(patients: FakePatient[]) {
  const created: { patientId: string; level: string }[] = [];
  const alertCreate = vi.fn();
  const byId = (where: { patientId: string }) => patients.find((p) => p.id === where.patientId)!;
  const tx = {
    patient: {
      findMany: async () => patients.map((p) => ({
        id: p.id, hn: p.hn, prefix: null, firstName: "ชื่อ", lastName: p.hn,
        riskAssessments: p.before ? [{ level: p.before }] : [],
      })),
    },
    glucoseReading: {
      findFirst: async ({ where }: { where: { patientId: string } }) => (byId(where).hasData ? { measuredDate: DAY } : null),
      findMany: async ({ where }: { where: { patientId: string } }) => [
        { id: `g-${where.patientId}`, measuredDate: DAY, period: "AFTER_DINNER", valueMgDl: 120, meterFlag: "NONE", voidedAt: null },
      ],
    },
    labRecord: { findFirst: async () => null, findMany: async () => [] },
    riskAssessment: {
      findFirst: async ({ where }: { where: { patientId: string } }) => {
        const p = byId(where);
        return p.before ? { level: p.before, source: p.source } : null;
      },
      create: async ({ data }: { data: { patientId: string; level: string } }) => {
        created.push({ patientId: data.patientId, level: data.level });
        return { id: "row" };
      },
    },
    alert: { createMany: alertCreate },
  };
  return { tx: tx as unknown as Tx, created, alertCreate };
}

describe("recomputeAllPatients", () => {
  it("สรุปผู้ที่ระดับเปลี่ยน คง Override ข้ามผู้ไม่มีข้อมูล และไม่สร้าง Alert", async () => {
    // เกณฑ์ goodMax 90 ทำให้ 120 mg/dL เป็น "ยังคุมไม่ได้"
    const { tx, created, alertCreate } = fakeTx([
      { id: "a", hn: "A", before: "WELL_CONTROLLED", source: "AUTO", hasData: true },
      { id: "b", hn: "B", before: "UNCONTROLLED", source: "AUTO", hasData: true },
      { id: "c", hn: "C", before: "HIGH", source: "OVERRIDE", hasData: true },
      { id: "d", hn: "D", before: null, source: "AUTO", hasData: false },
    ]);
    const s = await recomputeAllPatients(tx, ACTIVE, "2026-10-15");

    expect(s.assessedCount).toBe(3);
    expect(s.overrideKeptCount).toBe(1);
    expect(s.changes).toEqual([{ patientId: "a", hn: "A", fullName: "ชื่อ A", before: "WELL_CONTROLLED", after: "UNCONTROLLED" }]);
    expect(created.map((c) => c.patientId)).toEqual(["a", "b"]);
    expect(alertCreate).not.toHaveBeenCalled();
  });
});

describe("saveRuleSet", () => {
  const payload = (patch = {}) => toRuleSetPayload(1, { ...toRuleFormValues(DEFAULT_RISK_RULES), changeReason: "ทบทวน", ...patch });

  function saveTx(activeVersion: number | null) {
    const row = activeVersion === null ? null : {
      ...DEFAULT_RISK_RULES, id: "old", version: activeVersion, isActive: true,
      changeReason: null, createdAt: DAY, createdById: "u",
    };
    const create = vi.fn(async () => ({ id: "new" }));
    const tx = {
      riskRuleSet: {
        findFirst: async () => row,
        aggregate: async () => ({ _max: { version: activeVersion } }),
        updateMany: async () => ({ count: 1 }),
        create,
      },
      patient: { findMany: async () => [] },
      auditLog: { create: vi.fn() },
    };
    transaction.mockImplementation(async (fn: (t: unknown) => unknown) => fn(tx));
    return { create, audit: tx.auditLog.create };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({ id: "u1", role: "DOCTOR" });
  });

  it("สร้างเวอร์ชันใหม่และบันทึก audit", async () => {
    const { create, audit } = saveTx(1);
    const r = await saveRuleSet(payload({ remissionHba1cMax: "5.7" }));
    expect(r).toMatchObject({ ok: true, version: 2 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ version: 2, isActive: true, remissionHba1cMax: 5.7, changeReason: "ทบทวน", createdById: "u1" }),
    }));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "RULE_CHANGE", after: expect.objectContaining({ changedFields: ["remissionHba1cMax"] }) }),
    }));
  });

  it("ไม่บันทึกเมื่อค่าไม่เปลี่ยน", async () => {
    const { create } = saveTx(1);
    const r = await saveRuleSet(payload());
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("เหมือนเดิม") });
    expect(create).not.toHaveBeenCalled();
  });

  it("ปฏิเสธเมื่อมีผู้อื่นเปลี่ยนเกณฑ์ไปก่อน", async () => {
    const { create } = saveTx(2);
    const r = await saveRuleSet(payload({ remissionHba1cMax: "5.7" }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("โหลดหน้าใหม่") });
    expect(create).not.toHaveBeenCalled();
  });

  it("ปฏิเสธเกณฑ์ที่เรียงลำดับไม่ถูกต้อง", async () => {
    const { create } = saveTx(1);
    const r = await saveRuleSet(payload({ highAbove: "300", criticalGlucoseAbove: "250" }));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("ฝั่งสูง") });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("confirmNoDrug", () => {
  function tx(drugCount: number, confirmedAt: Date | null = null) {
    const update = vi.fn();
    const audit = vi.fn();
    const t = {
      patient: { findFirst: async () => ({ noDrugConfirmedAt: confirmedAt }), update },
      medicationPeriod: { count: async () => drugCount },
      auditLog: { create: audit },
    };
    transaction.mockImplementation(async (fn: (x: unknown) => unknown) => fn(t));
    return { update, audit };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({ id: "doc", role: "DOCTOR" });
  });

  it("บันทึกชื่อแพทย์ เหตุผล และ audit", async () => {
    const { update, audit } = tx(0);
    expect(await confirmNoDrug({ patientId: PID, reason: "ซักประวัติแล้ว" })).toEqual({ ok: true, patientId: PID });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ noDrugConfirmedById: "doc", noDrugConfirmReason: "ซักประวัติแล้ว" }),
    }));
    expect(audit).toHaveBeenCalledOnce();
  });

  it("ต้องมีเหตุผล", async () => {
    const { update } = tx(0);
    expect((await confirmNoDrug({ patientId: PID, reason: " " })).ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("ปฏิเสธเมื่อมีรายการยาเบาหวานในประวัติ", async () => {
    const { update } = tx(1);
    expect(await confirmNoDrug({ patientId: PID, reason: "x" })).toMatchObject({ ok: false, error: expect.stringContaining("ยาเบาหวาน") });
    expect(update).not.toHaveBeenCalled();
  });
});
