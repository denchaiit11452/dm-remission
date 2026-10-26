import { describe, expect, it } from "vitest";
import type { RiskRuleSet } from "@prisma/client";
import { dateFromKey, toBloodPressureInput, toGlucoseInput, toRiskRules } from "./mappers";

describe("mappers", () => {
  it("dateFromKey / toGlucoseInput รักษาวันที่ไม่เลื่อนข้ามเขตเวลา", () => {
    expect(dateFromKey("2026-10-15").toISOString()).toBe("2026-10-15T00:00:00.000Z");
    const g = toGlucoseInput({ id: "g1", measuredDate: dateFromKey("2026-10-15"), period: "AFTER_DINNER", valueMgDl: 452, meterFlag: "NONE", voidedAt: null });
    expect(g).toEqual({ id: "g1", measuredDate: "2026-10-15", period: "AFTER_DINNER", valueMgDl: 452, meterFlag: "NONE", isVoided: false });
  });

  it("voidedAt ที่มีค่า = ถูกยกเลิก", () => {
    const g = toGlucoseInput({ id: "g1", measuredDate: dateFromKey("2026-10-15"), period: "BEFORE_DINNER", valueMgDl: 100, meterFlag: "NONE", voidedAt: new Date() });
    expect(g.isVoided).toBe(true);
    const b = toBloodPressureInput({ id: "l1", recordedDate: dateFromKey("2026-10-12"), sbp: 186, dbp: 102, voidedAt: null });
    expect(b).toEqual({ id: "l1", recordedDate: "2026-10-12", sbp: 186, dbp: 102, isVoided: false });
  });

  it("toRiskRules คงค่า null (เกณฑ์ที่แพทย์ยังไม่กำหนด)", () => {
    const row = {
      id: "r", version: 1, isActive: true, goodMin: 80, goodMax: 140,
      watchBelow: null, watchAbove: null, highBelow: null, highAbove: 300,
      criticalGlucoseBelow: null, criticalGlucoseAbove: 400, criticalSbp: 180, criticalDbp: 120,
      remissionHba1cMax: 6.5, remissionMedFreeDays: 90, staleDataDays: 7, alertOnHighRisk: false,
      changeReason: null, createdAt: new Date(), createdById: "u",
    } as RiskRuleSet;
    const r = toRiskRules(row);
    expect(r.watchBelow).toBeNull();
    expect(r.highAbove).toBe(300);
    expect(r.criticalGlucoseAbove).toBe(400);
    expect(r).not.toHaveProperty("version");
  });
});
