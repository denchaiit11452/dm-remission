import Link from "next/link";
import type { PatientListRow } from "@/lib/data/patients";
import { PROGRAM_STATUS_LABELS, formatGlucoseValue, formatThaiDate, periodLabel } from "@/lib/format";
import RiskBadge, { StaleTag } from "./RiskBadge";

const TH = "px-4 py-3 text-left text-sm font-semibold text-slate-800";
const TD = "px-4 py-3 align-middle text-[15px] text-slate-900";

function GlucoseCell({ row }: { row: PatientListRow }) {
  const h = row.headline;
  if (!h) {
    return <span className="text-slate-700">{row.level === null ? "ยังไม่มีข้อมูล" : "ไม่มีค่าน้ำตาล"}</span>;
  }
  const v = formatGlucoseValue(h.valueMgDl, h.meterFlag);
  return (
    <div>
      <p className="font-semibold">
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

export default function PatientTable({ rows }: { rows: PatientListRow[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
      <table className="w-full border-collapse">
        <caption className="sr-only">รายชื่อผู้ป่วย เรียงจากระดับความเสี่ยงรุนแรงที่สุด</caption>
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200">
            <th scope="col" className={TH}>HN</th>
            <th scope="col" className={TH}>ชื่อ-สกุล</th>
            <th scope="col" className={TH}>ระดับความเสี่ยง</th>
            <th scope="col" className={TH}>สถานะ Remission</th>
            <th scope="col" className={TH}>ค่าน้ำตาลล่าสุด (DTX)</th>
            <th scope="col" className={`${TH} hidden min-[1440px]:table-cell`}>วัดล่าสุด</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="relative border-b border-slate-200 last:border-b-0 hover:bg-slate-50 focus-within:bg-slate-50">
              <td className={`${TD} tabular-nums`}>{row.hn}</td>
              <td className={TD}>
                {/* ลิงก์ครอบทั้งแถว (after:absolute) แต่โฟกัสด้วยคีย์บอร์ดได้จุดเดียว */}
                <Link href={`/patients/${row.id}`} className="font-medium after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700">
                  {row.fullName}
                </Link>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
