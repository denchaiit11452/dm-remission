import { describe, expect, it } from "vitest";
import { presetRange } from "./dashboard-range";
import {
  buildDashboardStats, buildRemissionTimeline, buildRiskRows, labBandOf, LAB_BANDS, latestLabValue, remissionPhaseAt,
  type DashboardLab, type DashboardPatient,
} from "./dashboard-stats";
import { DEFAULT_RISK_RULES } from "./risk/rules";
import type { RiskRules } from "./risk/types";

const TODAY = "2026-11-04";
const RULES: RiskRules = { ...DEFAULT_RISK_RULES, watchAbove: 200, watchBelow: 70, highAbove: 300, highBelow: 60, criticalGlucoseAbove: 400, criticalGlucoseBelow: 50 };

function lab(date: string, values: Partial<DashboardLab>): DashboardLab {
  return { date, hba1c: null, fbs: null, weightKg: null, bmi: null, sbp: null, dbp: null, ...values };
}

function patient(values: Partial<DashboardPatient> = {}): DashboardPatient {
  return {
    id: "p1", hn: "1", name: "ทดสอบ", createdDate: "2025-01-01", level: null, isStale: false, reason: null, eventDate: null,
    hasOpenAlert: false, noDrugConfirmedDate: null, labs: [], medications: [], ...values,
  };
}

/** หยุดยา 1 ม.ค. ครบ 90 วันวันที่ 1 เม.ย. และมี HbA1c ผ่านเกณฑ์ */
const remissionPatient = patient({
  medications: [{ startDate: "2024-01-01", endDate: "2026-01-01", isDiabetesDrug: true }],
  labs: [lab("2026-03-01", { hba1c: 5.5 })],
});

describe("remissionPhaseAt", () => {
  it("เข้าเกณฑ์เมื่อหยุดยาครบกำหนด และก่อนหน้านั้นยังไม่เข้าเกณฑ์", () => {
    const timeline = buildRemissionTimeline(remissionPatient, RULES);
    expect(remissionPhaseAt(timeline, "2026-03-31")).toBe("NOT_IN_REMISSION");
    expect(remissionPhaseAt(timeline, "2026-04-01")).toBe("REMISSION");
    expect(remissionPhaseAt(timeline, TODAY)).toBe("REMISSION");
  });

  it("ก่อนมีข้อมูลใด ๆ ถือว่าข้อมูลไม่พอ", () => {
    expect(remissionPhaseAt(buildRemissionTimeline(remissionPatient, RULES), "2020-01-01")).toBe("INSUFFICIENT_DATA");
    expect(remissionPhaseAt(buildRemissionTimeline(patient(), RULES), TODAY)).toBe("INSUFFICIENT_DATA");
  });

  it("เคยเข้าเกณฑ์แล้ว HbA1c กลับสูง นับว่าหลุดตั้งแต่วันนั้น", () => {
    const timeline = buildRemissionTimeline(
      { ...remissionPatient, labs: [...remissionPatient.labs, lab("2026-09-01", { hba1c: 7 })] },
      RULES,
    );
    expect(remissionPhaseAt(timeline, "2026-08-31")).toBe("REMISSION");
    expect(remissionPhaseAt(timeline, "2026-09-01")).toBe("LOST_REMISSION");
  });

  it("เคยเข้าเกณฑ์แล้วกลับมาใช้ยา นับว่าหลุด", () => {
    const timeline = buildRemissionTimeline(
      { ...remissionPatient, medications: [...remissionPatient.medications, { startDate: "2026-10-01", endDate: null, isDiabetesDrug: true }] },
      RULES,
    );
    expect(remissionPhaseAt(timeline, TODAY)).toBe("LOST_REMISSION");
  });

  it("ไม่เคยเข้าเกณฑ์ ไม่นับว่าหลุด", () => {
    const timeline = buildRemissionTimeline(
      patient({ medications: [{ startDate: "2024-01-01", endDate: null, isDiabetesDrug: true }], labs: [lab("2026-09-01", { hba1c: 8 })] }),
      RULES,
    );
    expect(remissionPhaseAt(timeline, TODAY)).toBe("NOT_IN_REMISSION");
  });

  it("แพทย์ยืนยันไม่เคยใช้ยา มีผลตั้งแต่วันที่ยืนยัน", () => {
    const timeline = buildRemissionTimeline(
      patient({ noDrugConfirmedDate: "2026-06-01", labs: [lab("2026-03-01", { hba1c: 5.5 })] }),
      RULES,
    );
    expect(remissionPhaseAt(timeline, "2026-05-31")).toBe("INSUFFICIENT_DATA");
    expect(remissionPhaseAt(timeline, "2026-06-01")).toBe("REMISSION");
  });

  it("ผลวันนี้ตรงกับ assessRemission เมื่อ HbA1c เท่ากับเกณฑ์ (ไม่ผ่าน)", () => {
    const timeline = buildRemissionTimeline(
      { ...remissionPatient, labs: [lab("2026-03-01", { hba1c: RULES.remissionHba1cMax })] },
      RULES,
    );
    expect(remissionPhaseAt(timeline, TODAY)).toBe("NOT_IN_REMISSION");
  });
});

describe("labBandOf", () => {
  it.each([[5.6, "NORMAL"], [5.7, "RISK"], [6.4, "RISK"], [6.5, "DIABETES"]] as const)("HbA1c %s = %s", (value, band) => {
    expect(labBandOf(value, LAB_BANDS.hba1c)).toBe(band);
  });
  it.each([[99, "NORMAL"], [100, "RISK"], [125, "RISK"], [126, "DIABETES"]] as const)("FBS %s = %s", (value, band) => {
    expect(labBandOf(value, LAB_BANDS.fbs)).toBe(band);
  });
});

describe("latestLabValue", () => {
  const labs = [lab("2026-01-01", { hba1c: 8 }), lab("2026-06-01", { hba1c: 7 }), lab("2026-06-01", { hba1c: 7.2 }), lab("2026-07-01", { fbs: 120 })];
  it("ใช้ค่าล่าสุด ณ วันที่กำหนด และข้ามแถวที่ไม่มีค่านั้น", () => {
    expect(latestLabValue(labs, "hba1c", "2026-03-01")).toBe(8);
    expect(latestLabValue(labs, "hba1c", TODAY)).toBe(7.2);
    expect(latestLabValue(labs, "hba1c", "2025-01-01")).toBeNull();
  });
});

describe("buildRiskRows", () => {
  const rowOf = (rows: ReturnType<typeof buildRiskRows>, key: string) => rows.find((row) => row.key === key);

  it("นับจำนวนและข้อมูลเก่าแยกตามระดับ โดยคนที่ไม่มีข้อมูลอยู่กลุ่ม NONE", () => {
    const rows = buildRiskRows(
      [{ level: "WATCH", isStale: true }, { level: "WATCH", isStale: false }, { level: null, isStale: false }],
      DEFAULT_RISK_RULES,
    );
    expect(rowOf(rows, "WATCH")).toMatchObject({ count: 2, stale: 1, awaitingThreshold: false });
    expect(rowOf(rows, "NONE")).toMatchObject({ count: 1, stale: 0, awaitingThreshold: false });
  });

  it("ระดับที่ยังไม่มีเกณฑ์และไม่มีผู้ป่วยแสดงว่ารอเกณฑ์ ส่วนระดับที่มีเกณฑ์เป็น 0 จริง", () => {
    const rows = buildRiskRows([], DEFAULT_RISK_RULES);
    expect(rowOf(rows, "CRITICAL")?.awaitingThreshold).toBe(true);
    expect(rowOf(rows, "WELL_CONTROLLED")).toMatchObject({ count: 0, awaitingThreshold: false });
  });
});

describe("buildDashboardStats", () => {
  const build = (patients: DashboardPatient[], rules: RiskRules = RULES, ruleSetMissing = false) =>
    buildDashboardStats({ patients, rules, ruleSetMissing, range: presetRange("12m", TODAY), today: TODAY });

  it("นับระดับความเสี่ยงและข้อมูลเก่า โดยเรียงจากรุนแรงไปเบา", () => {
    const stats = build([
      patient({ id: "a", level: "CRITICAL" }),
      patient({ id: "b", level: "HIGH", isStale: true }),
      patient({ id: "c", level: "WELL_CONTROLLED", isStale: true }),
      patient({ id: "d" }),
    ]);
    expect(stats.risk.rows.map((r) => r.key)).toEqual(["CRITICAL", "HIGH", "WATCH", "UNCONTROLLED", "WELL_CONTROLLED", "NONE"]);
    expect(stats.risk.rows.find((r) => r.key === "HIGH")).toMatchObject({ count: 1, stale: 1 });
    expect(stats.risk.staleTotal).toBe(2);
    expect(stats.risk.noData).toBe(1);
    expect(stats.risk.severeUnassessable).toBe(false);
  });

  it("เกณฑ์ยังไม่ครบ: ระดับที่ว่างรอแพทย์ และไม่แสดงว่าไม่มีผู้ป่วยรุนแรง", () => {
    const stats = build([patient({ level: "UNCONTROLLED" })], DEFAULT_RISK_RULES);
    expect(stats.risk.rows.find((r) => r.key === "CRITICAL")?.awaitingThreshold).toBe(true);
    expect(stats.risk.rows.find((r) => r.key === "UNCONTROLLED")?.awaitingThreshold).toBe(false);
    expect(stats.risk.severeUnassessable).toBe(true);
  });

  it("เกณฑ์น้ำตาลยังไม่ครบแต่มีผู้ป่วยวิกฤตจากความดัน ต้องแสดงจำนวนจริง", () => {
    const stats = build([patient({ level: "CRITICAL" })], DEFAULT_RISK_RULES);
    expect(stats.risk.rows.find((r) => r.key === "CRITICAL")).toMatchObject({ count: 1, awaitingThreshold: false });
    expect(stats.risk.severeUnassessable).toBe(false);
  });

  it("เกณฑ์ขาดเพียงฝั่งเดียว นับได้ 0 ก็ยังบอกไม่ได้ว่าไม่มีผู้ป่วย", () => {
    const stats = build([patient({ level: "UNCONTROLLED" })], { ...RULES, criticalGlucoseBelow: null });
    expect(stats.risk.severeUnassessable).toBe(true);
    expect(stats.risk.rows.find((r) => r.key === "CRITICAL")?.awaitingThreshold).toBe(true);
  });

  it("เกณฑ์ไม่ครบแต่มีผู้ป่วย แสดงจำนวนพร้อมสถานะว่าอาจไม่ครบ และนับข้อมูลเก่า", () => {
    const stats = build([patient({ level: "CRITICAL", isStale: true })], DEFAULT_RISK_RULES);
    expect(stats.risk).toMatchObject({ critical: 1, severeStale: 1, severeThresholdsIncomplete: true, severeUnassessable: false });
  });

  it("ไม่มีชุดเกณฑ์ที่ใช้งาน: ไม่ประเมิน Remission และไม่มีกราฟแนวโน้ม", () => {
    const stats = build([remissionPatient], DEFAULT_RISK_RULES, true);
    expect(stats.remission.assessable).toBe(false);
    expect(stats.trend).toEqual([]);
  });

  it("แนวโน้มนับคนเข้าเกณฑ์และหลุดตามวันที่", () => {
    const lost = { ...remissionPatient, id: "x", labs: [...remissionPatient.labs, lab("2026-09-01", { hba1c: 7 })] };
    const stats = build([remissionPatient, lost]);
    expect(stats.trend).toHaveLength(12);
    expect(stats.trend[0]).toMatchObject({ date: "2025-12-31", remission: 0, lost: 0 });
    expect(stats.trend.find((p) => p.date === "2026-08-31")).toMatchObject({ remission: 2, lost: 0 });
    expect(stats.trend.at(-1)).toMatchObject({ date: TODAY, remission: 1, lost: 1 });
    expect(stats.remission.counts).toMatchObject({ REMISSION: 1, LOST_REMISSION: 1 });
  });

  it("ตัวชี้วัดเฉลี่ยจากค่าล่าสุดของแต่ละคน และเทียบ 6 เดือนก่อน", () => {
    const stats = build([
      patient({ id: "a", labs: [lab("2026-01-01", { hba1c: 8 }), lab("2026-10-01", { hba1c: 7 })] }),
      patient({ id: "b", labs: [lab("2026-01-01", { hba1c: 7 })] }),
    ]);
    const hba1c = stats.metrics.find((m) => m.key === "hba1c");
    expect(hba1c).toMatchObject({ latest: "7.0%", change: "-0.5", coverage: 2 });
    expect(stats.comparisonLabel).toBe("เทียบ 6 เดือนก่อน");
  });

  it("ช่วงที่เลือกเอง: ค่าล่าสุดเป็น ณ วันสิ้นสุดช่วง และเทียบต้นช่วง", () => {
    const stats = buildDashboardStats({
      patients: [patient({ labs: [lab("2026-01-01", { hba1c: 9 }), lab("2026-03-01", { hba1c: 8 }), lab("2026-10-01", { hba1c: 6 })] })],
      rules: RULES, ruleSetMissing: false, today: TODAY,
      range: { preset: null, from: "2026-02-01", to: "2026-04-01" },
    });
    expect(stats.metrics[0]).toMatchObject({ latest: "8.0%", change: "-1.0", coverage: 1, baselineCoverage: 1 });
    expect(stats.comparisonLabel).toBe("เทียบต้นช่วง");
  });

  it("บอกจำนวนผู้ป่วย ณ จุดเทียบ เมื่อกลุ่มไม่เท่ากับปัจจุบัน", () => {
    const stats = build([patient({ id: "a", labs: [lab("2026-01-01", { hba1c: 8 })] }), patient({ id: "b", labs: [lab("2026-10-01", { hba1c: 7 })] })]);
    expect(stats.metrics[0]).toMatchObject({ coverage: 2, baselineCoverage: 1 });
  });

  it("ความดันแสดงทั้งตัวบนและตัวล่าง", () => {
    const stats = build([patient({ labs: [lab("2026-01-01", { sbp: 140, dbp: 90 }), lab("2026-10-01", { sbp: 130, dbp: 92 })] })]);
    expect(stats.metrics.find((m) => m.key === "sbp")).toMatchObject({ latest: "130/92 mmHg", change: "-10/+2" });
  });

  it("ไม่มีข้อมูลตัวชี้วัด แสดงขีด", () => {
    expect(build([patient()]).metrics[0]).toMatchObject({ latest: "-", change: "-", coverage: 0 });
  });

  it("แยกช่วงค่า HbA1c และนับผู้ที่ไม่มีผล", () => {
    const stats = build([patient({ id: "a", labs: [lab("2026-10-01", { hba1c: 5 })] }), patient({ id: "b", labs: [lab("2026-10-01", { hba1c: 9 })] }), patient({ id: "c" })]);
    expect(stats.bands.hba1c).toEqual({ counts: { NORMAL: 1, RISK: 0, DIABETES: 1 }, tested: 2, untested: 1 });
  });

  it("รายชื่อรุนแรงเรียงวิกฤตก่อน แล้ววันที่ล่าสุด และจำกัด 5 ราย", () => {
    const rows = Array.from({ length: 6 }, (_, i) => patient({ id: `h${i}`, hn: `${i}`, level: "HIGH", eventDate: `2026-10-0${i + 1}` }));
    const stats = build([...rows, patient({ id: "c", level: "CRITICAL", eventDate: "2026-01-01" })]);
    expect(stats.severe.total).toBe(7);
    expect(stats.severe.rows).toHaveLength(5);
    expect(stats.severe.rows[0].id).toBe("c");
    expect(stats.severe.rows[1].id).toBe("h5");
  });

  it("นับผู้ป่วยใหม่ใน 30 วัน", () => {
    expect(build([patient({ createdDate: "2026-10-20" }), patient({ createdDate: "2026-01-01" })]).newLast30Days).toBe(1);
  });
});
