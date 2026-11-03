import type { ReactNode } from "react";
import LabSparkline from "@/components/patients/profile/LabSparkline";
import LabChangeText from "@/components/records/LabChangeText";
import { daysBetween } from "@/lib/date";
import { formatAgo, formatThaiDate } from "@/lib/format";
import { changeBetween, withUnit, type LabChange, type LabPoint, type LabSeries } from "@/lib/lab-summary";
import { formatPercent } from "@/lib/remission/remission";
import type { RiskRules } from "@/lib/risk/types";

type Props = { series: LabSeries; rules: RiskRules; ruleSetMissing: boolean; today: string };

type Previous = { text: string; date: string };

type TileProps = {
  label: string;
  value: string | null;
  unit: string;
  date?: string;
  today: string;
  changes?: LabChange[];
  previous?: Previous;
  isFirst?: boolean;
  critical?: boolean;
  note?: ReactNode;
  chart?: ReactNode;
};

/** ค่าล่าสุดแต่ละอย่างอาจมาจากคนละวัน จึงต้องบอกวันที่และอายุของผลทุกช่อง */
function Tile({ label, value, unit, date, today, changes = [], previous, isFirst, critical, note, chart }: TileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h3 className="text-sm font-medium text-slate-700">{label}</h3>
        {critical ? <p className="text-[13px] font-semibold text-[#991b1b]">ถึงเกณฑ์วิกฤต</p> : null}
      </div>
      {value === null ? (
        <p className="py-1 text-[15px] font-medium text-slate-700">ยังไม่มีผล</p>
      ) : (
        <>
          <p className={`text-[28px] font-semibold leading-tight tabular-nums md:text-[32px] ${critical ? "text-[#991b1b]" : "text-slate-900"}`}>
            {value}
            <span className={`text-sm font-normal text-slate-700 ${unit === "%" ? "" : "ml-1"}`}>{unit}</span>
          </p>
          {date ? (
            <p className="flex flex-wrap gap-x-1.5 text-[13px] text-slate-700">
              <span className="whitespace-nowrap">{formatThaiDate(date)}</span>
              <span className="whitespace-nowrap">{formatAgo(daysBetween(date, today))}</span>
            </p>
          ) : null}
          <div className="flex min-h-5 flex-wrap items-center gap-x-2 text-[13px] text-slate-800">
            {isFirst ? <span className="font-medium">ผลครั้งแรก</span> : changes.map((c) => <span key={c.label ?? "value"} className="font-medium"><LabChangeText change={c} /></span>)}
            {previous ? <span className="whitespace-nowrap text-slate-700">จาก {previous.text}</span> : null}
            {/* มือถือช่องแคบ: วันที่ของผลก่อนหน้าดูได้จากประวัติด้านล่าง */}
            {previous ? <span className="whitespace-nowrap text-slate-700 max-sm:hidden">{formatThaiDate(previous.date)}</span> : null}
          </div>
        </>
      )}
      {chart || note ? (
        <div className="mt-auto space-y-1 pt-2">
          {value !== null ? chart : null}
          {note ? <p className="text-[13px] text-slate-700">{note}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function changesOf(points: LabPoint[]): LabChange[] {
  if (points.length < 2) return [];
  return [changeBetween(points[points.length - 1].value, points[points.length - 2].value)];
}

function previousOf(points: LabPoint[], unit: string): Previous | undefined {
  const previous = points.at(-2);
  return previous ? { text: withUnit(previous.value, unit), date: previous.date } : undefined;
}

/** แถบสรุปค่าล่าสุดและแนวโน้ม ไม่รวมรายการที่ยกเลิก และไม่ตัดสินว่าค่าดีหรือแย่ ยกเว้นเกณฑ์ที่ระบบกำหนดไว้แล้ว */
export default function LabSummaryStrip({ series, rules, ruleSetMissing, today }: Props) {
  const hba1c = series.hba1c.at(-1);
  const fbs = series.fbs.at(-1);
  const bp = series.bloodPressure.at(-1);
  const bpPrevious = series.bloodPressure.at(-2);
  const weight = series.weightKg.at(-1);
  const bmi = series.bmi.at(-1);
  const systolic = series.bloodPressure.map((p) => ({ date: p.date, value: p.sbp }));

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 xl:grid-cols-4">
      <Tile
        label="HbA1c" value={hba1c ? String(hba1c.value) : null} unit="%" date={hba1c?.date} today={today}
        changes={changesOf(series.hba1c)} previous={previousOf(series.hba1c, "%")} isFirst={series.hba1c.length === 1}
        chart={<LabSparkline points={series.hba1c} label="HbA1c" unit="%" />}
        note={ruleSetMissing ? "ยังไม่มีชุดเกณฑ์ที่ใช้งาน จึงยังไม่แสดงเกณฑ์ Remission" : `เกณฑ์ Remission: ต่ำกว่า ${formatPercent(rules.remissionHba1cMax)}`}
      />
      <Tile
        label="FBS" value={fbs ? String(fbs.value) : null} unit="mg/dL" date={fbs?.date} today={today}
        changes={changesOf(series.fbs)} previous={previousOf(series.fbs, "mg/dL")} isFirst={series.fbs.length === 1}
        chart={<LabSparkline points={series.fbs} label="FBS" unit="mg/dL" />}
      />
      <Tile
        label="ความดัน" value={bp ? `${bp.sbp}/${bp.dbp}` : null} unit="mmHg" date={bp?.date} today={today}
        critical={!ruleSetMissing && bp?.critical} isFirst={series.bloodPressure.length === 1}
        changes={bp && bpPrevious ? [changeBetween(bp.sbp, bpPrevious.sbp, "ตัวบน"), changeBetween(bp.dbp, bpPrevious.dbp, "ตัวล่าง")] : []}
        previous={bpPrevious ? { text: `${bpPrevious.sbp}/${bpPrevious.dbp}`, date: bpPrevious.date } : undefined}
        chart={<LabSparkline points={systolic} label="ตัวบน" unit="mmHg" />}
      />
      <Tile
        label="น้ำหนัก" value={weight ? String(weight.value) : null} unit="กก." date={weight?.date} today={today}
        changes={changesOf(series.weightKg)} previous={previousOf(series.weightKg, "กก.")} isFirst={series.weightKg.length === 1}
        chart={<LabSparkline points={series.weightKg} label="น้ำหนัก" unit="กก." />}
        note={bmi ? <>BMI ล่าสุด {bmi.value} <span className="whitespace-nowrap">({formatThaiDate(bmi.date)})</span></> : undefined}
      />
    </div>
  );
}
