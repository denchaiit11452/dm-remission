import { describe, expect, it } from "vitest";
import { TEST_RULES } from "./risk/fixtures";
import { buildDailyHistory, parseHistoryRange, weekdayName } from "./history";
import type { GlucoseReadingInput } from "./risk/types";

const rules = { ...TEST_RULES, goodMin: 80, goodMax: 140, watchAbove: 200, highAbove: 300, criticalGlucoseAbove: 400, watchBelow: 70, highBelow: 60, criticalGlucoseBelow: 50 };

let n = 0;
const r = (o: Partial<GlucoseReadingInput> & Pick<GlucoseReadingInput, "measuredDate" | "period">): GlucoseReadingInput => ({
  id: `r${++n}`, valueMgDl: 100, meterFlag: "NONE", isVoided: false, ...o,
});

describe("weekdayName", () => {
  it("14 ต.ค. 2026 เป็นวันพุธ", () => expect(weekdayName("2026-10-14")).toBe("วันพุธ"));
});

describe("buildDailyHistory", () => {
  const base = { rules, from: "2026-10-08", to: "2026-10-14", latestDate: "2026-10-14" };

  it("สร้างครบทุกวันในช่วง เรียงใหม่ไปเก่า และวันที่ไม่มีข้อมูลเป็น recorded=false", () => {
    const h = buildDailyHistory({ ...base, readings: [r({ measuredDate: "2026-10-14", period: "BEFORE_BREAKFAST" })] });
    expect(h.days.map((d) => d.date)).toEqual(["2026-10-14", "2026-10-13", "2026-10-12", "2026-10-11", "2026-10-10", "2026-10-09", "2026-10-08"]);
    expect(h.days[0].recorded).toBe(true);
    expect(h.days[1].recorded).toBe(false);
    expect(h.days[1].level).toBeNull();
    expect(h.stats.unrecordedDays).toHaveLength(6);
  });

  it("ติดป้ายล่าสุดเฉพาะวันที่วัดล่าสุด", () => {
    const h = buildDailyHistory({ ...base, readings: [] });
    expect(h.days.filter((d) => d.isLatest).map((d) => d.date)).toEqual(["2026-10-14"]);
  });

  it("ระดับของวัน = ค่าที่แย่ที่สุดของวัน", () => {
    const h = buildDailyHistory({
      ...base,
      readings: [
        r({ measuredDate: "2026-10-14", period: "BEFORE_BREAKFAST", valueMgDl: 132 }),
        r({ measuredDate: "2026-10-14", period: "AFTER_DINNER", valueMgDl: 452 }),
      ],
    });
    expect(h.days[0].level).toBe("CRITICAL");
    expect(h.days[0].cells.BEFORE_BREAKFAST.primary?.level).toBe("WELL_CONTROLLED");
    expect(h.days[0].cells.AFTER_DINNER.primary?.direction).toBe("HIGH");
  });

  it("ค่าวัดซ้ำ: แสดงค่าที่แย่ที่สุดเป็นหลัก ที่เหลือเป็น repeats (ไม่ขึ้นกับลำดับที่ส่งเข้ามา)", () => {
    const a = r({ measuredDate: "2026-10-12", period: "AFTER_DINNER", valueMgDl: 118 });
    const b = r({ measuredDate: "2026-10-12", period: "AFTER_DINNER", valueMgDl: 142 });
    for (const readings of [[a, b], [b, a]]) {
      const cell = buildDailyHistory({ ...base, readings }).days[2].cells.AFTER_DINNER;
      expect(cell.primary?.valueMgDl).toBe(142);
      expect(cell.repeats.map((x) => x.valueMgDl)).toEqual([118]);
    }
  });

  it("ค่าต่ำที่สุดถือว่าแย่ที่สุดเมื่อต่ำทั้งคู่", () => {
    const readings = [
      r({ measuredDate: "2026-10-10", period: "BEFORE_BREAKFAST", valueMgDl: 76 }),
      r({ measuredDate: "2026-10-10", period: "BEFORE_BREAKFAST", valueMgDl: 72 }),
    ];
    expect(buildDailyHistory({ ...base, readings }).days[4].cells.BEFORE_BREAKFAST.primary?.valueMgDl).toBe(72);
  });

  it("LO/HI จากเครื่องเป็นวิกฤตและไม่ถูกนับในค่าเฉลี่ย", () => {
    const h = buildDailyHistory({
      ...base,
      readings: [
        r({ measuredDate: "2026-10-14", period: "AFTER_DINNER", valueMgDl: null, meterFlag: "METER_HIGH" }),
        r({ measuredDate: "2026-10-14", period: "BEFORE_DINNER", valueMgDl: 100 }),
      ],
    });
    expect(h.days[0].level).toBe("CRITICAL");
    expect(h.stats.valueCount).toBe(1);
    expect(h.stats.mean).toBe(100);
  });

  it("ข้ามรายการที่ยกเลิก และนอกช่วงวันที่", () => {
    const h = buildDailyHistory({
      ...base,
      readings: [
        r({ measuredDate: "2026-10-14", period: "BEFORE_BREAKFAST", isVoided: true }),
        r({ measuredDate: "2026-10-07", period: "BEFORE_BREAKFAST" }),
        r({ measuredDate: "2026-10-15", period: "BEFORE_BREAKFAST" }),
      ],
    });
    expect(h.stats.valueCount).toBe(0);
    expect(h.stats.mean).toBeNull();
    expect(h.stats.inRangePercent).toBeNull();
    expect(h.days[0].recorded).toBe(false);
  });

  it("สถิติ: ค่าเฉลี่ยและสัดส่วนอยู่ในช่วง 80–140 (รวมขอบ)", () => {
    const readings = [80, 140, 141, 79].map((v, i) => r({ measuredDate: "2026-10-14", period: PERIODS_4[i], valueMgDl: v }));
    const s = buildDailyHistory({ ...base, readings }).stats;
    expect(s.valueCount).toBe(4);
    expect(s.inRangeCount).toBe(2);
    expect(s.inRangePercent).toBe(50);
    expect(s.mean).toBe(110);
  });

  it("ช่วงผิดปกติ = error", () => {
    expect(() => buildDailyHistory({ ...base, readings: [], from: "2026-10-14", to: "2026-10-08" })).toThrow();
    expect(() => buildDailyHistory({ ...base, readings: [], from: "2026-01-01", to: "2026-10-08" })).toThrow();
  });
});

const PERIODS_4 = ["BEFORE_BREAKFAST", "AFTER_BREAKFAST", "BEFORE_DINNER", "AFTER_DINNER"] as const;

describe("parseHistoryRange", () => {
  const latest = "2026-10-14";
  const today = "2026-10-15";
  it("ค่าเริ่มต้น 7 วันจบที่วันที่วัดล่าสุด", () => {
    expect(parseHistoryRange({}, latest, today)).toEqual({ from: "2026-10-08", to: "2026-10-14", preset: 7, custom: false });
  });
  it("ไม่มีข้อมูลเลยใช้วันนี้", () => {
    expect(parseHistoryRange({}, null, today).to).toBe(today);
  });
  it("preset 14 / 30 และค่าอื่นถูกทิ้ง", () => {
    expect(parseHistoryRange({ range: "14" }, latest, today).from).toBe("2026-10-01");
    expect(parseHistoryRange({ range: "30" }, latest, today).preset).toBe(30);
    expect(parseHistoryRange({ range: "5" }, latest, today).preset).toBe(7);
  });
  it("กำหนดเอง และปฏิเสธช่วงที่ผิด/ยาวเกิน", () => {
    expect(parseHistoryRange({ from: "2026-09-01", to: "2026-09-10" }, latest, today)).toEqual({ from: "2026-09-01", to: "2026-09-10", preset: null, custom: true });
    expect(parseHistoryRange({ from: "2026-09-10", to: "2026-09-01" }, latest, today).custom).toBe(false);
    expect(parseHistoryRange({ from: "2026-01-01", to: "2026-10-01" }, latest, today).custom).toBe(false);
    expect(parseHistoryRange({ from: "2026-02-31", to: "2026-03-05" }, latest, today).custom).toBe(false);
  });
  it("days (โหลดเพิ่ม) ใช้ได้ถึง 90 วัน", () => {
    expect(parseHistoryRange({ days: "21" }, latest, today)).toMatchObject({ from: "2026-09-24", preset: null });
    expect(parseHistoryRange({ days: "500" }, latest, today).preset).toBe(7);
  });
});
