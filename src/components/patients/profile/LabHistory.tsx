import Link from "next/link";
import { PRIMARY_BUTTON } from "@/components/forms/fields";
import VoidRecordButton from "@/components/records/VoidRecordButton";
import VoidedNote from "@/components/records/VoidedNote";
import { formatThaiDateTime } from "@/lib/alert-center";
import type { LabRow } from "@/lib/data/labs";
import { formatThaiDate } from "@/lib/format";

type Props = { patientId: string; rows: LabRow[]; canManage: boolean };

function value(v: number | null, unit: string): string {
  return v === null ? "—" : `${v} ${unit}`;
}

function bloodPressure(row: LabRow): string {
  return row.sbp === null && row.dbp === null ? "—" : `${row.sbp ?? "-"}/${row.dbp ?? "-"} mmHg`;
}

function bmiText(row: LabRow): string {
  return row.bmi === null ? "—" : String(row.bmi);
}

function voidSummary(row: LabRow): string {
  const parts = [
    row.hba1c !== null ? `HbA1c ${row.hba1c}%` : null,
    row.fbs !== null ? `FBS ${row.fbs} mg/dL` : null,
    row.sbp !== null || row.dbp !== null ? `ความดัน ${row.sbp ?? "-"}/${row.dbp ?? "-"}` : null,
    row.weightKg !== null ? `น้ำหนัก ${row.weightKg} กก.` : null,
    row.heightCm !== null ? `ส่วนสูง ${row.heightCm} ซม.` : null,
  ].filter(Boolean);
  return `ตรวจ ${formatThaiDate(row.recordedDate)} · ${parts.join(" · ")}`;
}

function RecordMeta({ row }: { row: LabRow }) {
  return (
    <>
      <p className="mt-1 text-xs text-slate-700">กรอกโดย {row.createdByName} · {formatThaiDateTime(row.createdAt)}</p>
      {row.note ? <p className="mt-1 text-sm text-slate-800">หมายเหตุ: {row.note}</p> : null}
      {row.voided ? <VoidedNote voided={row.voided} /> : null}
    </>
  );
}

/** แท็บผลตรวจ: ตารางบนจอใหญ่ การ์ดบนมือถือ รายการที่ยกเลิกแล้วยังแสดงเพื่อให้ตรวจสอบย้อนหลังได้ */
export default function LabHistory({ patientId, rows, canManage }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`/patients/${patientId}/labs/new`} className={`${PRIMARY_BUTTON} w-full md:w-auto`}>+ บันทึกผลตรวจ</Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">ยังไม่มีผลตรวจ</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[920px] border-collapse">
              <caption className="sr-only">ประวัติผลตรวจ เรียงจากวันที่ตรวจล่าสุด</caption>
              <thead className="bg-slate-50 text-sm text-slate-800">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-4 py-3 text-left font-semibold">วันที่ตรวจ</th>
                  <th scope="col" className="px-3 py-3 text-left font-semibold">HbA1c</th>
                  <th scope="col" className="px-3 py-3 text-left font-semibold">FBS</th>
                  <th scope="col" className="px-3 py-3 text-left font-semibold">ความดัน</th>
                  <th scope="col" className="px-3 py-3 text-left font-semibold">น้ำหนัก</th>
                  <th scope="col" className="px-3 py-3 text-left font-semibold">ส่วนสูง</th>
                  <th scope="col" className="px-3 py-3 text-left font-semibold">BMI</th>
                  {canManage ? <th scope="col" className="px-4 py-3 text-right font-semibold"><span className="sr-only">การจัดการ</span></th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cell = `px-3 py-3 align-top text-[15px] ${row.voided ? "text-slate-600 line-through" : "text-slate-900"}`;
                  return (
                    <tr key={row.id} className="border-b border-slate-200 last:border-b-0">
                      <th scope="row" className="max-w-[20rem] px-4 py-3 text-left align-top font-normal">
                        <p className="font-semibold text-slate-900">{formatThaiDate(row.recordedDate)}</p>
                        <RecordMeta row={row} />
                      </th>
                      <td className={cell}>{value(row.hba1c, "%")}</td>
                      <td className={cell}>{value(row.fbs, "mg/dL")}</td>
                      <td className={cell}>{bloodPressure(row)}</td>
                      <td className={cell}>{value(row.weightKg, "กก.")}</td>
                      <td className={cell}>{value(row.heightCm, "ซม.")}</td>
                      <td className={cell}>{bmiText(row)}</td>
                      {canManage ? (
                        <td className="px-4 py-1 text-right align-top">
                          <VoidRecordButton kind="lab" id={row.id} summary={voidSummary(row)} voided={row.voided !== null} />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden" aria-label="ประวัติผลตรวจ">
            {rows.map((row) => (
              <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{formatThaiDate(row.recordedDate)}</p>
                <dl className={`mt-2 grid grid-cols-2 gap-2 text-sm ${row.voided ? "text-slate-600 line-through" : "text-slate-900"}`}>
                  <div><dt className="text-slate-700">HbA1c</dt><dd className="font-medium">{value(row.hba1c, "%")}</dd></div>
                  <div><dt className="text-slate-700">FBS</dt><dd className="font-medium">{value(row.fbs, "mg/dL")}</dd></div>
                  <div><dt className="text-slate-700">ความดัน</dt><dd className="font-medium">{bloodPressure(row)}</dd></div>
                  <div><dt className="text-slate-700">น้ำหนัก</dt><dd className="font-medium">{value(row.weightKg, "กก.")}</dd></div>
                  <div><dt className="text-slate-700">ส่วนสูง</dt><dd className="font-medium">{value(row.heightCm, "ซม.")}</dd></div>
                  <div><dt className="text-slate-700">BMI</dt><dd className="font-medium">{bmiText(row)}</dd></div>
                </dl>
                <RecordMeta row={row} />
                {canManage ? <VoidRecordButton kind="lab" id={row.id} summary={voidSummary(row)} voided={row.voided !== null} /> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
