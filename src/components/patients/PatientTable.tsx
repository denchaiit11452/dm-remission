import Link from "next/link";
import type { PatientListRow } from "@/lib/data/patients";
import { PROGRAM_STATUS_LABELS, formatGlucoseValue, formatThaiDate, periodLabel } from "@/lib/format";
import RiskBadge, { AlertTag, StaleTag } from "./RiskBadge";
import RiskSpine from "./RiskSpine";

const TH = "border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800";
// ใช้เส้นคั่นที่เซลล์แทนแถว เพราะเส้นแบบ collapse ไม่ขยับตามแถวตอนเลื่อนตำแหน่ง
const TD = "border-b border-slate-200 px-4 py-3 align-middle text-[15px] text-slate-900 group-last:border-b-0";

function GlucoseCell({ row }: { row: PatientListRow }) {
  const h = row.headline;
  if (!h) {
    return <span className="text-slate-700">{row.level === null ? "ยังไม่มีข้อมูล" : "ไม่มีค่าน้ำตาล"}</span>;
  }
  const v = formatGlucoseValue(h.valueMgDl, h.meterFlag);
  return (
    <div>
      <p className="font-semibold tabular-nums">
        {v.text}
        {v.unit ? <span className="ml-1 font-normal">{v.unit}</span> : null}
        <span className="ml-2 hidden font-normal text-slate-800 min-[1440px]:inline">{periodLabel(h.period)}</span>
      </p>
      {/* แท็บเล็ต: รวมช่วงเวลาและวันที่ไว้ในเซลล์เดียว (5 คอลัมน์) */}
      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-700 min-[1440px]:hidden">
        <span>{periodLabel(h.period)} ·</span>
        <span>{formatThaiDate(h.measuredDate)}</span>
        {row.isStale ? <StaleTag ageDays={row.glucoseAgeDays} /> : null}
      </p>
    </div>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-auto size-4 text-slate-400 transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-slate-600 group-focus-within:translate-x-0.5 group-focus-within:text-slate-600 motion-reduce:transition-none">
      <path d="m6 3.5 4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PatientTable({ rows }: { rows: PatientListRow[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
      <table className="w-full border-separate border-spacing-0">
        <caption className="sr-only">รายชื่อผู้ป่วย เรียงจากระดับความเสี่ยงรุนแรงที่สุด</caption>
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className={`${TH} pl-5`}>ผู้ป่วย</th>
            <th scope="col" className={TH}>ระดับความเสี่ยง</th>
            <th scope="col" className={TH}>สถานะ Remission</th>
            <th scope="col" className={TH}>ค่าน้ำตาลล่าสุด (DTX)</th>
            <th scope="col" className={`${TH} hidden min-[1440px]:table-cell`}>วัดล่าสุด</th>
            <th scope="col" className={`${TH} w-10 px-3`}><span className="sr-only">เปิดโปรไฟล์</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} data-row-id={row.id} className="group relative bg-white transition-colors duration-150 hover:bg-slate-50 focus-within:bg-slate-50 motion-reduce:transition-none">
              <td className={`${TD} pl-5`}>
                <RiskSpine level={row.level} isStale={row.isStale} index={index} />
                {/* ลิงก์ครอบทั้งแถว (after:absolute) แต่โฟกัสด้วยคีย์บอร์ดได้จุดเดียว */}
                <Link href={`/patients/${row.id}`} className="font-medium after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700">
                  {row.fullName}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] tabular-nums text-slate-600">
                  <span>HN {row.hn}</span>
                  {row.openAlertCount > 0 ? <AlertTag count={row.openAlertCount} /> : null}
                </p>
              </td>
              <td className={TD}><RiskBadge level={row.level} /></td>
              <td className={TD}>{PROGRAM_STATUS_LABELS[row.programStatus]}</td>
              <td className={TD}><GlucoseCell row={row} /></td>
              <td className={`${TD} hidden min-[1440px]:table-cell`}>
                <span className="flex flex-wrap items-center gap-2">
                  <span>{formatThaiDate(row.glucoseDate)}</span>
                  {row.isStale ? <StaleTag ageDays={row.glucoseAgeDays} /> : null}
                </span>
              </td>
              <td className={`${TD} w-10 px-3`}><Chevron /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
