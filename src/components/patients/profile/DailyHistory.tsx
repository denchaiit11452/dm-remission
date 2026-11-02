import Link from "next/link";
import RiskBadge from "@/components/patients/RiskBadge";
import { formatThaiDate, formatThaiRange } from "@/lib/format";
import { MAX_RANGE_DAYS, PERIODS, PRESET_RANGES, type DailyHistory as History, type HistoryDay, type HistoryRange } from "@/lib/history";
import { GLUCOSE_PERIOD_LABELS, RISK_LEVEL_LABELS, RISK_LEVEL_ORDER } from "@/lib/risk/levels";
import GlucoseValue, { GlucoseTile, TILE_STYLES } from "./GlucoseValue";

type Props = {
  patientId: string;
  history: History;
  range: HistoryRange;
  goodMin: number;
  goodMax: number;
};

const DAYS_STEP = 7;

function NotRecordedTag() {
  return <span className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-500 bg-white px-2.5 py-1 text-[13px] font-medium text-slate-800">ไม่ได้บันทึก</span>;
}

function CriticalMark() {
  return (
    <span role="img" aria-label="มีค่าวิกฤต" className="ml-2 text-[#991b1b]">
      ⚠
    </span>
  );
}

function DayLevel({ day }: { day: HistoryDay }) {
  return day.recorded && day.level ? <RiskBadge level={day.level} /> : <NotRecordedTag />;
}

function Legend() {
  return (
    <ul aria-label="คำอธิบายสี" className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
      {RISK_LEVEL_ORDER.map((l) => (
        <li key={l} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1">
          <span aria-hidden="true" className={`inline-block size-3 rounded-sm border border-slate-300 ${l === "WELL_CONTROLLED" ? "bg-green-100" : TILE_STYLES[l].split(" ")[0]}`} />
          {RISK_LEVEL_LABELS[l]}
        </li>
      ))}
      <li className="text-slate-700">▲ สูง ▼ ต่ำ</li>
    </ul>
  );
}

export default function DailyHistory({ patientId, history, range, goodMin, goodMax }: Props) {
  const base = `/patients/${patientId}?tab=history`;
  const { stats } = history;
  const spanDays = history.days.length;
  const canExtend = spanDays < MAX_RANGE_DAYS;

  return (
    <div className="space-y-4">
      {/* เลือกช่วงวันที่ */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="เลือกช่วงวันที่" className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white">
          {PRESET_RANGES.map((n) => {
            const active = !range.custom && range.preset === n;
            return (
              <Link
                key={n}
                href={`${base}&range=${n}`}
                aria-current={active ? "true" : undefined}
                className={`inline-flex min-h-11 items-center px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700 ${active ? "bg-teal-50 font-semibold text-teal-900" : "text-slate-800 hover:bg-slate-50"}`}
              >
                {n} วัน
              </Link>
            );
          })}
        </div>
        <details className="relative">
          <summary className={`inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${range.custom ? "border-teal-700 bg-teal-50 font-semibold text-teal-900" : "border-slate-300 bg-white text-slate-800"}`}>
            กำหนดเอง
          </summary>
          <form method="get" action={`/patients/${patientId}`} className="absolute z-10 mt-2 flex w-72 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <input type="hidden" name="tab" value="history" />
            <label className="text-sm text-slate-800">
              ตั้งแต่วันที่
              <input type="date" name="from" required defaultValue={history.from} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
            </label>
            <label className="text-sm text-slate-800">
              ถึงวันที่
              <input type="date" name="to" required defaultValue={history.to} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
            </label>
            <p className="text-xs text-slate-700">เลือกได้ไม่เกิน {MAX_RANGE_DAYS} วัน (ถ้าเกินหรือผิด ระบบใช้ 7 วันล่าสุดแทน)</p>
            <button type="submit" className="min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
              ดูช่วงนี้
            </button>
          </form>
        </details>
        <p className="text-sm text-slate-800">
          {formatThaiRange(history.from, history.to)}
          <span className="md:hidden"> · สีตามค่าที่แย่ที่สุดในช่อง</span>
        </p>
      </div>

      <Legend />

      {/* สถิติของช่วงที่เลือก */}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-800">
        <span>
          ค่าเฉลี่ย <strong>{stats.mean !== null ? `${stats.mean} mg/dL` : "-"}</strong> ({stats.valueCount} ค่า)
        </span>
        <span>
          อยู่ในช่วง {goodMin}–{goodMax}{" "}
          <strong>{stats.inRangePercent !== null ? `${stats.inRangePercent}%` : "-"}</strong>
          {stats.inRangePercent !== null ? ` (${stats.inRangeCount} จาก ${stats.valueCount} ค่า)` : ""}
        </span>
        <span>
          ไม่ได้บันทึก <strong>{stats.unrecordedDays.length} วัน</strong>
          {stats.unrecordedDays.length > 0 && stats.unrecordedDays.length <= 5 ? ` (${stats.unrecordedDays.map(formatThaiDate).join(", ")})` : ""}
        </span>
      </p>

      {/* ตาราง Desktop/Tablet */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[720px] border-collapse">
          <caption className="sr-only">ประวัติค่าน้ำตาลรายวัน {formatThaiRange(history.from, history.to)} เรียงจากวันล่าสุด</caption>
          <thead className="bg-slate-50 text-sm text-slate-800">
            <tr className="border-b border-slate-200">
              <th scope="col" rowSpan={2} className="px-4 py-3 text-left font-semibold">วันที่วัด</th>
              <th scope="colgroup" colSpan={2} className="border-l border-slate-200 px-2 py-2 text-center font-semibold">มื้อเช้า</th>
              <th scope="colgroup" colSpan={2} className="border-l border-slate-200 px-2 py-2 text-center font-semibold">มื้อเย็น</th>
              <th scope="col" rowSpan={2} className="border-l border-slate-200 px-4 py-3 text-left font-semibold">ระดับของวัน</th>
            </tr>
            <tr className="border-b border-slate-200 text-xs">
              {PERIODS.map((p, i) => (
                <th key={p} scope="col" className={`px-2 py-2 text-center font-normal ${i === 2 ? "border-l border-slate-200" : ""}`}>
                  {p.startsWith("BEFORE") ? "ก่อนอาหาร" : "หลังอาหาร"}
                  <span className="sr-only"> {p.endsWith("BREAKFAST") ? "เช้า" : "เย็น"}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.days.map((day) => (
              <tr key={day.date} className={`border-b border-slate-200 last:border-b-0 ${day.level === "CRITICAL" ? "bg-red-50" : ""}`}>
                <th scope="row" className="px-4 py-3 text-left align-middle font-normal">
                  <p className="font-semibold text-slate-900">
                    {formatThaiDate(day.date)}
                    {day.level === "CRITICAL" ? <CriticalMark /> : null}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-700">
                    {day.weekday}
                    {day.isLatest ? <span className="rounded-md border border-slate-500 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-800">ล่าสุด</span> : null}
                  </p>
                </th>
                {day.recorded ? (
                  PERIODS.map((p, i) => (
                    <td key={p} className={`px-2 py-3 text-center align-middle ${i === 2 ? "border-l border-slate-200" : ""}`}>
                      <GlucoseValue primary={day.cells[p].primary} repeats={day.cells[p].repeats} />
                    </td>
                  ))
                ) : (
                  <td colSpan={4} className="border-l border-slate-200 px-4 py-3 text-center text-sm text-slate-700">
                    ไม่ได้บันทึกค่าน้ำตาลในวันนี้
                  </td>
                )}
                <td className="border-l border-slate-200 px-4 py-3 align-middle"><DayLevel day={day} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* การ์ดมือถือ */}
      <ul className="space-y-3 md:hidden" aria-label={`ประวัติค่าน้ำตาลรายวัน ${formatThaiRange(history.from, history.to)}`}>
        {history.days.map((day) => (
          <li key={day.date} className={`rounded-xl border bg-white p-4 ${day.level === "CRITICAL" ? "border-2 border-red-300" : "border-slate-200"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">
                {formatThaiDate(day.date)}
                {day.level === "CRITICAL" ? <CriticalMark /> : null}
                <span className="ml-2 text-xs font-normal text-slate-700">
                  {day.weekday}
                  {day.isLatest ? " · ล่าสุด" : ""}
                </span>
              </p>
              <DayLevel day={day} />
            </div>
            {day.recorded ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {PERIODS.map((p) => (
                  <GlucoseTile key={p} label={GLUCOSE_PERIOD_LABELS[p]} primary={day.cells[p].primary} repeats={day.cells[p].repeats} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-700">ไม่ได้บันทึกค่าน้ำตาลในวันนี้</p>
            )}
          </li>
        ))}
      </ul>

      {canExtend ? (
        <Link
          href={`${base}&days=${Math.min(spanDays + DAYS_STEP, MAX_RANGE_DAYS)}`}
          scroll={false}
          className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 md:hidden"
        >
          ดูย้อนหลังเพิ่ม
        </Link>
      ) : null}

      <p className="text-xs leading-relaxed text-slate-700">
        หน่วย mg/dL · &quot;—&quot; คือไม่ได้บันทึก · วัดซ้ำแสดงค่าที่แย่ที่สุดเป็นหลัก ส่วนค่าที่เหลือแสดงเป็น &quot;+ วัดซ้ำ&quot; ·
        &quot;ระดับของวัน&quot; คือค่าที่แย่ที่สุดของวัน (ใช้ประเมินระดับปัจจุบัน) · ผู้ป่วยวัดเองที่บ้าน เจ้าหน้าที่เป็นผู้กรอก
      </p>
    </div>
  );
}
