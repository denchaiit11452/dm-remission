// ตรรกะล้วนของหน้า Alert Center (ไม่ต่อฐานข้อมูล ทดสอบได้)
import { formatGlucoseValue } from "@/lib/format";
import { severity } from "@/lib/risk/levels";
import type { MeterFlag, RiskLevel } from "@/lib/risk/types";

export type AlertTab = "new" | "ack" | "cancel";
export const ALERT_TABS: readonly AlertTab[] = ["new", "ack", "cancel"];
export const ALERT_PAGE_SIZE = 25;
export const ALERT_WINDOW_DAYS = 30;
/** แท็บ "ใหม่" แสดงทั้งหมดที่ยังไม่รับทราบ (ไม่ตัดตามวัน) แต่จำกัดจำนวนไม่ให้หน้าหนักเกินไป */
export const NEW_TAB_LIMIT = 200;

export type AlertStatusName = "NEW" | "ACKNOWLEDGED" | "DONE" | "CANCELLED";

export type AlertRowDTO = {
  id: string;
  patientId: string;
  patientName: string;
  hn: string;
  level: RiskLevel;
  status: AlertStatusName;
  summary: string;
  /** ค่าต้นเหตุ เช่น "452 mg/dL" "186/102 mmHg" */
  valueText: string | null;
  /** วันที่วัด/ตรวจจริง YYYY-MM-DD */
  measuredDate: string;
  createdAt: string;
  backdatedDays: number;
  ackByName: string | null;
  ackAt: string | null;
};

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseAlertQuery(raw: Raw): { tab: AlertTab; page: number } {
  const t = first(raw.tab);
  const tab = ALERT_TABS.find((x) => x === t) ?? "new";
  const n = Number(first(raw.page));
  const page = Number.isInteger(n) && n >= 1 ? Math.min(n, 10_000) : 1;
  return { tab, page: tab === "new" ? 1 : page };
}

export function alertHref(tab: AlertTab, page = 1): string {
  const p = new URLSearchParams();
  if (tab !== "new") p.set("tab", tab);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return `/alerts${s ? `?${s}` : ""}`;
}

/** เรียงแท็บ "ใหม่": ระดับรุนแรงก่อน (วิกฤตก่อนความเสี่ยงสูง) แล้วเวลาสร้างใหม่ก่อน */
export function sortNewAlerts<T extends { level: RiskLevel; createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => severity(b.level) - severity(a.level) || b.createdAt.localeCompare(a.createdAt));
}

export function valueTextOf(input: {
  glucose: { valueMgDl: number | null; meterFlag: MeterFlag } | null;
  lab: { sbp: number | null; dbp: number | null } | null;
}): string | null {
  if (input.glucose) {
    const v = formatGlucoseValue(input.glucose.valueMgDl, input.glucose.meterFlag);
    if (v.text !== "-") return v.unit ? `${v.text} ${v.unit}` : v.text;
  }
  if (input.lab && (input.lab.sbp !== null || input.lab.dbp !== null)) {
    return `${input.lab.sbp ?? "-"}/${input.lab.dbp ?? "-"} mmHg`;
  }
  return null;
}

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** ISO -> "15 ต.ค. 09:12 น." (เวลาไทย UTC+7 คำนวณเอง ไม่พึ่งค่าเขตเวลาของเครื่อง) */
export function formatThaiDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "-";
  const d = new Date(ms + 7 * 3600_000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${hh}:${mm} น.`;
}

export function formatThaiTime(iso: string | null | undefined): string {
  const s = formatThaiDateTime(iso);
  return s === "-" ? s : s.replace(/^\d+ \S+ /, "");
}
