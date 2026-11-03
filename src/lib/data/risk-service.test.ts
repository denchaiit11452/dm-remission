import { describe, expect, it, vi } from "vitest";
import { DEFAULT_RISK_RULES } from "@/lib/risk/rules";
import { recomputeRisk, type Tx } from "./risk-service";

const DAY = new Date("2026-10-14T00:00:00Z");
const ACTIVE = { id: "rule", version: 2, rules: DEFAULT_RISK_RULES };
const GLUCOSE = { id: "g-latest", measuredDate: DAY, period: "AFTER_DINNER", valueMgDl: 100, meterFlag: "NONE", voidedAt: null };
const LAB = { id: "l-latest", recordedDate: DAY, sbp: 120, dbp: 80, voidedAt: null };

function fakeTx(source: "AUTO" | "OVERRIDE") {
  const create = vi.fn(async () => ({ id: "new-row" }));
  const tx = {
    glucoseReading: { findFirst: async () => ({ measuredDate: DAY }), findMany: async () => [GLUCOSE] },
    labRecord: { findFirst: async () => ({ recordedDate: DAY }), findMany: async () => [LAB] },
    riskAssessment: { findFirst: async () => ({ level: "HIGH", source }), create },
  };
  return { tx: tx as unknown as Tx, create };
}

const run = (tx: Tx, trigger = {}) => recomputeRisk(tx, "p1", ACTIVE, "2026-10-15", trigger);

describe("recomputeRisk: การสิ้นสุด Override", () => {
  it("ไม่มี Override: เพิ่มแถว AUTO ตามปกติ", async () => {
    const { tx, create } = fakeTx("AUTO");
    const r = await run(tx);
    expect(create).toHaveBeenCalledOnce();
    expect(r.level).toBe("WELL_CONTROLLED");
    expect(r.overrideKept).toBe(false);
  });

  it("ค่าน้ำตาลใหม่ของวันล่าสุดล้าง Override", async () => {
    const { tx, create } = fakeTx("OVERRIDE");
    const r = await run(tx, { glucoseReadingId: "g-latest" });
    expect(create).toHaveBeenCalledOnce();
    expect(r.level).toBe("WELL_CONTROLLED");
  });

  it("ความดันใหม่ของวันล่าสุดล้าง Override", async () => {
    const { tx, create } = fakeTx("OVERRIDE");
    await run(tx, { labRecordId: "l-latest" });
    expect(create).toHaveBeenCalledOnce();
  });

  it.each([
    ["ผลตรวจที่ไม่มีความดัน เช่น FBS หรือน้ำหนัก", { labRecordId: "l-fbs-only" }],
    ["ค่าน้ำตาลย้อนหลังที่เก่ากว่าวันล่าสุด", { glucoseReadingId: "g-older" }],
    ["การยกเลิกรายการหรือการเปลี่ยนเกณฑ์ (ไม่มีค่าใหม่)", {}],
  ])("%s ไม่ล้าง Override", async (_name, trigger) => {
    const { tx, create } = fakeTx("OVERRIDE");
    const r = await run(tx, trigger);
    expect(create).not.toHaveBeenCalled();
    expect(r.level).toBe("HIGH");
    expect(r.overrideKept).toBe(true);
    expect(r.assessmentId).toBeNull();
  });
});
