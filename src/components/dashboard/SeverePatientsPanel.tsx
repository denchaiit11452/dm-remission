import Link from "next/link";
import RiskBadge from "@/components/patients/RiskBadge";
import type { DashboardStats } from "@/lib/dashboard-stats";
import { formatThaiDate } from "@/lib/format";
import Panel, { PANEL_LINK } from "./Panel";

type Props = {
  severe: DashboardStats["severe"];
  critical: number;
  high: number;
  /** เกณฑ์น้ำตาลของระดับนี้ยังไม่ครบ ห้ามสื่อว่าไม่มีผู้ป่วย */
  thresholdsIncomplete: boolean;
};

const THRESHOLD_NOTE = "ผู้ป่วยน้ำตาลสูงหรือต่ำมากอาจยังไม่ถูกจัดเป็นวิกฤต จนกว่าแพทย์จะกำหนดเกณฑ์";

/** รายชื่อดูอย่างเดียว กดเพื่อเปิดประวัติผู้ป่วย การรับทราบแจ้งเตือนทำที่หน้าการแจ้งเตือน */
export default function SeverePatientsPanel({ severe, critical, high, thresholdsIncomplete }: Props) {
  const title = "ผู้ป่วยวิกฤตและความเสี่ยงสูงล่าสุด";

  if (severe.total === 0) {
    return (
      <Panel title={title}>
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-slate-900">{thresholdsIncomplete ? "ยังประเมินไม่ได้" : "ไม่มีผู้ป่วยในระดับนี้"}</p>
          {thresholdsIncomplete ? <p className="text-[13.5px] leading-relaxed text-slate-600">{THRESHOLD_NOTE}</p> : null}
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={title} subtitle="เรียงตามความรุนแรงและวันที่ล่าสุด">
      {thresholdsIncomplete ? <p className="text-[13px] leading-relaxed text-slate-700">{THRESHOLD_NOTE}</p> : null}
      <ul>
        {severe.rows.map((p) => (
          <li key={p.id} className="border-t border-slate-200">
            <Link href={`/patients/${p.id}`} className="block rounded-md py-2.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <RiskBadge level={p.level} />
                <span className="min-w-0 text-sm font-semibold text-slate-900">{p.name}</span>
              </span>
              {p.reason ? <span className="mt-1 block text-[13.5px] leading-snug text-slate-700">{p.reason}</span> : null}
              <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-600">
                HN {p.hn}, {p.eventDate ? formatThaiDate(p.eventDate) : "ไม่มีวันที่วัด"}
                {p.isStale ? ", ข้อมูลเก่า" : ""}
                {p.hasOpenAlert ? ", ยังไม่รับทราบ" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap gap-x-5 text-sm">
        {critical > 0 ? <Link href="/patients?level=CRITICAL" className={PANEL_LINK}>ดูวิกฤตทั้งหมด {critical} ราย</Link> : null}
        {high > 0 ? <Link href="/patients?level=HIGH" className={PANEL_LINK}>ดูความเสี่ยงสูงทั้งหมด {high} ราย</Link> : null}
      </div>
    </Panel>
  );
}
