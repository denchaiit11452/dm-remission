import Link from "next/link";
import RiskBadge from "@/components/patients/RiskBadge";
import type { DashboardStats, RiskRow, RiskRowKey } from "@/lib/dashboard-stats";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
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

/** แท่งจำนวนผู้ป่วย ส่วนสีจางคือผู้ป่วยที่ใช้ข้อมูลเก่า เพื่อไม่ให้ตัวเลขดูเป็นปัจจุบันทั้งหมด */
function RiskBar({ row, max }: { row: RiskRow; max: number }) {
  if (row.awaitingThreshold) return <span className="text-[12.5px] text-slate-600">รอแพทย์กำหนดเกณฑ์</span>;
  if (row.count === 0) return <span className="block h-[18px]" aria-hidden="true" />;
  const color = BAR_COLORS[row.key];
  const fresh = row.count - row.stale;
  return (
    <span aria-hidden="true" className="flex h-[18px] gap-0.5" style={{ width: `${(row.count / max) * 100}%`, minWidth: 6 }}>
      {fresh > 0 ? <span className={`block min-w-1 ${row.stale === 0 ? "rounded-r" : ""}`} style={{ flexGrow: fresh, flexBasis: 0, backgroundColor: color }} /> : null}
      {row.stale > 0 ? <span className="block min-w-1 rounded-r" style={{ flexGrow: row.stale, flexBasis: 0, backgroundColor: color, opacity: STALE_OPACITY }} /> : null}
    </span>
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

export default function RiskLevelsPanel({ risk, total }: { risk: DashboardStats["risk"]; total: number }) {
  const max = Math.max(...risk.rows.map((r) => r.count), 1);
  return (
    <Panel title="ระดับความเสี่ยงทั้งโปรแกรม" subtitle={`ระดับปัจจุบันของผู้ป่วย ${total} ราย กดแถวเพื่อเปิดรายชื่อ`}>
      <div>
        <div className="hidden grid-cols-[128px_minmax(0,1fr)_56px_76px] gap-2 px-1 pb-2 text-[12.5px] font-medium text-slate-600 md:grid">
          <span>ระดับ</span><span>จำนวนผู้ป่วย</span><span className="text-right">ราย</span><span className="text-right">ข้อมูลเก่า</span>
        </div>
        <ul className="flex flex-col gap-1">
          {risk.rows.map((row) => (
            <li key={row.key}>
              <Link
                href={rowHref(row.key)}
                aria-label={rowLabel(row)}
                className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 rounded-md px-1 py-1.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 md:grid-cols-[128px_minmax(0,1fr)_56px_76px]"
              >
                <span className="min-w-0"><RiskBadge level={row.key === "NONE" ? null : row.key} /></span>
                <span className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1"><RiskBar row={row} max={max} /></span>
                <span className="text-right text-sm font-semibold tabular-nums text-slate-900">
                  {row.stale > 0 ? <span className="mr-2 font-normal text-slate-600 md:hidden">เก่า {row.stale}</span> : null}
                  {row.awaitingThreshold ? "-" : row.count}
                  <span className="font-normal md:hidden"> ราย</span>
                </span>
                <span className="hidden text-right text-sm tabular-nums text-slate-700 md:block">{row.stale > 0 ? row.stale : "-"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-slate-700">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-[3px] bg-slate-600" />ข้อมูลล่าสุด</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-[3px] bg-slate-600/30" />ข้อมูลเก่า นับตามค่าล่าสุดที่มี</span>
      </div>

      <div className="flex flex-wrap gap-x-6 border-t border-slate-200 pt-1 text-[13.5px]">
        <Link href="/patients?stale=1" className="inline-flex min-h-11 items-center gap-1.5 text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700">
          ข้อมูลเก่า <span className="font-semibold text-slate-900 underline underline-offset-2">{risk.staleTotal} ราย</span>
        </Link>
        <Link href="/patients?level=NONE" className="inline-flex min-h-11 items-center gap-1.5 text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700">
          ยังไม่มีข้อมูล <span className="font-semibold text-slate-900 underline underline-offset-2">{risk.noData} ราย</span>
        </Link>
      </div>
    </Panel>
  );
}
