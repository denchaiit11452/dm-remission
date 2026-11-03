// สรุปค่าล่าสุดและการเปลี่ยนแปลงของผลตรวจ (ฟังก์ชันล้วน ทดสอบได้ ใช้ได้ทั้งฝั่ง server และ client)
// แสดงทิศทางเท่านั้น ไม่ตัดสินว่าดีหรือแย่ เพราะเป็นการตัดสินทางคลินิกที่แพทย์ต้องกำหนดเกณฑ์
import type { LabRow } from "./data/labs";
import { computeBmi } from "./data/view";
import { parseOptionalNumber, type LabFormValues } from "./record-forms";
import { assessBloodPressure } from "./risk/blood-pressure";
import type { RiskRules } from "./risk/types";

export type LabPoint = { date: string; value: number };
export type BloodPressurePoint = { date: string; sbp: number; dbp: number; critical: boolean };

/** ทุกชุดเรียงจากวันที่เก่าไปใหม่ และมีได้วันละ 1 จุด ไม่รวมรายการที่ยกเลิก */
export type LabSeries = {
  hba1c: LabPoint[];
  fbs: LabPoint[];
  weightKg: LabPoint[];
  heightCm: LabPoint[];
  bmi: LabPoint[];
  bloodPressure: BloodPressurePoint[];
};

type SeriesRow = Pick<LabRow, "id" | "recordedDate" | "hba1c" | "fbs" | "weightKg" | "heightCm" | "bmi" | "sbp" | "dbp"> & {
  voided: unknown;
};

function ascending<T extends { date: string }>(byDate: Map<string, T>): T[] {
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** rows ต้องเรียงจากรายการใหม่ไปเก่า ถ้าวันเดียวกันมีหลายค่า ใช้ค่าที่กรอกล่าสุด */
function latestPerDay(rows: SeriesRow[], pick: (row: SeriesRow) => number | null): LabPoint[] {
  const byDate = new Map<string, LabPoint>();
  for (const row of rows) {
    const value = pick(row);
    if (value !== null && !byDate.has(row.recordedDate)) byDate.set(row.recordedDate, { date: row.recordedDate, value });
  }
  return ascending(byDate);
}

/** ค่าน้ำตาลวันเดียวกันหลายค่า ใช้ค่าสูงสุด ตรงกับกติกาความระมัดระวังของการประเมิน Remission */
function highestPerDay(rows: SeriesRow[], pick: (row: SeriesRow) => number | null): LabPoint[] {
  const byDate = new Map<string, LabPoint>();
  for (const row of rows) {
    const value = pick(row);
    if (value === null) continue;
    const current = byDate.get(row.recordedDate);
    if (!current || value > current.value) byDate.set(row.recordedDate, { date: row.recordedDate, value });
  }
  return ascending(byDate);
}

/** ความดันวันเดียวกันหลายค่า ใช้ค่าที่ถึงเกณฑ์วิกฤตก่อน เพื่อไม่ให้ค่าวิกฤตถูกบังด้วยค่าที่กรอกทีหลัง */
function bloodPressurePerDay(rows: SeriesRow[], rules: RiskRules): BloodPressurePoint[] {
  const byDate = new Map<string, BloodPressurePoint>();
  for (const row of rows) {
    if (row.sbp === null || row.dbp === null) continue;
    const critical = assessBloodPressure(
      { id: row.id, recordedDate: row.recordedDate, sbp: row.sbp, dbp: row.dbp, isVoided: false },
      rules,
    ) !== null;
    const current = byDate.get(row.recordedDate);
    if (!current || (critical && !current.critical)) {
      byDate.set(row.recordedDate, { date: row.recordedDate, sbp: row.sbp, dbp: row.dbp, critical });
    }
  }
  return ascending(byDate);
}

export function buildLabSeries(allRows: SeriesRow[], rules: RiskRules): LabSeries {
  const rows = allRows.filter((row) => row.voided === null);
  return {
    hba1c: highestPerDay(rows, (r) => r.hba1c),
    fbs: highestPerDay(rows, (r) => r.fbs),
    weightKg: latestPerDay(rows, (r) => r.weightKg),
    heightCm: latestPerDay(rows, (r) => r.heightCm),
    bmi: latestPerDay(rows, (r) => r.bmi),
    bloodPressure: bloodPressurePerDay(rows, rules),
  };
}

export type LabChange = { direction: "up" | "down" | "same"; amount: number; label?: string };

export function changeBetween(current: number, previous: number, label?: string): LabChange {
  const diff = Math.round((current - previous) * 10) / 10;
  return { direction: diff > 0 ? "up" : diff < 0 ? "down" : "same", amount: Math.abs(diff), label };
}

/** ค่าล่าสุดที่ตรวจไม่เกินวันที่ระบุ ถ้ากรอกผลย้อนหลังจะเทียบกับผลก่อนหน้าวันนั้นจริง */
export function latestUpTo<T extends { date: string }>(points: T[], date: string): T | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].date <= date) return points[i];
  }
  return null;
}

export type LabComparison = {
  key: "hba1c" | "fbs" | "bloodPressure" | "weightKg" | "heightCm" | "bmi";
  label: string;
  /** null = ค่าที่กรอกยังใช้ไม่ได้ */
  valueText: string | null;
  /** ข้อความเมื่อกรอกยังไม่ครบ แยกจากค่าที่ผิด จึงไม่ต้องเตือนระหว่างที่กำลังพิมพ์ */
  pending?: string;
  /** ถึงเกณฑ์วิกฤตตามชุดเกณฑ์ที่ใช้งาน */
  critical?: boolean;
  changes: LabChange[];
  previous: { text: string; date: string } | null;
};

/** "%" ติดกับตัวเลข ส่วนหน่วยอื่นเว้นวรรค */
export function withUnit(value: number, unit: string): string {
  if (unit === "%") return `${value}%`;
  return `${value} ${unit}`.trim();
}

function singleComparison(
  key: LabComparison["key"], label: string, unit: string, raw: string, points: LabPoint[], date: string,
): LabComparison | null {
  const value = parseOptionalNumber(raw);
  if (value === null) return null;
  const previous = latestUpTo(points, date);
  if (!Number.isFinite(value)) return { key, label, valueText: null, changes: [], previous: null };
  return {
    key, label, valueText: withUnit(value, unit),
    changes: previous ? [changeBetween(value, previous.value)] : [],
    previous: previous ? { text: withUnit(previous.value, unit), date: previous.date } : null,
  };
}

function bloodPressureComparison(values: LabFormValues, points: BloodPressurePoint[], rules: RiskRules): LabComparison | null {
  const sbp = parseOptionalNumber(values.sbp);
  const dbp = parseOptionalNumber(values.dbp);
  if (sbp === null && dbp === null) return null;
  const base = { key: "bloodPressure" as const, label: "ความดัน" };
  if (sbp === null && dbp !== null && Number.isFinite(dbp)) return { ...base, valueText: null, pending: "รอกรอกตัวบน", changes: [], previous: null };
  if (dbp === null && sbp !== null && Number.isFinite(sbp)) return { ...base, valueText: null, pending: "รอกรอกตัวล่าง", changes: [], previous: null };
  if (sbp === null || dbp === null || !Number.isFinite(sbp) || !Number.isFinite(dbp)) {
    return { ...base, valueText: null, changes: [], previous: null };
  }
  const previous = latestUpTo(points, values.recordedDate);
  return {
    ...base,
    valueText: `${sbp}/${dbp} mmHg`,
    critical: assessBloodPressure({ id: "", recordedDate: values.recordedDate, sbp, dbp, isVoided: false }, rules) !== null,
    changes: previous ? [changeBetween(sbp, previous.sbp, "ตัวบน"), changeBetween(dbp, previous.dbp, "ตัวล่าง")] : [],
    previous: previous ? { text: `${previous.sbp}/${previous.dbp} mmHg`, date: previous.date } : null,
  };
}

/** รายการที่กำลังจะบันทึก เทียบกับผลก่อนหน้า (ใช้ในแผงสรุปของฟอร์ม) */
export function compareLabEntries(values: LabFormValues, series: LabSeries, rules: RiskRules): LabComparison[] {
  const date = values.recordedDate;
  const weight = parseOptionalNumber(values.weightKg);
  const height = parseOptionalNumber(values.heightCm);
  const bmi = weight !== null && height !== null && Number.isFinite(weight) && Number.isFinite(height) ? computeBmi(weight, height) : null;
  const items: (LabComparison | null)[] = [
    singleComparison("hba1c", "HbA1c", "%", values.hba1c, series.hba1c, date),
    singleComparison("fbs", "FBS", "mg/dL", values.fbs, series.fbs, date),
    bloodPressureComparison(values, series.bloodPressure, rules),
    singleComparison("weightKg", "น้ำหนัก", "กก.", values.weightKg, series.weightKg, date),
    singleComparison("heightCm", "ส่วนสูง", "ซม.", values.heightCm, series.heightCm, date),
    bmi === null ? null : singleComparison("bmi", "BMI", "", String(bmi), series.bmi, date),
  ];
  return items.filter((item): item is LabComparison => item !== null);
}
