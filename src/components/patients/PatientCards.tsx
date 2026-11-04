import Link from "next/link";
import type { PatientListRow } from "@/lib/data/patients";
import { PROGRAM_STATUS_LABELS, formatGlucoseValue, formatThaiDate, periodLabel } from "@/lib/format";
import RiskBadge, { AlertTag, StaleTag } from "./RiskBadge";
import RiskSpine from "./RiskSpine";

/** รายการแบบการ์ดสำหรับมือถือ (ต่ำกว่า 768 px) */
export default function PatientCards({ rows }: { rows: PatientListRow[] }) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="รายชื่อผู้ป่วย เรียงจากระดับความเสี่ยงรุนแรงที่สุด">
      {rows.map((row, index) => {
        const h = row.headline;
        const v = h ? formatGlucoseValue(h.valueMgDl, h.meterFlag) : null;
        const critical = row.level === "CRITICAL";
        return (
          <li key={row.id} data-row-id={row.id}>
            <Link
              href={`/patients/${row.id}`}
              className={`group relative block min-h-11 overflow-hidden rounded-xl border bg-white p-4 pl-5 transition-colors duration-150 active:bg-slate-50 active:duration-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none ${
                critical ? "border-2 border-red-300" : "border-slate-200"
              }`}
            >
              <RiskSpine level={row.level} isStale={row.isStale} index={index} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">{row.fullName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>HN {row.hn}</span>
                    {row.openAlertCount > 0 ? <AlertTag count={row.openAlertCount} /> : null}
                  </p>
                </div>
                <RiskBadge level={row.level} />
              </div>

              {h && v ? (
                <div className="mt-3">
                  <p className="text-xl font-semibold tabular-nums text-slate-900">
                    {v.text}
                    {v.unit ? <span className="ml-1 text-base font-normal">{v.unit}</span> : null}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">
                    {periodLabel(h.period)} · {formatThaiDate(h.measuredDate)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-700">{row.level === null ? "ยังไม่มีข้อมูลน้ำตาล" : "ไม่มีค่าน้ำตาล"}</p>
              )}

              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-800">
                <span>{PROGRAM_STATUS_LABELS[row.programStatus]}</span>
                {row.isStale ? <StaleTag ageDays={row.glucoseAgeDays} /> : null}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
