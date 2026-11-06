import Link from "next/link";
import type { ReactNode } from "react";
import type { DashboardStats } from "@/lib/dashboard-stats";
import { PANEL_LINK } from "./Panel";
import { percentOf } from "./SegmentBar";

/**
 * สีของตัวเลขบอกความหมาย และตรงกับสีเดียวกันที่อื่นในหน้า จึงหาเจอได้ด้วยสายตา
 * remission = สีเส้นภาวะสงบในกราฟ, severe = สีวิกฤต, alert = ป้ายนับแจ้งเตือนในเมนู, waiting = แถบเตือนเกณฑ์
 * ใช้เฉพาะเมื่อมีค่าที่ต้องสนใจ ค่าศูนย์คงเป็นสีปกติ ป้ายชื่อช่องยังบอกความหมายเสมอ
 */
type Tone = "neutral" | "remission" | "severe" | "alert" | "waiting";

const TONE_INK: Record<Tone, string> = {
  neutral: "text-slate-900",
  remission: "text-[#115e59]",
  severe: "text-[#991b1b]",
  alert: "text-red-600",
  waiting: "text-amber-800",
};

function Cell({ label, value, unit, note, tone = "neutral" }: { label: string; value: string; unit?: string; note: ReactNode; tone?: Tone }) {
  const isText = unit === undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-white p-3.5 md:p-5">
      <p className="text-[13px] font-medium text-slate-600">{label}</p>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className={`font-semibold tabular-nums ${TONE_INK[tone]} ${isText ? "text-lg" : "text-3xl"}`}>{value}</span>
        {unit ? <span className="text-sm text-slate-600">{unit}</span> : null}
      </p>
      <div className="text-[12.5px] leading-snug text-slate-600">{note}</div>
    </div>
  );
}

function signedChange(change: number): string {
  if (change === 0) return "เท่าเดิมจาก 30 วันก่อน";
  return `${change > 0 ? "เพิ่ม" : "ลดลง"} ${Math.abs(change)} รายจาก 30 วันก่อน`;
}

function severeNote(risk: DashboardStats["risk"]): string {
  const parts = [`วิกฤต ${risk.critical}, ความเสี่ยงสูง ${risk.high}`];
  if (risk.severeStale > 0) parts.push(`ข้อมูลเก่า ${risk.severeStale} ราย`);
  if (risk.severeThresholdsIncomplete) parts.push("เกณฑ์ยังไม่ครบ อาจมีมากกว่านี้");
  return parts.join(", ");
}

/** ตัวเลขสรุป 4 ค่า ดูอย่างเดียว การรับทราบแจ้งเตือนทำที่หน้าการแจ้งเตือน */
export default function SummaryStrip({ stats, alertCount }: { stats: DashboardStats; alertCount: number }) {
  const { remission, risk, totalPatients, newLast30Days } = stats;
  const inRemission = remission.counts.REMISSION;
  return (
    <section aria-label="ตัวเลขสรุป" className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-slate-200 bg-slate-200 lg:grid-cols-4">
      <Cell
        label="ผู้ป่วยทั้งหมด"
        value={String(totalPatients)}
        unit="ราย"
        note={newLast30Days > 0 ? `เพิ่ม ${newLast30Days} รายใน 30 วันที่ผ่านมา` : "ไม่มีผู้ป่วยใหม่ใน 30 วันที่ผ่านมา"}
      />
      {remission.assessable ? (
        <Cell
          label="เข้าเกณฑ์ภาวะสงบ"
          value={String(inRemission)}
          unit="ราย"
          tone={inRemission > 0 ? "remission" : "neutral"}
          note={`${percentOf(inRemission, totalPatients).toFixed(1)}% ของทั้งหมด, ${signedChange(remission.changeLast30Days)}`}
        />
      ) : (
        <Cell label="เข้าเกณฑ์ภาวะสงบ" value="ยังประเมินไม่ได้" note="ยังไม่มีชุดเกณฑ์ที่ใช้งาน" tone="waiting" />
      )}
      {risk.severeUnassessable ? (
        <Cell label="วิกฤตและความเสี่ยงสูง" value="ยังประเมินไม่ได้" note="รอแพทย์กำหนดเกณฑ์" tone="waiting" />
      ) : (
        <Cell
          label="วิกฤตและความเสี่ยงสูง"
          value={String(risk.critical + risk.high)}
          unit="ราย"
          note={severeNote(risk)}
          tone={risk.critical + risk.high > 0 ? "severe" : "neutral"}
        />
      )}
      <Cell
        label="แจ้งเตือนยังไม่รับทราบ"
        value={String(alertCount)}
        unit="รายการ"
        tone={alertCount > 0 ? "alert" : "neutral"}
        note={<Link href="/alerts" className={`${PANEL_LINK} -my-3 text-[12.5px]`}>ไปหน้าการแจ้งเตือน</Link>}
      />
    </section>
  );
}
