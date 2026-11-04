// สรุปตัวเลขของหน้าภาพรวมจากข้อมูลผู้ป่วยทั้งหมด (ฟังก์ชันล้วน ไม่ต่อฐานข้อมูล ทดสอบได้)
// ใช้ assessRemission และระดับความเสี่ยงที่ระบบคำนวณไว้แล้ว ไม่มีสูตรทางคลินิกซ้ำในไฟล์นี้
// ยกเว้น 2 จุดที่ระบุชัด: นิยาม "หลุดจากภาวะสงบ" และช่วงค่า HbA1c/FBS
import { addDays } from "@/lib/date";
import { comparisonOf, rangeGranularity, trendDates, trendLabel, type DashboardRange, type Granularity } from "@/lib/dashboard-range";
import { assessRemission, type Hba1cInput, type MedicationPeriodInput, type RemissionStatus } from "@/lib/remission/remission";
import { severity } from "@/lib/risk/levels";
import { findMissingThresholds } from "@/lib/risk/rules";
import type { RiskLevel, RiskRules } from "@/lib/risk/types";

// ---------------------------------------------------------------- ข้อมูลเข้า
export type DashboardLab = {
  date: string;
  hba1c: number | null;
  fbs: number | null;
  weightKg: number | null;
  bmi: number | null;
  sbp: number | null;
  dbp: number | null;
};

export type DashboardPatient = {
  id: string;
  hn: string;
  name: string;
  createdDate: string;
  /** null = ยังไม่มีข้อมูลให้ประเมิน */
  level: RiskLevel | null;
  isStale: boolean;
  /** ข้อความเหตุผลของระดับปัจจุบัน */
  reason: string | null;
  /** วันที่ของค่าที่ทำให้ได้ระดับนี้ */
  eventDate: string | null;
  hasOpenAlert: boolean;
  noDrugConfirmedDate: string | null;
  labs: DashboardLab[];
  medications: MedicationPeriodInput[];
};

// ---------------------------------------------------------------- สถานะ Remission ตามเวลา
export type RemissionPhase = "REMISSION" | "LOST_REMISSION" | "NOT_IN_REMISSION" | "INSUFFICIENT_DATA";

type TimelinePoint = { date: string; status: RemissionStatus; everInRemission: boolean };

type RemissionRules = Pick<RiskRules, "remissionHba1cMax" | "remissionMedFreeDays" | "remissionHba1cMinDaysAfterStop">;

/**
 * สถานะ Remission เปลี่ยนได้เฉพาะวันที่มีเหตุการณ์ (ผล HbA1c, เริ่ม/หยุดยา, ครบกำหนดหยุดยา, แพทย์ยืนยัน)
 * จึงประเมินเฉพาะวันเหล่านั้น แล้วใช้ค่าล่าสุดสำหรับวันที่อยู่ระหว่างกลาง
 * ใช้เกณฑ์ปัจจุบันกับทุกวัน ผลย้อนหลังจึงอาจต่างจากตอนนั้นถ้าเคยแก้เกณฑ์
 */
export function buildRemissionTimeline(patient: DashboardPatient, rules: RemissionRules): TimelinePoint[] {
  const hba1cRecords: Hba1cInput[] = patient.labs
    .filter((lab) => lab.hba1c !== null)
    .map((lab, index) => ({ id: String(index), recordedDate: lab.date, hba1c: lab.hba1c, isVoided: false }));

  const dates = new Set<string>(hba1cRecords.map((r) => r.recordedDate));
  for (const med of patient.medications) {
    if (!med.isDiabetesDrug) continue;
    dates.add(med.startDate);
    if (med.endDate) {
      dates.add(med.endDate);
      dates.add(addDays(med.endDate, rules.remissionMedFreeDays));
    }
  }
  if (patient.noDrugConfirmedDate) dates.add(patient.noDrugConfirmedDate);

  let everInRemission = false;
  return [...dates].sort().map((date) => {
    const { status } = assessRemission({
      hba1cRecords,
      medications: patient.medications,
      asOf: date,
      rules,
      neverMedicatedConfirmed: patient.noDrugConfirmedDate !== null && patient.noDrugConfirmedDate <= date,
    });
    everInRemission ||= status === "REMISSION";
    return { date, status, everInRemission };
  });
}

/**
 * นิยาม "หลุดจากภาวะสงบ" (ผู้ใช้เลือกเมื่อ 2026-11-04 รอแพทย์ยืนยัน):
 * เคยเข้าเกณฑ์ภาวะสงบ แล้ว ณ วันนั้นไม่เข้าเกณฑ์
 * กรณีข้อมูลไม่พอประเมินไม่นับว่าหลุด เพราะยังยืนยันไม่ได้
 */
export function remissionPhaseAt(timeline: TimelinePoint[], date: string): RemissionPhase {
  let current: TimelinePoint | null = null;
  for (const point of timeline) {
    if (point.date > date) break;
    current = point;
  }
  if (!current) return "INSUFFICIENT_DATA";
  if (current.status === "REMISSION") return "REMISSION";
  if (current.status === "INSUFFICIENT_DATA") return "INSUFFICIENT_DATA";
  return current.everInRemission ? "LOST_REMISSION" : "NOT_IN_REMISSION";
}

// ---------------------------------------------------------------- ช่วงค่า HbA1c / FBS
export type LabBandKey = "NORMAL" | "RISK" | "DIABETES";

export const LAB_BAND_LABELS: Record<LabBandKey, string> = { NORMAL: "ปกติ", RISK: "เสี่ยง", DIABETES: "เบาหวาน" };

/**
 * ช่วงค่าตาม CLAUDE.md ใช้แสดงการกระจายเท่านั้น ไม่เกี่ยวกับเกณฑ์ Remission ในหน้าตั้งค่า
 * เส้นแบ่งปกติของ HbA1c (5.7 หรือ 6.0) ยังรอแพทย์ยืนยัน
 */
export const LAB_BANDS = {
  hba1c: { normalBelow: 5.7, diabetesFrom: 6.5, ranges: { NORMAL: "< 5.7%", RISK: "5.7–6.4%", DIABETES: "≥ 6.5%" } },
  fbs: { normalBelow: 100, diabetesFrom: 126, ranges: { NORMAL: "< 100 mg/dL", RISK: "100–125 mg/dL", DIABETES: "≥ 126 mg/dL" } },
} as const;

export function labBandOf(value: number, band: { normalBelow: number; diabetesFrom: number }): LabBandKey {
  if (value < band.normalBelow) return "NORMAL";
  return value < band.diabetesFrom ? "RISK" : "DIABETES";
}

// ---------------------------------------------------------------- ค่าล่าสุด
type LabNumberKey = "hba1c" | "fbs" | "weightKg" | "bmi" | "sbp" | "dbp";

/** ค่าล่าสุด ณ วันที่กำหนด ถ้าวันเดียวกันมีหลายค่าใช้ค่าสูงสุด ตามแนวทางเดียวกับ assessRemission */
export function latestLabValue(labs: DashboardLab[], key: LabNumberKey, asOf: string): number | null {
  let latestDate: string | null = null;
  let value: number | null = null;
  for (const lab of labs) {
    const current = lab[key];
    if (current === null || lab.date > asOf) continue;
    if (latestDate === null || lab.date > latestDate) {
      latestDate = lab.date;
      value = current;
    } else if (lab.date === latestDate && value !== null && current > value) {
      value = current;
    }
  }
  return value;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function programMean(patients: DashboardPatient[], key: LabNumberKey, asOf: string): { value: number | null; count: number } {
  const values = patients.flatMap((p) => {
    const value = latestLabValue(p.labs, key, asOf);
    return value === null ? [] : [value];
  });
  return { value: mean(values), count: values.length };
}

function formatSigned(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals));
  const text = Math.abs(rounded).toFixed(decimals);
  if (rounded === 0) return text;
  return `${rounded > 0 ? "+" : "-"}${text}`;
}

// ---------------------------------------------------------------- ผลลัพธ์
export type RiskRowKey = RiskLevel | "NONE";

export type RiskRow = {
  key: RiskRowKey;
  count: number;
  stale: number;
  /** ยังไม่มีเกณฑ์ของระดับนี้และไม่มีผู้ป่วย แสดงว่ารอแพทย์กำหนดแทนเลข 0 */
  awaitingThreshold: boolean;
};

export type MetricRow = {
  key: string;
  label: string;
  /** ข้อความค่าล่าสุดพร้อมหน่วย "-" = ไม่มีข้อมูล */
  latest: string;
  change: string;
  coverage: number;
  /** จำนวนผู้ป่วยที่มีข้อมูล ณ จุดเทียบ กลุ่มอาจไม่เท่ากับปัจจุบันเมื่อมีผู้ป่วยเข้าใหม่ */
  baselineCoverage: number;
  /** ค่าที่ใช้วาดเส้นแนวโน้ม */
  points: (number | null)[];
  /** จำนวนผู้ป่วยที่มีข้อมูล ณ แต่ละจุดของเส้น */
  pointCoverage: number[];
  /** ความดันตัวล่าง เส้นที่สองของแถวความดันโลหิตเท่านั้น */
  secondaryPoints?: (number | null)[];
  unit: string;
  decimals: number;
  /** เส้นอ้างอิงจาก LAB_BANDS ใช้อ่านประกอบกราฟเท่านั้น */
  reference?: { value: number; label: string };
};

export type MetricDate = { date: string; label: string };

export type SeverePatient = {
  id: string;
  hn: string;
  name: string;
  level: RiskLevel;
  reason: string | null;
  eventDate: string | null;
  isStale: boolean;
  hasOpenAlert: boolean;
};

export type LabBandSummary = { counts: Record<LabBandKey, number>; tested: number; untested: number };

export type TrendPoint = { date: string; label: string; remission: number; lost: number };

export type DashboardStats = {
  totalPatients: number;
  newLast30Days: number;
  remission: {
    /** false = ไม่มีชุดเกณฑ์ที่ใช้งาน ระบบจึงยังไม่ประเมิน */
    assessable: boolean;
    counts: Record<RemissionPhase, number>;
    changeLast30Days: number;
  };
  risk: {
    rows: RiskRow[];
    critical: number;
    high: number;
    /** ผู้ป่วยวิกฤตและความเสี่ยงสูงที่ใช้ข้อมูลเก่า */
    severeStale: number;
    /** เกณฑ์น้ำตาลของวิกฤตหรือความเสี่ยงสูงยังไม่ครบ จำนวนจริงอาจมากกว่าที่นับได้ */
    severeThresholdsIncomplete: boolean;
    /** เกณฑ์ไม่ครบและนับได้ 0 ราย จึงยังบอกไม่ได้ว่าไม่มีผู้ป่วยกลุ่มนี้ */
    severeUnassessable: boolean;
    staleTotal: number;
    noData: number;
  };
  bands: { hba1c: LabBandSummary; fbs: LabBandSummary };
  granularity: Granularity;
  trend: TrendPoint[];
  metrics: MetricRow[];
  /** วันที่ของแต่ละจุดบนกราฟตัวชี้วัด มีเสมอแม้ยังไม่มีชุดเกณฑ์ */
  metricDates: MetricDate[];
  comparisonLabel: string;
  severe: { rows: SeverePatient[]; total: number };
  /** วันแรกที่มีข้อมูล ใช้จำกัดการย้อนในปฏิทิน */
  earliestDate: string | null;
};

const RISK_ROW_ORDER: readonly RiskRowKey[] = ["CRITICAL", "HIGH", "WATCH", "UNCONTROLLED", "WELL_CONTROLLED", "NONE"];
const SEVERE_LIST_LIMIT = 5;

function thresholdsMissing(level: RiskRowKey, rules: RiskRules): boolean {
  const missing = new Set<string>(findMissingThresholds(rules));
  if (level === "CRITICAL") return missing.has("criticalGlucoseBelow") || missing.has("criticalGlucoseAbove");
  if (level === "HIGH") return missing.has("highBelow") || missing.has("highAbove");
  if (level === "WATCH") return missing.has("watchBelow") || missing.has("watchAbove");
  return false;
}

function buildRiskRows(patients: DashboardPatient[], rules: RiskRules): RiskRow[] {
  return RISK_ROW_ORDER.map((key) => {
    const group = patients.filter((p) => (p.level ?? "NONE") === key);
    return {
      key,
      count: group.length,
      stale: group.filter((p) => p.isStale).length,
      awaitingThreshold: group.length === 0 && thresholdsMissing(key, rules),
    };
  });
}

function bandSummary(patients: DashboardPatient[], key: "hba1c" | "fbs", today: string): LabBandSummary {
  const counts: Record<LabBandKey, number> = { NORMAL: 0, RISK: 0, DIABETES: 0 };
  let tested = 0;
  for (const patient of patients) {
    const value = latestLabValue(patient.labs, key, today);
    if (value === null) continue;
    counts[labBandOf(value, LAB_BANDS[key])] += 1;
    tested += 1;
  }
  return { counts, tested, untested: patients.length - tested };
}

/** ค่าล่าสุดและการเปลี่ยนแปลงคำนวณ ณ วันสิ้นสุดของช่วง เพื่อให้ตรงกับปลายเส้นแนวโน้ม */
function buildMetrics(patients: DashboardPatient[], dates: string[], baseline: string, asOf: string): MetricRow[] {
  const single = (key: LabNumberKey, label: string, unit: string, decimals: number): MetricRow => {
    const now = programMean(patients, key, asOf);
    const baselineMean = programMean(patients, key, baseline);
    const before = baselineMean.value;
    const series = dates.map((date) => programMean(patients, key, date));
    return {
      key,
      label,
      latest: now.value === null ? "-" : `${now.value.toFixed(decimals)}${unit}`,
      change: now.value === null || before === null ? "-" : formatSigned(now.value - before, decimals),
      coverage: now.count,
      baselineCoverage: baselineMean.count,
      points: series.map((point) => point.value),
      pointCoverage: series.map((point) => point.count),
      unit: unit.trim(),
      decimals,
    };
  };
  const diabetesLine = (band: "hba1c" | "fbs") => ({
    value: LAB_BANDS[band].diabetesFrom,
    label: `${LAB_BAND_LABELS.DIABETES} ${LAB_BANDS[band].ranges.DIABETES}`,
  });

  const sbp = single("sbp", "ความดันโลหิต", " mmHg", 0);
  const dbpNow = programMean(patients, "dbp", asOf).value;
  const dbpBefore = programMean(patients, "dbp", baseline).value;
  const sbpNow = programMean(patients, "sbp", asOf).value;
  const hasPressure = sbpNow !== null && dbpNow !== null;
  const pressureChange = dbpNow !== null && dbpBefore !== null && sbp.change !== "-" ? `${sbp.change}/${formatSigned(dbpNow - dbpBefore, 0)}` : "-";

  return [
    { ...single("hba1c", "HbA1c", "%", 1), reference: diabetesLine("hba1c") },
    { ...single("fbs", "FBS", " mg/dL", 0), reference: diabetesLine("fbs") },
    single("weightKg", "น้ำหนัก", " กก.", 1),
    single("bmi", "BMI", "", 1),
    {
      ...sbp,
      latest: hasPressure ? `${sbpNow.toFixed(0)}/${dbpNow.toFixed(0)} mmHg` : "-",
      change: pressureChange,
      secondaryPoints: dates.map((date) => programMean(patients, "dbp", date).value),
    },
  ];
}

function earliestDateOf(patients: DashboardPatient[]): string | null {
  let earliest: string | null = null;
  for (const patient of patients) {
    const dates = [...patient.labs.map((l) => l.date), ...patient.medications.map((m) => m.startDate)];
    for (const date of dates) if (earliest === null || date < earliest) earliest = date;
  }
  return earliest;
}

export function buildDashboardStats(input: {
  patients: DashboardPatient[];
  rules: RiskRules;
  ruleSetMissing: boolean;
  range: DashboardRange;
  today: string;
}): DashboardStats {
  const { patients, rules, ruleSetMissing, range, today } = input;

  const timelines = patients.map((p) => buildRemissionTimeline(p, rules));
  const countsAt = (date: string): Record<RemissionPhase, number> => {
    const counts: Record<RemissionPhase, number> = { REMISSION: 0, LOST_REMISSION: 0, NOT_IN_REMISSION: 0, INSUFFICIENT_DATA: 0 };
    for (const timeline of timelines) counts[remissionPhaseAt(timeline, date)] += 1;
    return counts;
  };
  const currentPhase = countsAt(today);

  const dates = trendDates(range.from, range.to);
  const granularity = rangeGranularity(range.from, range.to);
  const trend = ruleSetMissing
    ? []
    : dates.map((date) => {
        const counts = countsAt(date);
        return { date, label: trendLabel(date, granularity, dates.length), remission: counts.REMISSION, lost: counts.LOST_REMISSION };
      });

  const rows = buildRiskRows(patients, rules);
  const countOf = (key: RiskRowKey) => rows.find((r) => r.key === key)?.count ?? 0;
  const critical = countOf("CRITICAL");
  const high = countOf("HIGH");

  const comparison = comparisonOf(range);
  const severePatients = patients
    .flatMap((p) => (p.level === "CRITICAL" || p.level === "HIGH" ? [{ ...p, level: p.level }] : []))
    .sort((a, b) => severity(b.level) - severity(a.level) || (b.eventDate ?? "").localeCompare(a.eventDate ?? "") || a.hn.localeCompare(b.hn));

  const severeThresholdsIncomplete = thresholdsMissing("CRITICAL", rules) || thresholdsMissing("HIGH", rules);

  return {
    totalPatients: patients.length,
    newLast30Days: patients.filter((p) => p.createdDate > addDays(today, -30)).length,
    remission: {
      assessable: !ruleSetMissing,
      counts: currentPhase,
      changeLast30Days: currentPhase.REMISSION - countsAt(addDays(today, -30)).REMISSION,
    },
    risk: {
      rows,
      critical,
      high,
      severeStale: severePatients.filter((p) => p.isStale).length,
      severeThresholdsIncomplete,
      severeUnassessable: critical + high === 0 && severeThresholdsIncomplete,
      staleTotal: rows.reduce((sum, r) => sum + r.stale, 0),
      noData: countOf("NONE"),
    },
    bands: { hba1c: bandSummary(patients, "hba1c", today), fbs: bandSummary(patients, "fbs", today) },
    granularity,
    trend,
    metrics: buildMetrics(patients, dates, comparison.date, range.to),
    metricDates: dates.map((date) => ({ date, label: trendLabel(date, granularity, dates.length) })),
    comparisonLabel: comparison.label,
    severe: {
      rows: severePatients.slice(0, SEVERE_LIST_LIMIT).map((p) => ({
        id: p.id, hn: p.hn, name: p.name, level: p.level, reason: p.reason, eventDate: p.eventDate, isStale: p.isStale, hasOpenAlert: p.hasOpenAlert,
      })),
      total: severePatients.length,
    },
    earliestDate: earliestDateOf(patients),
  };
}
