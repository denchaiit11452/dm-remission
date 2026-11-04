import { describe, expect, it } from "vitest";
import type { MetricRow } from "@/lib/dashboard-stats";
import { changeDirection, metricScale, metricValueAt } from "@/lib/metric-chart";

function row(overrides: Partial<MetricRow>): MetricRow {
  return { key: "x", label: "x", latest: "-", change: "-", coverage: 0, baselineCoverage: 0, points: [], pointCoverage: [], unit: "", decimals: 1, ...overrides };
}

describe("metricScale", () => {
  it("แกนครอบทุกค่าและเส้นอ้างอิง และเลขแกนเรียงจากต่ำไปสูง", () => {
    const scale = metricScale([6.8, 7.4], 1, 6.5);
    expect(scale.min).toBeLessThanOrEqual(6.5);
    expect(scale.max).toBeGreaterThanOrEqual(7.4);
    expect(scale.ticks[0]).toBe(scale.min);
    expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max);
  });

  it("ค่าคงที่ได้ช่วงแกนขั้นต่ำ ไม่หารด้วยศูนย์", () => {
    const scale = metricScale([72, 72], 1);
    expect(scale.max).toBeGreaterThan(scale.min);
    expect(scale.min).toBeLessThanOrEqual(72);
    expect(scale.max).toBeGreaterThanOrEqual(72);
  });

  it("เลขแกนไม่มีเศษทศนิยมยาวจากการคำนวณ", () => {
    for (const tick of metricScale([0.1, 0.7], 1).ticks) expect(String(tick).length).toBeLessThanOrEqual(4);
  });

  it("ความดันตัวบนและตัวล่างใช้แกนที่ไม่กว้างเกินจริง", () => {
    expect(metricScale([84, 145], 0)).toEqual({ min: 75, max: 150, ticks: [75, 100, 125, 150] });
  });

  it("ไม่มีข้อมูลยังคืนแกนที่ใช้ได้", () => {
    expect(metricScale([], 1)).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });
});

describe("metricValueAt", () => {
  it("แยกตัวเลขกับหน่วยตามจำนวนทศนิยม", () => {
    expect(metricValueAt(row({ points: [7], unit: "%" }), 0)).toEqual({ value: "7.0", unit: "%" });
  });

  it("ยังไม่มีข้อมูลคืน null ไม่ใช่ 0", () => {
    expect(metricValueAt(row({ points: [null, 7] }), 0)).toBeNull();
  });

  it("ความดันต้องมีครบสองค่า", () => {
    const metric = row({ points: [130, 128], secondaryPoints: [null, 82], unit: "mmHg", decimals: 0 });
    expect(metricValueAt(metric, 0)).toBeNull();
    expect(metricValueAt(metric, 1)).toEqual({ value: "128/82", unit: "mmHg" });
  });
});

describe("changeDirection", () => {
  it.each([["+1.2", "up"], ["-0.5", "down"], ["0.0", null], ["-", null], ["-10/+2", null]] as const)("%s", (change, direction) => {
    expect(changeDirection(change)).toBe(direction);
  });
});
