import type { CSSProperties } from "react";
import type { RiskRowKey } from "@/lib/dashboard-stats";
import type { RiskLevel } from "@/lib/risk/types";

/** ค่าเดียวกับแท่งในหน้าภาพรวม สีเหล่านี้สื่อระดับทางคลินิก ต้องอยู่คู่ป้ายข้อความเสมอ */
export const RISK_COLORS: Record<RiskRowKey, string> = {
  CRITICAL: "#991b1b",
  HIGH: "#dc2626",
  WATCH: "#ea580c",
  UNCONTROLLED: "#d97706",
  WELL_CONTROLLED: "#15803d",
  NONE: "#94a3b8",
};

export const STALE_OPACITY = 0.32;

/** แถบสัดส่วนเผยตัวไปแล้วครึ่งทางจึงเริ่มไหลลง */
const SPINE_LEAD_MS = 240;
const SPINE_SWEEP_MS = 640;
/** แถวหลังจากนี้มักพ้นจอไปแล้ว จึงไม่ต้องรอนานขึ้นอีก */
const SPINE_SWEEP_ROWS = 14;

/** เริ่มเร็วแล้วค่อยๆ ช้าลง ทุกแถวจึงต่อกันเป็นเส้นเดียว */
function spineDelayMs(index: number): number {
  const progress = Math.min(index / SPINE_SWEEP_ROWS, 1);
  return Math.round(SPINE_LEAD_MS + SPINE_SWEEP_MS * (1 - (1 - progress) ** 2));
}

/**
 * แถบสีขอบซ้ายของแถวผู้ป่วย เรียงต่อกันเป็นสันเดียวตามลำดับความรุนแรง
 * แถวที่ข้อมูลเก่าใช้สีเดิมแต่จางลง เพราะระดับไม่เปลี่ยน แค่ความมั่นใจลดลง
 * ต้องอยู่ในกล่องที่มี relative และ group
 */
export default function RiskSpine({ level, isStale, index }: { level: RiskLevel | null; isStale: boolean; index: number }) {
  const style = {
    backgroundColor: RISK_COLORS[level ?? "NONE"],
    opacity: isStale ? STALE_OPACITY : undefined,
    "--spine-delay": `${spineDelayMs(index)}ms`,
  } as CSSProperties;
  return (
    <span
      aria-hidden="true"
      data-stale={isStale ? "" : undefined}
      style={style}
      className="patient-spine absolute inset-y-0 left-0 w-1 transition-[width] duration-150 ease-out group-hover:w-[7px] group-focus-within:w-[7px]"
    />
  );
}
