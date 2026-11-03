import { describe, expect, it, vi } from "vitest";
import type { Tx } from "./risk-service";

// แกนของการยกเลิกไม่ต่อฐานข้อมูล แต่ไฟล์นี้ import ตัวตรวจสิทธิ์และ Prisma ไว้สำหรับฟังก์ชันชั้นนอก
vi.mock("@/lib/auth/session", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { voidGlucoseCore, voidLabCore } = await import("./void-record");

const NOW = new Date("2026-10-15T03:00:00Z");
const DAY = new Date("2026-10-14T00:00:00Z");
const GLUCOSE = { patientId: "p1", measuredDate: DAY, period: "AFTER_DINNER", valueMgDl: 480, meterFlag: "NONE", voidedAt: null as Date | null };
const LAB = { patientId: "p1", recordedDate: DAY, hba1c: null, fbs: null, weightKg: null, heightCm: null, bmi: null, sbp: 190, dbp: 100, voidedAt: null as Date | null };

function fakeTx(opts: { glucose?: typeof GLUCOSE | null; lab?: typeof LAB | null; lostRace?: boolean; alertsCancelled?: number }) {
  const calls = { audits: [] as { action: string; after: Record<string, unknown> }[], alertWhere: [] as unknown[], marked: [] as unknown[] };
  const mark = async (a: unknown) => {
    calls.marked.push(a);
    return { count: opts.lostRace ? 0 : 1 };
  };
  const tx = {
    glucoseReading: { findFirst: async () => opts.glucose ?? null, updateMany: mark },
    labRecord: { findFirst: async () => opts.lab ?? null, updateMany: mark },
    alert: {
      updateMany: async (a: { where: unknown }) => {
        calls.alertWhere.push(a.where);
        return { count: opts.alertsCancelled ?? 0 };
      },
    },
    auditLog: {
      create: async (a: { data: { action: string; after: Record<string, unknown> } }) => {
        calls.audits.push(a.data);
        return {};
      },
    },
  } as unknown as Tx;
  return { tx, calls };
}

const params = (recomputed: string[] = []) => ({
  userId: "u1",
  id: "r1",
  reason: "กรอกผิดคน",
  now: NOW,
  recompute: async (patientId: string) => {
    recomputed.push(patientId);
    return "UNCONTROLLED" as const;
  },
});

describe("voidGlucoseCore", () => {
  it("ยกเลิกค่า: ทำเครื่องหมาย, ยกเลิก Alert ที่ค้าง, ประเมินใหม่ และบันทึก audit", async () => {
    const { tx, calls } = fakeTx({ glucose: { ...GLUCOSE }, alertsCancelled: 1 });
    const recomputed: string[] = [];
    const r = await voidGlucoseCore(tx, params(recomputed));
    expect(r).toEqual({ kind: "voided", alertsCancelled: 1, levelAfter: "UNCONTROLLED" });
    expect(recomputed).toEqual(["p1"]);
    expect(calls.alertWhere[0]).toEqual({ glucoseReadingId: "r1", status: { in: ["NEW", "ACKNOWLEDGED"] } });
    expect(calls.audits).toHaveLength(1);
    expect(calls.audits[0].action).toBe("VOID");
    expect(calls.audits[0].after.voidReason).toBe("กรอกผิดคน");
  });

  it("ไม่พบรายการ: ไม่แตะข้อมูลใด ๆ", async () => {
    const { tx, calls } = fakeTx({ glucose: null });
    expect(await voidGlucoseCore(tx, params())).toEqual({ kind: "not_found" });
    expect(calls.marked).toHaveLength(0);
    expect(calls.audits).toHaveLength(0);
  });

  it("ยกเลิกไปแล้ว: ไม่ยกเลิกซ้ำ", async () => {
    const { tx, calls } = fakeTx({ glucose: { ...GLUCOSE, voidedAt: NOW } });
    expect(await voidGlucoseCore(tx, params())).toEqual({ kind: "already" });
    expect(calls.marked).toHaveLength(0);
  });

  it("แพ้การแข่งกับผู้ใช้อื่น: ไม่ยกเลิก Alert ไม่ประเมินใหม่ ไม่เขียน audit", async () => {
    const { tx, calls } = fakeTx({ glucose: { ...GLUCOSE }, lostRace: true });
    const recomputed: string[] = [];
    expect(await voidGlucoseCore(tx, params(recomputed))).toEqual({ kind: "already" });
    expect(calls.alertWhere).toHaveLength(0);
    expect(recomputed).toHaveLength(0);
    expect(calls.audits).toHaveLength(0);
  });
});

describe("voidLabCore", () => {
  it("ยกเลิก Alert โดยอ้างอิงจาก labRecordId", async () => {
    const { tx, calls } = fakeTx({ lab: { ...LAB }, alertsCancelled: 1 });
    expect((await voidLabCore(tx, params())).kind).toBe("voided");
    expect(calls.alertWhere[0]).toEqual({ labRecordId: "r1", status: { in: ["NEW", "ACKNOWLEDGED"] } });
  });
});
