import Link from "next/link";
import GlucoseTrendChart from "@/components/patients/profile/GlucoseTrendChart";
import LabTrendTile, { type LabReference } from "@/components/patients/profile/LabTrendTile";
import { LAB_BANDS } from "@/lib/dashboard-stats";
import { formatThaiDate, formatThaiRange } from "@/lib/format";
import type { DailyHistory } from "@/lib/history";
import type { LabSeries } from "@/lib/lab-summary";
import { formatPercent } from "@/lib/remission/remission";
import type { RiskRules } from "@/lib/risk/types";
import "./patient-profile.css";

export const TREND_RANGES = [14, 30, 90] as const;
export const DEFAULT_TREND_DAYS = 30;

type Props = {
  patientId: string;
  history: DailyHistory;
  days: number;
  series: LabSeries;
  rules: RiskRules;
  ruleSetMissing: boolean;
};

function RangeLinks({ patientId, days }: { patientId: string; days: number }) {
  return (
    <nav aria-label="ช่วงวันของกราฟน้ำตาล" className="grid grid-cols-3 rounded-lg border border-slate-300 bg-white p-0.5 sm:inline-grid">
      {TREND_RANGES.map((n) => {
        const active = n === days;
        return (
          <Link
            key={n}
            href={`/patients/${patientId}?tab=trend&days=${n}`}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-md px-4 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${
              active ? "bg-primary text-white" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {n} วัน
          </Link>
        );
      })}
    </nav>
  );
}

export default function TrendTab({ patientId, history, days, series, rules, ruleSetMissing }: Props) {
  const chartDays = [...history.days].reverse();
  const { stats } = history;
  const recorded = chartDays.some((d) => d.recorded);

  const hba1cRefs: LabReference[] = [
    ...(ruleSetMissing ? [] : [{ value: rules.remissionHba1cMax, label: `เกณฑ์ Remission < ${formatPercent(rules.remissionHba1cMax)}`, tone: "remission" as const }]),
    { value: LAB_BANDS.hba1c.diabetesFrom, label: `เบาหวาน ${LAB_BANDS.hba1c.ranges.DIABETES}`, tone: "critical" },
  ];
  const fbsRefs: LabReference[] = [{ value: LAB_BANDS.fbs.diabetesFrom, label: `เบาหวาน ${LAB_BANDS.fbs.ranges.DIABETES}`, tone: "critical" }];
  const bpRefs: LabReference[] = ruleSetMissing ? [] : [{ value: rules.criticalSbp, label: `ตัวบนวิกฤต ≥ ${rules.criticalSbp}`, tone: "critical" }];
  const bmiLatest = series.bmi.at(-1);

  return (
    <div className="space-y-5">
      <section aria-labelledby="glucose-trend-title" className="rounded-[10px] border border-slate-200 bg-white p-4 md:p-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="glucose-trend-title" className="text-[17px] font-semibold leading-snug text-slate-900">น้ำตาล DTX รายวัน</h2>
            <p className="mt-0.5 text-[13px] text-slate-600">
              {formatThaiRange(history.from, history.to)} นับย้อนจากวันที่วัดล่าสุด
            </p>
          </div>
          <RangeLinks patientId={patientId} days={days} />
        </header>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="text-[12.5px] text-slate-600">ค่าเฉลี่ย</dt>
            <dd className="text-[20px] font-semibold tabular-nums text-slate-900">
              {stats.mean ?? "-"}<span className="ml-1 text-[12.5px] font-normal text-slate-600">mg/dL</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-slate-600">อยู่ในช่วงควบคุมได้ดี</dt>
            <dd className="text-[20px] font-semibold tabular-nums text-slate-900">
              {stats.inRangePercent === null ? "-" : `${stats.inRangePercent}%`}
              <span className="ml-1 text-[12.5px] font-normal text-slate-600">{stats.inRangeCount} จาก {stats.valueCount} ค่า</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-slate-600">วันที่ไม่ได้วัด</dt>
            <dd className="text-[20px] font-semibold tabular-nums text-slate-900">
              {stats.unrecordedDays.length}<span className="ml-1 text-[12.5px] font-normal text-slate-600">วัน</span>
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          {recorded ? (
            <GlucoseTrendChart days={chartDays} goodMin={rules.goodMin} goodMax={rules.goodMax} />
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-10 text-center text-[14px] text-slate-700">
              ยังไม่มีค่าน้ำตาลในช่วงนี้{" "}
              <Link href={`/patients/${patientId}/glucose`} className="font-medium text-teal-800 underline underline-offset-2">บันทึกน้ำตาล</Link>
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="lab-trend-title">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="lab-trend-title" className="text-[17px] font-semibold leading-snug text-slate-900">ผลตรวจตามนัด</h2>
          <p className="text-[13px] text-slate-600">ทุกครั้งที่ตรวจ ไม่รวมรายการที่ยกเลิก</p>
        </header>
        <div className="grid gap-px overflow-hidden rounded-[10px] border border-slate-200 bg-slate-200 md:grid-cols-2">
          <LabTrendTile order={0} label="HbA1c" unit="%" decimals={1} points={series.hba1c} references={hba1cRefs} />
          <LabTrendTile order={1} label="FBS" unit="mg/dL" decimals={0} points={series.fbs} references={fbsRefs} />
          <LabTrendTile
            order={2}
            label="ความดันโลหิต"
            unit="mmHg"
            decimals={0}
            points={series.bloodPressure.map((p) => ({ date: p.date, value: p.sbp, secondary: p.dbp }))}
            references={bpRefs}
            lineNames={["ตัวบน", "ตัวล่าง"]}
          />
          <LabTrendTile
            order={3}
            label="น้ำหนัก"
            unit="กก."
            decimals={1}
            points={series.weightKg}
            references={[]}
            note={bmiLatest ? `BMI ล่าสุด ${bmiLatest.value} (${formatThaiDate(bmiLatest.date)})` : undefined}
          />
        </div>
      </section>
    </div>
  );
}
