"use client";

// กราฟน้ำตาล DTX ของผู้ป่วยหนึ่งคน แต่ละวันแบ่งเป็น 4 ช่องตามช่วงเวลาที่วัด จึงเห็นรูปแบบก่อน-หลังอาหาร
// ชี้หรือกดลูกศรเพื่อเลือกวัน แถบด้านบนแสดงทุกค่าของวันนั้นพร้อมระดับของวัน
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { useChartArrival } from "@/components/dashboard/useChartArrival";
import RiskBadge from "@/components/patients/RiskBadge";
import GlucoseValue from "@/components/patients/profile/GlucoseValue";
import { formatGlucoseValue, formatThaiDate } from "@/lib/format";
import { PERIODS, type HistoryDay, type HistoryReading } from "@/lib/history";
import { metricScale } from "@/lib/metric-chart";
import { GLUCOSE_PERIOD_LABELS } from "@/lib/risk/levels";

type Props = {
  /** เรียงจากเก่าไปใหม่ */
  days: HistoryDay[];
  goodMin: number;
  goodMax: number;
};

type Dot = { key: string; x: number; y: number; reading: HistoryReading; tone: "in" | "out" | "critical" };

const SHORT_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]}`;
}

const DOT_TONE: Record<Dot["tone"], string> = {
  in: "bg-primary border-white",
  out: "bg-white border-primary",
  critical: "bg-risk-critical border-white",
};

export default function GlucoseTrendChart({ days, goodMin, goodMax }: Props) {
  let lastRecorded = -1;
  days.forEach((d, i) => { if (d.recorded) lastRecorded = i; });
  const [active, setActive] = useState<number | null>(null);
  const shownIndex = active ?? (lastRecorded >= 0 ? lastRecorded : days.length - 1);
  const shown = days[shownIndex];

  const readings = days.flatMap((d) => PERIODS.flatMap((p) => (d.cells[p].primary ? [d.cells[p].primary!, ...d.cells[p].repeats] : [])));
  const numbers = readings.flatMap((r) => (r.meterFlag === "NONE" && r.valueMgDl !== null ? [r.valueMgDl] : []));
  const scale = metricScale([...numbers, goodMin, goodMax], 0);
  const yOf = (v: number) => (1 - (v - scale.min) / (scale.max - scale.min)) * 100;
  const dayWidth = 100 / days.length;
  const xOf = (dayIndex: number, slot: number) => (dayIndex + (slot + 0.5) / PERIODS.length) * dayWidth;

  const dots: Dot[] = [];
  // เส้นต่อค่าหลักของแต่ละช่วงเวลาตามลำดับเวลา ขาดเส้นเมื่อมีวันที่ไม่ได้วัด
  let path = "";
  let penDown = false;
  days.forEach((day, i) => {
    if (!day.recorded) { penDown = false; return; }
    PERIODS.forEach((period, slot) => {
      const cell = day.cells[period];
      [cell.primary, ...cell.repeats].forEach((reading, n) => {
        if (!reading) return;
        const value = reading.meterFlag === "METER_LOW" ? scale.min : reading.meterFlag === "METER_HIGH" ? scale.max : reading.valueMgDl;
        if (value === null) return;
        const x = xOf(i, slot);
        const y = yOf(value);
        const inRange = reading.meterFlag === "NONE" && value >= goodMin && value <= goodMax;
        dots.push({ key: `${day.date}-${period}-${n}`, x, y, reading, tone: reading.level === "CRITICAL" ? "critical" : inRange ? "in" : "out" });
        if (n === 0) {
          path += `${penDown ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)} `;
          penDown = true;
        }
      });
    });
  });

  const rootRef = useChartArrival(`${days[0]?.date}|${days.at(-1)?.date}|${numbers.join(",")}`, { order: 4 });

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.floor(((event.clientX - box.left) / box.width) * days.length);
    setActive(Math.min(days.length - 1, Math.max(0, index)));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return setActive(null);
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (event.key === "Home") return setActive(0);
    if (event.key === "End") return setActive(days.length - 1);
    setActive(Math.min(days.length - 1, Math.max(0, shownIndex + (event.key === "ArrowLeft" ? -1 : 1))));
  };

  // ป้ายวันที่แกนนอนไม่เกิน ~7 ป้าย
  const labelEvery = Math.max(1, Math.ceil(days.length / 7));

  return (
    <div ref={rootRef} className="min-w-0">
      {/* แถบอ่านค่าของวันที่เลือก ความสูงคงที่ หน้าจึงไม่กระโดดเมื่อเลื่อนเลือกวัน */}
      <div aria-live="polite" className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1">
          <p className="text-[15px] font-semibold text-slate-900 tabular-nums">{formatThaiDate(shown.date)}</p>
          <p className="text-[12.5px] text-slate-600">{shown.weekday}{active === null && shown.recorded ? " (วันที่วัดล่าสุด)" : ""}</p>
          {shown.recorded ? <RiskBadge level={shown.level} /> : <span className="text-[13px] text-slate-600">ไม่ได้วัด</span>}
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
          {PERIODS.map((p) => (
            <div key={p} className="bg-white px-3 py-2">
              <dt className="text-[12.5px] text-slate-600">{GLUCOSE_PERIOD_LABELS[p]}</dt>
              <dd className="mt-0.5 min-h-7 text-[15px] tabular-nums">
                <GlucoseValue primary={shown.cells[p].primary} repeats={shown.cells[p].repeats} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 pl-10 pr-1">
        <div
          role="img"
          tabIndex={0}
          aria-label={`กราฟน้ำตาล ${days.length} วัน กดลูกศรซ้ายขวาเพื่อเลือกวัน ค่าของวันที่เลือกแสดงด้านบน`}
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={(e) => { if (e.pointerType === "mouse") setActive(null); }}
          onKeyDown={onKeyDown}
          className="relative h-[240px] cursor-crosshair touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 md:h-[280px]"
        >
          {scale.ticks.map((t) => (
            <div key={t} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-slate-200" style={{ top: `${yOf(t)}%` }}>
              <span className="absolute right-full mr-2 -translate-y-1/2 text-[12px] leading-none tabular-nums text-slate-600">{t}</span>
            </div>
          ))}

          <div
            aria-hidden="true"
            className="pp-band pointer-events-none absolute inset-x-0 bg-primary-tint/70"
            style={{ top: `${yOf(goodMax)}%`, height: `${yOf(goodMin) - yOf(goodMax)}%` }}
          />

          {/* วันที่เลือก */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 bg-slate-900/[0.04] transition-[left] duration-100 ease-out"
            style={{ left: `${shownIndex * dayWidth}%`, width: `${dayWidth}%` }}
          />

          <div data-sweep aria-hidden="true" className="pointer-events-none absolute inset-0">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              {path ? <path d={path} fill="none" stroke="var(--color-primary)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /> : null}
            </svg>
            {dots.map((d) => (
              <span
                key={d.key}
                className={`absolute box-content size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${DOT_TONE[d.tone]}`}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
              >
                {d.reading.meterFlag !== "NONE" ? (
                  <span className={`absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold leading-none text-slate-900 ${d.reading.meterFlag === "METER_HIGH" ? "bottom-full mb-1" : "top-full mt-1"}`}>
                    {formatGlucoseValue(d.reading.valueMgDl, d.reading.meterFlag).text}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>

        <div aria-hidden="true" className="relative mt-2 h-4 text-[12px] tabular-nums text-slate-600">
          {days.map((d, i) => {
            const isLast = i === days.length - 1;
            // ป้ายตามรอบ เว้นป้ายที่ชิดป้ายวันสุดท้ายเกินไป
            const onCycle = i % labelEvery === 0 && days.length - 1 - i >= labelEvery / 2;
            if (!isLast && !onCycle) return null;
            return (
              <span key={d.date} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(i + 0.5) * dayWidth}%` }}>
                {shortDate(d.date)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="sr-only">
      <table>
        <caption>ค่าน้ำตาล DTX รายวัน (mg/dL)</caption>
        <thead>
          <tr>
            <th scope="col">วันที่</th>
            {PERIODS.map((p) => <th key={p} scope="col">{GLUCOSE_PERIOD_LABELS[p]}</th>)}
          </tr>
        </thead>
        <tbody>
          {days.filter((d) => d.recorded).map((d) => (
            <tr key={d.date}>
              <th scope="row">{formatThaiDate(d.date)}</th>
              {PERIODS.map((p) => {
                const cell = d.cells[p];
                const values = cell.primary ? [cell.primary, ...cell.repeats].map((r) => formatGlucoseValue(r.valueMgDl, r.meterFlag).text) : [];
                return <td key={p}>{values.length ? values.join(", ") : "ไม่ได้บันทึก"}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-slate-700">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />อยู่ในช่วงควบคุมได้ดี</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full border-2 border-primary bg-white" />นอกช่วง</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-risk-critical" />ถึงเกณฑ์วิกฤต</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-4 rounded-[3px] bg-primary-tint" />ช่วงควบคุมได้ดี {goodMin}–{goodMax} mg/dL</span>
        <span className="text-slate-600">แต่ละวันเรียงช่วงเวลาจากก่อนอาหารเช้าถึงหลังอาหารเย็น</span>
      </p>
    </div>
  );
}
