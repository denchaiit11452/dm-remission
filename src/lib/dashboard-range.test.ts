import { describe, expect, it } from "vitest";
import {
  addMonths, buildRangeQuery, comparisonOf, inclusiveDays, monthGrid, nextDraft, parseDashboardRange,
  presetRange, rangeGranularity, trendDates, trendLabel,
} from "./dashboard-range";

const TODAY = "2026-11-04";

describe("addMonths", () => {
  it("ใช้วันสุดท้ายของเดือนเมื่อเดือนปลายทางไม่มีวันนั้น", () => {
    expect(addMonths("2026-10-31", -1)).toBe("2026-09-30");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });
  it("ข้ามปีได้", () => expect(addMonths("2026-01-15", -2)).toBe("2025-11-15"));
});

describe("presetRange", () => {
  it("12 เดือนเริ่มวันที่ 1 ของ 11 เดือนก่อน", () => {
    expect(presetRange("12m", TODAY)).toEqual({ preset: "12m", from: "2025-12-01", to: TODAY });
  });
  it("3 เดือนนับย้อนจากวันนี้", () => {
    expect(presetRange("3m", TODAY)).toEqual({ preset: "3m", from: "2026-08-05", to: TODAY });
  });
});

describe("parseDashboardRange", () => {
  it("ไม่มีพารามิเตอร์ใช้ 12 เดือน", () => expect(parseDashboardRange({}, TODAY).preset).toBe("12m"));
  it("อ่านช่วงที่เลือกเอง", () => {
    expect(parseDashboardRange({ from: "2026-09-01", to: "2026-10-31" }, TODAY)).toEqual({ preset: null, from: "2026-09-01", to: "2026-10-31" });
  });
  it("ปุ่มเดือนมาก่อนวันที่", () => expect(parseDashboardRange({ range: "3m", from: "2026-09-01", to: "2026-10-31" }, TODAY).preset).toBe("3m"));
  it("ปรับวันสิ้นสุดในอนาคตเป็นวันนี้", () => expect(parseDashboardRange({ from: "2026-10-01", to: "2027-01-01" }, TODAY).to).toBe(TODAY));
  it.each([
    [{ from: "2026-02-31", to: "2026-03-01" }],
    [{ from: "2026-10-05", to: "2026-10-01" }],
    [{ from: "1800-01-01", to: "2026-10-01" }],
    [{ from: "2027-01-01", to: "2027-02-01" }],
    [{ from: "abc", to: "2026-10-01" }],
    [{ range: "99m" }],
  ])("ค่าไม่ถูกต้องกลับไปใช้ค่าเริ่มต้น %j", (raw) => expect(parseDashboardRange(raw, TODAY).preset).toBe("12m"));
});

describe("buildRangeQuery", () => {
  it("ค่าเริ่มต้นไม่ใส่ใน URL", () => expect(buildRangeQuery({ preset: "12m", from: "x", to: "y" })).toBe(""));
  it("สร้างพารามิเตอร์ของปุ่มและวันที่", () => {
    expect(buildRangeQuery({ preset: "3m", from: "x", to: "y" })).toBe("?range=3m");
    expect(buildRangeQuery({ preset: null, from: "2026-09-01", to: "2026-10-31" })).toBe("?from=2026-09-01&to=2026-10-31");
  });
});

describe("rangeGranularity", () => {
  it("แบ่งตามจำนวนวันรวมทั้งสองฝั่ง", () => {
    expect(rangeGranularity("2026-10-01", "2026-10-31")).toBe("day");
    expect(rangeGranularity("2026-10-01", "2026-11-01")).toBe("week");
    expect(inclusiveDays("2026-09-01", "2026-10-31")).toBe(61);
    expect(rangeGranularity("2026-01-01", "2026-07-05")).toBe("week");
    expect(rangeGranularity("2026-01-01", "2026-07-06")).toBe("month");
  });
});

describe("trendDates", () => {
  it("รายวันครบทุกวัน", () => expect(trendDates("2026-10-01", "2026-10-03")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]));
  it("วันเดียวมีจุดเดียว", () => expect(trendDates("2026-10-01", "2026-10-01")).toEqual(["2026-10-01"]));
  it("รายสัปดาห์จบที่วันสิ้นสุดเสมอ", () => {
    const dates = trendDates("2026-09-01", "2026-10-31");
    expect(dates[0]).toBe("2026-09-01");
    expect(dates[1]).toBe("2026-09-08");
    expect(dates.at(-1)).toBe("2026-10-31");
  });
  it("รายเดือนใช้สิ้นเดือนและไม่ซ้ำวันสิ้นสุด", () => {
    const dates = trendDates("2025-12-01", TODAY);
    expect(dates).toHaveLength(12);
    expect(dates[0]).toBe("2025-12-31");
    expect(dates.at(-2)).toBe("2026-10-31");
    expect(dates.at(-1)).toBe(TODAY);
    expect(trendDates("2026-01-01", "2026-10-31").filter((d) => d === "2026-10-31")).toHaveLength(1);
  });
});

describe("trendLabel", () => {
  it("แสดงตามความละเอียดของจุด", () => {
    expect(trendLabel("2026-09-15", "week", 9)).toBe("15 ก.ย.");
    expect(trendLabel("2026-09-30", "month", 12)).toBe("ก.ย.");
    expect(trendLabel("2026-09-30", "month", 24)).toBe("ก.ย. 69");
  });
});

describe("comparisonOf", () => {
  it("เลือกเองเทียบต้นช่วง", () => {
    expect(comparisonOf({ preset: null, from: "2026-09-01", to: "2026-10-31" })).toEqual({ date: "2026-09-01", label: "เทียบต้นช่วง" });
  });
  it("ปุ่มเดือนเทียบ 6 เดือนก่อน แม้เลือก 3 เดือน", () => {
    expect(comparisonOf(presetRange("3m", TODAY))).toEqual({ date: "2026-05-04", label: "เทียบ 6 เดือนก่อน" });
  });
});

describe("monthGrid", () => {
  it("ตุลาคม 2026 เริ่มวันพฤหัสบดี และมี 5 แถว", () => {
    const weeks = monthGrid("2026-10-01");
    expect(weeks).toHaveLength(5);
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0][4]).toBe("2026-10-01");
    expect(weeks[4][6]).toBe("2026-10-31");
  });
});

describe("nextDraft", () => {
  it("เลือกวันเริ่มต้น แล้ววันสิ้นสุด", () => {
    const start = nextDraft({ from: null, to: null }, "2026-09-08");
    expect(start).toEqual({ from: "2026-09-08", to: null });
    expect(nextDraft(start, "2026-09-20")).toEqual({ from: "2026-09-08", to: "2026-09-20" });
  });
  it("เลือกวันเดียวได้", () => expect(nextDraft({ from: "2026-09-08", to: null }, "2026-09-08").to).toBe("2026-09-08"));
  it("กดวันก่อนวันเริ่มต้นเริ่มใหม่", () => expect(nextDraft({ from: "2026-09-08", to: null }, "2026-09-01")).toEqual({ from: "2026-09-01", to: null }));
  it("เลือกครบแล้วกดอีกครั้งเริ่มใหม่", () => expect(nextDraft({ from: "2026-09-08", to: "2026-09-20" }, "2026-09-25")).toEqual({ from: "2026-09-25", to: null }));
});
