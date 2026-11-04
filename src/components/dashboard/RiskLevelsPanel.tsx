import Link from "next/link";
import RiskBadge from "@/components/patients/RiskBadge";
import type { DashboardStats, RiskRow, RiskRowKey } from "@/lib/dashboard-stats";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import ArrivalGroup from "./ArrivalGroup";
import Panel from "./Panel";

const BAR_COLORS: Record<RiskRowKey, string> = {
  CRITICAL: "#991b1b",
  HIGH: "#dc2626",
  WATCH: "#ea580c",
  UNCONTROLLED: "#d97706",
  WELL_CONTROLLED: "#15803d",
  NONE: "#94a3b8",
};

const STALE_OPACITY = 0.32;
/** เว้นที่ให้จำนวนรายที่ปลายแท่ง แท่งที่ยาวที่สุดจึงไม่ดันตัวเลขตกขอบ */
const COUNT_LABEL_WIDTH_PX = 72;
/** ช้ากว่าแท่งอื่นในหน้า เพราะนี่คือจุดเด่นของแผง และเส้นโค้งนุ่มกว่าเพื่อให้เห็นแท่งงอกจริง */
const BAR_DURATION_MS = 800;
const BAR_STAGGER_MS = 60;
const BAR_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function Count({ value, tip = false }: { value: number | string; tip?: boolean }) {
  const muted = value === 0;
  return (
    <span data-tip={tip ? "" : undefined} className={`shrink-0 whitespace-nowrap text-sm tabular-nums ${muted ? "font-medium text-slate-500" : "font-semibold text-slate-900"}`}>
      {value}<span className="ml-1 text-[12.5px] font-normal text-slate-600">ราย</span>
    </span>
  );
}

/** แท่งจำนวนผู้ป่วย ส่วนสีจางคือผู้ป่วยที่ใช้ข้อมูลเก่า เพื่อไม่ให้ตัวเลขดูเป็นปัจจุบันทั้งหมด */
function RiskBar({ row, max }: { row: RiskRow; max: number }) {
  if (row.awaitingThreshold) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-[12.5px] text-slate-600">รอแพทย์กำหนดเกณฑ์</span>
        <Count value="-" />
      </span>
    );
  }
  if (row.count === 0) return <span className="flex min-h-[18px] items-center"><Count value={0} /></span>;

  const color = BAR_COLORS[row.key];
  const fresh = row.count - row.stale;
  return (
    <span className="flex items-center gap-2">
      <span
        data-sweep
        aria-hidden="true"
        className="flex h-[18px] gap-0.5"
        style={{ width: `calc((100% - ${COUNT_LABEL_WIDTH_PX}px) * ${row.count / max})`, minWidth: 6 }}
      >
        {fresh > 0 ? <span className={`block min-w-1 ${row.stale === 0 ? "rounded-r" : ""}`} style={{ flexGrow: fresh, flexBasis: 0, backgroundColor: color }} /> : null}
        {row.stale > 0 ? <span data-settle className="block min-w-1 rounded-r" style={{ flexGrow: row.stale, flexBasis: 0, backgroundColor: color, opacity: STALE_OPACITY }} /> : null}
      </span>
      <Count value={row.count} tip />
    </span>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-slate-600 motion-reduce:transition-none">
      <path d="m6 3.5 4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function rowHref(key: RiskRowKey): string {
  return `/patients?level=${key}`;
}

function rowLabel(row: RiskRow): string {
  const name = row.key === "NONE" ? "ยังไม่มีข้อมูล" : RISK_LEVEL_LABELS[row.key];
  if (row.awaitingThreshold) return `${name}: รอแพทย์กำหนดเกณฑ์`;
  return `${name} ${row.count} ราย${row.stale > 0 ? ` ข้อมูลเก่า ${row.stale} ราย` : ""} เปิดรายชื่อ`;
}

function RiskRowLink({ row, max }: { row: RiskRow; max: number }) {
  return (
    <Link
      href={rowHref(row.key)}
      aria-label={rowLabel(row)}
      className="group grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-md px-1 py-1.5 transition-colors duration-150 hover:bg-slate-50 active:bg-slate-100 active:duration-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 motion-reduce:transition-none md:grid-cols-[124px_minmax(0,1fr)_84px]"
    >
      <span className="min-w-0"><RiskBadge level={row.key === "NONE" ? null : row.key} /></span>
      <span className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1"><RiskBar row={row} max={max} /></span>
      <span className="flex items-center justify-end gap-1.5 text-[12.5px] tabular-nums text-slate-600">
        {row.stale > 0 ? <span className="whitespace-nowrap">เก่า {row.stale}</span> : null}
        <Chevron />
      </span>
    </Link>
  );
}

export default function RiskLevelsPanel({ risk, total }: { risk: DashboardStats["risk"]; total: number }) {
  const max = Math.max(...risk.rows.map((r) => r.count), 1);
  const levels = risk.rows.filter((r) => r.key !== "NONE");
  const noData = risk.rows.find((r) => r.key === "NONE");
  const signature = risk.rows.map((r) => `${r.count}-${r.stale}`).join(",");

  return (
    <Panel title="ระดับความเสี่ยงทั้งโปรแกรม" subtitle={`ระดับปัจจุบันของผู้ป่วย ${total} ราย กดแถวเพื่อเปิดรายชื่อ`}>
      <ArrivalGroup signature={signature} durationMs={BAR_DURATION_MS} staggerMs={BAR_STAGGER_MS} easing={BAR_EASE} className="flex flex-1 flex-col gap-1">
        {/* แถวกระจายเต็มความสูงของแผงข้างๆ จึงไม่เหลือช่องว่างก้อนใหญ่ */}
        <ul className="flex flex-1 flex-col gap-1">
          {levels.map((row) => <li key={row.key} className="flex flex-1"><RiskRowLink row={row} max={max} /></li>)}
        </ul>
        {/* ยังไม่มีข้อมูลไม่ใช่ระดับความเสี่ยง จึงแยกด้วยเส้นคั่น */}
        {noData ? <div className="border-t border-slate-200 pt-1"><RiskRowLink row={noData} max={max} /></div> : null}
      </ArrivalGroup>

      <div className="border-t border-slate-200 pt-1 text-[13px]">
        <Link href="/patients?stale=1" className="inline-flex min-h-11 flex-wrap items-center gap-x-1.5 text-slate-700 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700">
          <span aria-hidden="true" className="size-3 rounded-[3px] bg-slate-600/30" />
          สีจางคือข้อมูลเก่า นับตามค่าล่าสุดที่มี
          <span className="font-semibold text-slate-900 underline underline-offset-2">{risk.staleTotal} ราย</span>
        </Link>
      </div>
    </Panel>
  );
}
