import Link from "next/link";
import { PRIMARY_BUTTON } from "@/components/forms/fields";
import LabSummaryStrip from "@/components/patients/profile/LabSummaryStrip";
import VoidRecordButton from "@/components/records/VoidRecordButton";
import VoidedNote from "@/components/records/VoidedNote";
import { formatThaiDateTime } from "@/lib/alert-center";
import type { LabRow } from "@/lib/data/labs";
import { formatThaiDate } from "@/lib/format";
import { buildLabSeries, withUnit } from "@/lib/lab-summary";
import { assessBloodPressure } from "@/lib/risk/blood-pressure";
import type { RiskRules } from "@/lib/risk/types";

type Props = { patientId: string; rows: LabRow[]; canManage: boolean; rules: RiskRules; ruleSetMissing: boolean; today: string };
type ListProps = Pick<Props, "rows" | "canManage" | "rules" | "ruleSetMissing">;

function value(v: number | null, unit: string): string {
  return v === null ? "—" : withUnit(v, unit);
}

function bloodPressure(row: LabRow): string {
  return row.sbp === null && row.dbp === null ? "—" : `${row.sbp ?? "-"}/${row.dbp ?? "-"} mmHg`;
}

/** ไม่ตัดสินเมื่อไม่มีชุดเกณฑ์ที่ใช้งาน และรายการที่ยกเลิกแล้วไม่นับเป็นค่าวิกฤต */
function isCriticalBp(row: LabRow, rules: RiskRules, ruleSetMissing: boolean): boolean {
  if (ruleSetMissing || row.voided !== null) return false;
  return assessBloodPressure({ id: row.id, recordedDate: row.recordedDate, sbp: row.sbp, dbp: row.dbp, isVoided: false }, rules) !== null;
}

function CriticalMark() {
  return <span className="block text-xs font-semibold text-[#991b1b]">ถึงเกณฑ์วิกฤต</span>;
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
      <p className="text-xs text-slate-700">กรอกโดย {row.createdByName} · {formatThaiDateTime(row.createdAt)}</p>
      {row.note ? <p className="mt-1 text-sm text-slate-800">หมายเหตุ: {row.note}</p> : null}
      {row.voided ? <VoidedNote voided={row.voided} /> : null}
    </>
  );
}

const TH = "px-3 py-3 text-right font-semibold align-bottom";

/** หัวคอลัมน์บอกหน่วยแล้ว ตารางจึงแสดงเฉพาะตัวเลข ไล่ดูตามแนวตั้งได้ง่าย */
function Num({ children, voided }: { children: React.ReactNode; voided: boolean }) {
  return <td className={`px-3 py-3 text-right align-top text-[15px] tabular-nums ${voided ? "text-slate-600 line-through" : "font-medium text-slate-900"}`}>{children}</td>;
}

function HistoryTable({ rows, canManage, rules, ruleSetMissing }: ListProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white xl:block">
      <table className="w-full min-w-[920px] border-collapse">
        <caption className="sr-only">ประวัติผลตรวจ เรียงจากวันที่ตรวจล่าสุด</caption>
        <thead className="bg-slate-50 text-sm text-slate-800">
          <tr className="border-b border-slate-200">
            <th scope="col" className="px-4 py-3 text-left font-semibold align-bottom">วันที่ตรวจ</th>
            <th scope="col" className={TH}>HbA1c <span className="block text-xs font-normal text-slate-700">%</span></th>
            <th scope="col" className={TH}>FBS <span className="block text-xs font-normal text-slate-700">mg/dL</span></th>
            <th scope="col" className={TH}>ความดัน <span className="block text-xs font-normal text-slate-700">mmHg</span></th>
            <th scope="col" className={TH}>น้ำหนัก <span className="block text-xs font-normal text-slate-700">กก.</span></th>
            <th scope="col" className={TH}>ส่วนสูง <span className="block text-xs font-normal text-slate-700">ซม.</span></th>
            <th scope="col" className={TH}>BMI</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold align-bottom">ผู้บันทึกและหมายเหตุ</th>
            {canManage ? <th scope="col" className="px-4 py-3"><span className="sr-only">การจัดการ</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const voided = row.voided !== null;
            const critical = isCriticalBp(row, rules, ruleSetMissing);
            return (
              <tr key={row.id} className={`border-b border-slate-200 last:border-b-0 ${voided ? "bg-slate-50" : ""}`}>
                <th scope="row" className="whitespace-nowrap px-4 py-3 text-left align-top text-[15px] font-semibold text-slate-900">
                  {formatThaiDate(row.recordedDate)}
                </th>
                <Num voided={voided}>{row.hba1c ?? "—"}</Num>
                <Num voided={voided}>{row.fbs ?? "—"}</Num>
                <Num voided={voided}>
                  <span className={critical ? "font-semibold text-[#991b1b]" : ""}>{row.sbp === null && row.dbp === null ? "—" : `${row.sbp ?? "-"}/${row.dbp ?? "-"}`}</span>
                  {critical ? <CriticalMark /> : null}
                </Num>
                <Num voided={voided}>{row.weightKg ?? "—"}</Num>
                <Num voided={voided}>{row.heightCm ?? "—"}</Num>
                <Num voided={voided}>{bmiText(row)}</Num>
                <td className="min-w-72 px-4 py-3 align-top"><RecordMeta row={row} /></td>
                {canManage ? (
                  <td className="whitespace-nowrap px-4 py-1 text-right align-top">
                    <VoidRecordButton kind="lab" id={row.id} summary={voidSummary(row)} voided={voided} tone="neutral" />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CardValue({ label, voided, children }: { label: string; voided: boolean; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-700">{label}</dt>
      <dd className={voided ? "font-medium text-slate-600 line-through" : "font-medium text-slate-900"}>{children}</dd>
    </div>
  );
}

function HistoryCards({ rows, canManage, rules, ruleSetMissing }: ListProps) {
  return (
    <ul className="space-y-3 md:grid md:grid-cols-2 md:items-start md:gap-3 md:space-y-0 xl:hidden" aria-label="ประวัติผลตรวจ">
      {rows.map((row) => {
        const voided = row.voided !== null;
        const critical = isCriticalBp(row, rules, ruleSetMissing);
        return (
          <li key={row.id} className={`rounded-xl border border-slate-200 p-4 ${voided ? "bg-slate-50" : "bg-white"}`}>
            <p className="font-semibold text-slate-900">{formatThaiDate(row.recordedDate)}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm tabular-nums">
              <CardValue label="HbA1c" voided={voided}>{value(row.hba1c, "%")}</CardValue>
              <CardValue label="FBS" voided={voided}>{value(row.fbs, "mg/dL")}</CardValue>
              <CardValue label="ความดัน" voided={voided}>
                <span className={critical ? "font-semibold text-[#991b1b]" : ""}>{bloodPressure(row)}</span>
                {critical ? <CriticalMark /> : null}
              </CardValue>
              <CardValue label="น้ำหนัก" voided={voided}>{value(row.weightKg, "กก.")}</CardValue>
              <CardValue label="ส่วนสูง" voided={voided}>{value(row.heightCm, "ซม.")}</CardValue>
              <CardValue label="BMI" voided={voided}>{bmiText(row)}</CardValue>
            </dl>
            <div className="mt-3"><RecordMeta row={row} /></div>
            {canManage ? <VoidRecordButton kind="lab" id={row.id} summary={voidSummary(row)} voided={voided} tone="neutral" /> : null}
          </li>
        );
      })}
    </ul>
  );
}

/** แท็บผลตรวจ: ค่าล่าสุดและแนวโน้มอยู่บน ประวัติครบอยู่ล่าง รายการที่ยกเลิกแล้วยังแสดงเพื่อให้ตรวจสอบย้อนหลังได้ */
export default function LabHistory({ patientId, rows, canManage, rules, ruleSetMissing, today }: Props) {
  const addButton = <Link href={`/patients/${patientId}/labs/new`} className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>+ บันทึกผลตรวจ</Link>;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
        <p className="text-slate-700">ยังไม่มีผลตรวจ</p>
        {addButton}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="lab-latest" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="lab-latest" className="text-lg font-semibold text-slate-900">ผลล่าสุด</h2>
          {addButton}
        </div>
        <LabSummaryStrip series={buildLabSeries(rows, rules)} rules={rules} ruleSetMissing={ruleSetMissing} today={today} />
      </section>

      <section aria-labelledby="lab-history" className="space-y-3">
        <h2 id="lab-history" className="text-lg font-semibold text-slate-900">
          ประวัติผลตรวจ <span className="text-sm font-normal text-slate-700">{rows.length} รายการ</span>
        </h2>
        <HistoryTable rows={rows} canManage={canManage} rules={rules} ruleSetMissing={ruleSetMissing} />
        <HistoryCards rows={rows} canManage={canManage} rules={rules} ruleSetMissing={ruleSetMissing} />
      </section>
    </div>
  );
}
