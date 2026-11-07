import type { CSSProperties } from "react";
import Link from "next/link";
import { PANEL_LINK } from "@/components/dashboard/Panel";
import RemissionTrack from "@/components/patients/profile/RemissionTrack";
import { daysBetween } from "@/lib/date";
import { formatAgo, formatThaiDate, formatThaiRange } from "@/lib/format";
import type { DailyHistory, HistoryDay } from "@/lib/history";
import type { LabSeries } from "@/lib/lab-summary";
import { metricScale } from "@/lib/metric-chart";
import type { RemissionTrack as Track } from "@/lib/patient-overview";
import type { RemissionStatus } from "@/lib/remission/remission";
import type { RiskRules } from "@/lib/risk/types";
import "./patient-profile.css";

type Props = {
  patientId: string;
  track: Track;
  remissionStatus: RemissionStatus;
  rules: RiskRules;
  ruleSetMissing: boolean;
  series: LabSeries;
  history: DailyHistory;
  today: string;
};

// ---------------------------------------------------------------- ค่าล่าสุด
type Reading = { label: string; value: string | null; unit: string; date?: string; critical?: boolean };

function LatestReadings({ series, today, ruleSetMissing }: { series: LabSeries; today: string; ruleSetMissing: boolean }) {
  const hba1c = series.hba1c.at(-1);
  const fbs = series.fbs.at(-1);
  const bp = series.bloodPressure.at(-1);
  const weight = series.weightKg.at(-1);
  const bmi = series.bmi.at(-1);
  const rows: Reading[] = [
    { label: "HbA1c", value: hba1c ? String(hba1c.value) : null, unit: "%", date: hba1c?.date },
    { label: "FBS", value: fbs ? String(fbs.value) : null, unit: "mg/dL", date: fbs?.date },
    { label: "ความดัน", value: bp ? `${bp.sbp}/${bp.dbp}` : null, unit: "mmHg", date: bp?.date, critical: !ruleSetMissing && bp?.critical },
    { label: "น้ำหนัก", value: weight ? String(weight.value) : null, unit: "กก.", date: weight?.date },
    { label: "BMI", value: bmi ? String(bmi.value) : null, unit: "", date: bmi?.date },
  ];

  return (
    <section aria-labelledby="latest-readings-title" className="flex min-w-0 flex-col rounded-[10px] border border-slate-200 bg-white p-4 md:p-5">
      <h2 id="latest-readings-title" className="text-[17px] font-semibold leading-snug text-slate-900">ผลตรวจล่าสุด</h2>
      <p className="mt-0.5 text-[13px] text-slate-600">แต่ละค่าอาจมาจากคนละวัน</p>
      <dl className="mt-3 flex flex-1 flex-col divide-y divide-slate-200">
        {rows.map((r) => {
          const age = r.date ? daysBetween(r.date, today) : null;
          return (
            <div key={r.label} className="grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2.5">
              <dt className="text-[14px] text-slate-700">{r.label}</dt>
              <dd className="text-right">
                {r.value === null ? (
                  <span className="text-[14px] text-slate-600">ยังไม่มีผล</span>
                ) : (
                  <span className={`text-[18px] font-semibold tabular-nums ${r.critical ? "text-risk-critical" : "text-slate-900"}`}>
                    {r.value}
                    {r.unit ? <span className={`text-[13px] font-normal text-slate-600 ${r.unit === "%" ? "" : "ml-1"}`}>{r.unit}</span> : null}
                  </span>
                )}
              </dd>
              {r.date ? (
                <dd className="col-span-2 flex justify-between gap-2 text-[12.5px] text-slate-600">
                  <span>{formatThaiDate(r.date)}</span>
                  <span className={age !== null && age > 180 ? "font-medium text-slate-800" : ""}>{formatAgo(age)}</span>
                </dd>
              ) : null}
              {r.critical ? <dd className="col-span-2 text-[12.5px] font-semibold text-risk-critical">ถึงเกณฑ์ความดันวิกฤต</dd> : null}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------- น้ำตาล 14 วัน
function numericValues(day: HistoryDay): number[] {
  return Object.values(day.cells)
    .flatMap((c) => (c.primary ? [c.primary, ...c.repeats] : []))
    .flatMap((r) => (r.meterFlag === "NONE" && r.valueMgDl !== null ? [r.valueMgDl] : []));
}

function GlucoseDays({ patientId, history, rules }: { patientId: string; history: DailyHistory; rules: Pick<RiskRules, "goodMin" | "goodMax"> }) {
  const days = [...history.days].reverse(); // เก่าไปใหม่ ซ้ายไปขวา
  const all = days.flatMap(numericValues);
  const scale = metricScale([...all, rules.goodMin, rules.goodMax], 0);
  const yOf = (v: number) => (1 - (v - scale.min) / (scale.max - scale.min)) * 100;
  const recordedDays = days.filter((d) => d.recorded).length;
  const { stats } = history;

  return (
    <section aria-labelledby="glucose-days-title" className="rounded-[10px] border border-slate-200 bg-white p-4 md:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="glucose-days-title" className="text-[17px] font-semibold leading-snug text-slate-900">น้ำตาล DTX {days.length} วันล่าสุดที่มีการวัด</h2>
          <p className="mt-0.5 text-[13px] text-slate-600">{formatThaiRange(history.from, history.to)}</p>
        </div>
        <Link href={`/patients/${patientId}?tab=trend`} className={`${PANEL_LINK} text-[14px]`}>ดูกราฟแนวโน้ม</Link>
      </header>

      <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
        {[
          { label: "ค่าเฉลี่ย", value: stats.mean === null ? null : String(stats.mean), unit: "mg/dL" },
          { label: `อยู่ในช่วง ${rules.goodMin}–${rules.goodMax}`, value: stats.inRangePercent === null ? null : String(stats.inRangePercent), unit: "%" },
          { label: "วันที่มีการวัด", value: String(recordedDays), unit: `จาก ${days.length} วัน` },
        ].map((s) => (
          <div key={s.label} className="bg-white px-3 py-2.5">
            <dt className="text-[12.5px] text-slate-600">{s.label}</dt>
            <dd className="mt-0.5 text-[22px] font-semibold leading-tight tabular-nums text-slate-900">
              {s.value === null ? <span className="text-[14px] font-medium text-slate-600">ยังไม่มีค่า</span> : s.value}
              {s.value === null ? null : <span className={`text-[12.5px] font-normal text-slate-600 ${s.unit === "%" ? "" : "ml-1"}`}>{s.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {all.length > 0 ? (
        <figure className="mt-4">
          <div className="relative ml-9 h-[120px]">
            {scale.ticks.map((t) => (
              <div key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-slate-200" style={{ top: `${yOf(t)}%` }}>
                <span className="absolute right-full mr-2 -translate-y-1/2 text-[12px] leading-none tabular-nums text-slate-600">{t}</span>
              </div>
            ))}
            {/* ช่วงควบคุมได้ดี */}
            <div
              aria-hidden="true"
              className="pp-band absolute inset-x-0 bg-primary-tint/70"
              style={{ top: `${yOf(rules.goodMax)}%`, height: `${yOf(rules.goodMin) - yOf(rules.goodMax)}%` }}
            />
            <ol className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {days.map((d, i) => {
                const values = numericValues(d);
                const low = values.length ? Math.min(...values) : null;
                const high = values.length ? Math.max(...values) : null;
                const label = `${formatThaiDate(d.date)}: ${values.length === 0 ? (d.recorded ? "มีเฉพาะค่า LO/HI" : "ไม่ได้วัด") : low === high ? `${low} mg/dL` : `ต่ำสุด ${low} สูงสุด ${high} mg/dL`}`;
                return (
                  <li key={d.date} className="relative" aria-label={label}>
                    {low !== null && high !== null ? (
                      <span
                        aria-hidden="true"
                        className="pp-day-range absolute left-1/2 w-1.5 min-h-1.5 -translate-x-1/2 rounded-full bg-primary"
                        style={{ top: `${yOf(high)}%`, height: `${yOf(low) - yOf(high)}%`, "--pp-i": i } as CSSProperties}
                      />
                    ) : (
                      <span aria-hidden="true" className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-slate-400" />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          <div aria-hidden="true" className="ml-9 mt-1.5 flex justify-between text-[12px] tabular-nums text-slate-600">
            <span>{formatThaiDate(history.from)}</span>
            <span>{formatThaiDate(history.to)}</span>
          </div>
          <figcaption className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 pl-9 text-[12.5px] text-slate-600">
            <span>แท่งแต่ละวันคือช่วงจากค่าต่ำสุดถึงสูงสุดของวัน จุดเทาที่ฐานคือวันที่ไม่ได้วัด</span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-4 rounded-[3px] bg-primary-tint" />
              ช่วงควบคุมได้ดี {rules.goodMin}–{rules.goodMax} mg/dL
            </span>
          </figcaption>
        </figure>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-8 text-center text-[14px] text-slate-700">
          ยังไม่มีค่าน้ำตาลในช่วงนี้{" "}
          <Link href={`/patients/${patientId}/glucose`} className={`${PANEL_LINK} min-h-0`}>บันทึกน้ำตาล</Link>
        </p>
      )}
    </section>
  );
}

/** แท็บภาพรวม: ระยะถึงเกณฑ์ Remission อยู่ซ้าย ค่าล่าสุดอยู่ขวา แล้วน้ำตาลช่วงสั้นด้านล่าง */
export default function OverviewTab({ patientId, track, remissionStatus, rules, ruleSetMissing, series, history, today }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_400px]">
        <RemissionTrack track={track} status={remissionStatus} rules={rules} ruleSetMissing={ruleSetMissing} />
        <LatestReadings series={series} today={today} ruleSetMissing={ruleSetMissing} />
      </div>
      <GlucoseDays patientId={patientId} history={history} rules={rules} />
    </div>
  );
}
