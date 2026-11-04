import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import type { RiskLevel } from "@/lib/risk/types";

// สีตามดีไซน์ใน Figma (RiskBadge) ใช้ข้อความกำกับเสมอ ไม่ใช้สีอย่างเดียว
const STYLES: Record<RiskLevel, string> = {
  CRITICAL: "bg-[#991b1b] text-white",
  HIGH: "bg-[#fee2e2] text-[#7f1d1d]",
  WATCH: "bg-[#ffedd5] text-[#7c2d12]",
  UNCONTROLLED: "bg-[#fef3c7] text-[#78350f]",
  WELL_CONTROLLED: "bg-[#dcfce7] text-[#14532d]",
};

const BASE = "inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-medium leading-tight";

/** ป้ายระดับความเสี่ยง level = null แสดงเป็น "ยังไม่มีข้อมูล" */
export default function RiskBadge({ level }: { level: RiskLevel | null }) {
  if (level === null) {
    return <span className={`${BASE} border border-slate-400 bg-white text-slate-700`}>ยังไม่มีข้อมูล</span>;
  }
  return <span className={`${BASE} ${STYLES[level]}`}>{RISK_LEVEL_LABELS[level]}</span>;
}

/** จำนวน Alert ที่ยังไม่มีผู้รับทราบของผู้ป่วยรายนี้ */
export function AlertTag({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
      Alert ใหม่ {count}
    </span>
  );
}

/** ป้ายเตือนข้อมูลเก่า (ageDays = null แปลว่าไม่มีค่าน้ำตาลเลย) */
export function StaleTag({ ageDays }: { ageDays: number | null }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-500 bg-white px-2 py-0.5 text-xs font-medium text-slate-800">
      {ageDays === null ? "ไม่มีค่าน้ำตาล" : `ข้อมูลเก่า ${ageDays} วัน`}
    </span>
  );
}
