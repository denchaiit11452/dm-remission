"use client";

// กราฟผลตรวจหนึ่งตัวของผู้ป่วยหนึ่งคน แกนนอนตามระยะเวลาจริงเพราะนัดตรวจห่างไม่เท่ากัน
// ชี้หรือกดลูกศรเพื่อเลือกผลแต่ละครั้ง ตัวเลขใหญ่ด้านบนเปลี่ยนตาม แทนการเปิดกล่องลอย
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { useChartArrival } from "@/components/dashboard/useChartArrival";
import { daysBetween } from "@/lib/date";
import { formatThaiDate } from "@/lib/format";
import { metricScale } from "@/lib/metric-chart";

export type LabTrendPoint = { date: string; value: number; secondary?: number };
export type LabReference = { value: number; label: string; tone: "remission" | "critical" };

type Props = {
  label: string;
  unit: string;
  decimals: number;
  points: LabTrendPoint[];
  references: LabReference[];
  /** ชื่อเส้นเมื่อมีสองเส้น เช่น ตัวบน ตัวล่าง */
  lineNames?: [string, string];
  order: number;
  note?: string;
};

const PRIMARY = "var(--color-primary)";
const SECONDARY = "#2a9d8f";
const REFERENCE_STYLE: Record<LabReference["tone"], { line: string; text: string }> = {
  remission: { line: "border-primary border-dashed", text: "text-primary" },
  critical: { line: "border-risk-critical", text: "text-risk-critical" },
};

function format(value: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

function path(coords: { x: number; y: number }[]): string {
  return coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
}

export default function LabTrendTile({ label, unit, decimals, points, references, lineNames, order, note }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const last = points.length - 1;
  const shown = points[active ?? last];
  const first = points[0];
  const previous = points[last - 1];

  const values = points.flatMap((p) => (p.secondary === undefined ? [p.value] : [p.value, p.secondary]));
  const refValues = references.map((r) => r.value);
  // เส้นอ้างอิงที่ห่างจากข้อมูลมากจะทำให้เส้นข้อมูลแบน จึงรวมเฉพาะเส้นที่อยู่ใกล้ช่วงข้อมูล
  const span = values.length ? Math.max(...values) - Math.min(...values) : 0;
  const nearRefs = values.length ? refValues.filter((v) => v >= Math.min(...values) - span - 1 && v <= Math.max(...values) + span + 1) : [];
  const scale = metricScale([...values, ...nearRefs], decimals);
  const totalDays = first && shown ? daysBetween(first.date, points[last].date) : 0;
  const xOf = (date: string) => (totalDays === 0 ? 50 : (daysBetween(first.date, date) / totalDays) * 100);
  const yOf = (v: number) => (1 - (v - scale.min) / (scale.max - scale.min)) * 100;

  const primary = points.map((p) => ({ x: xOf(p.date), y: yOf(p.value) }));
  const secondary = points.flatMap((p) => (p.secondary === undefined ? [] : [{ x: xOf(p.date), y: yOf(p.secondary) }]));
  const area = primary.length > 1 ? `${path(primary)} L${primary[last].x.toFixed(2)} 100 L${primary[0].x.toFixed(2)} 100 Z` : "";
  const shownRefs = references.filter((r) => r.value >= scale.min && r.value <= scale.max);

  const rootRef = useChartArrival(`${label}|${points.map((p) => `${p.date}:${p.value}:${p.secondary ?? ""}`).join(",")}`, { order });

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    let nearest = 0;
    primary.forEach((c, i) => { if (Math.abs(c.x - x) < Math.abs(primary[nearest].x - x)) nearest = i; });
    setActive(nearest);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return setActive(null);
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActive(Math.min(last, Math.max(0, (active ?? last) + (event.key === "ArrowLeft" ? -1 : 1))));
  };

  const valueText = (p: LabTrendPoint) => (p.secondary === undefined ? format(p.value, decimals) : `${format(p.value, decimals)}/${format(p.secondary, decimals)}`);
  const change = previous && active === null && previous.secondary === undefined ? Math.round((points[last].value - previous.value) * 10 ** decimals) / 10 ** decimals : null;

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col bg-white p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-medium text-slate-700">{label}</h3>
        <span className="text-[12.5px] tabular-nums text-slate-600">{shown ? formatThaiDate(shown.date) : ""}</span>
      </div>

      {shown ? (
        <>
          <p className="mt-0.5 text-[26px] font-semibold leading-tight tabular-nums text-slate-900">
            {valueText(shown)}
            {unit ? <span className={`text-[13px] font-medium text-slate-600 ${unit === "%" ? "" : "ml-1"}`}>{unit}</span> : null}
          </p>
          <p className="mt-0.5 min-h-[18px] text-[12.5px] text-slate-600">
            {active !== null
              ? `ครั้งที่ ${active + 1} จาก ${points.length}`
              : points.length === 1
                ? "ผลครั้งแรก"
                : change !== null
                  ? <>{change === 0 ? "เท่าเดิม" : <span className="font-medium tabular-nums text-slate-800">{change > 0 ? "+" : ""}{format(change, decimals)}</span>} จากครั้งก่อน {formatThaiDate(previous!.date)}</>
                  : `${points.length} ครั้ง`}
          </p>

          <div className="mt-3 pl-9 pr-2">
            <div
              role="img"
              tabIndex={0}
              aria-label={`แนวโน้ม${label} ${points.length} ครั้ง ล่าสุด ${valueText(points[last])} ${unit} กดลูกศรซ้ายขวาเพื่อดูแต่ละครั้ง`}
              onPointerDown={pick}
              onPointerMove={pick}
              onPointerLeave={(e) => { if (e.pointerType === "mouse") setActive(null); }}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              className="relative h-[112px] cursor-crosshair touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
            >
              {scale.ticks.map((t) => (
                <div key={t} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-slate-200" style={{ top: `${yOf(t)}%` }}>
                  <span className="absolute right-full mr-2 -translate-y-1/2 text-[12px] leading-none tabular-nums text-slate-600">{t}</span>
                </div>
              ))}

              {shownRefs.map((r, i) => {
                const y = yOf(r.value);
                return (
                  <div key={r.label} aria-hidden="true" className={`pointer-events-none absolute inset-x-0 border-t ${REFERENCE_STYLE[r.tone].line}`} style={{ top: `${y}%` }}>
                    <span className={`absolute ${i % 2 === 0 ? "right-0" : "left-0"} ${y < 22 ? "top-0.5" : "bottom-0.5"} whitespace-nowrap rounded-sm bg-white/85 px-1 text-[12px] leading-4 ${REFERENCE_STYLE[r.tone].text}`}>{r.label}</span>
                  </div>
                );
              })}

              <svg data-sweep aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <defs>
                  <linearGradient id={`lab-area-${order}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={PRIMARY} stopOpacity="0.16" />
                    <stop offset="1" stopColor={PRIMARY} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {area ? <path d={area} fill={`url(#lab-area-${order})`} /> : null}
                {secondary.length > 1 ? <path d={path(secondary)} fill="none" stroke={SECONDARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
                {primary.length > 1 ? <path d={path(primary)} fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
              </svg>

              {/* จุดทุกครั้งที่ตรวจ เพราะผลตรวจมีไม่กี่ครั้ง ทุกจุดจึงมีความหมาย */}
              {points.map((p, i) => (
                <span key={p.date} aria-hidden="true" className="pointer-events-none">
                  {i === last ? <span data-ripple className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0" style={{ left: `${primary[i].x}%`, top: `${primary[i].y}%` }} /> : null}
                  <span
                    data-arrive={i === last ? "" : undefined}
                    className={`absolute box-content -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary transition-[width,height] duration-100 ${active === i ? "size-3" : "size-2"}`}
                    style={{ left: `${primary[i].x}%`, top: `${primary[i].y}%` }}
                  />
                  {p.secondary !== undefined ? (
                    <span className={`absolute box-content -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${active === i ? "size-3" : "size-2"}`} style={{ left: `${primary[i].x}%`, top: `${yOf(p.secondary)}%`, backgroundColor: SECONDARY }} />
                  ) : null}
                </span>
              ))}

              {active !== null ? (
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-slate-400" style={{ left: `${primary[active].x}%` }} />
              ) : null}
            </div>

            <div aria-hidden="true" className="mt-1.5 flex items-baseline justify-between gap-2 text-[12px] text-slate-600">
              <span className="whitespace-nowrap">{formatThaiDate(first.date)}</span>
              {lineNames ? (
                <span className="flex gap-2 text-slate-700">
                  <span className="inline-flex items-center gap-1"><span className="h-0.5 w-3 rounded-full bg-primary" />{lineNames[0]}</span>
                  <span className="inline-flex items-center gap-1"><span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: SECONDARY }} />{lineNames[1]}</span>
                </span>
              ) : null}
              <span className="whitespace-nowrap">{points.length > 1 ? formatThaiDate(points[last].date) : ""}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 flex h-[150px] items-center justify-center rounded-md bg-slate-50 text-[13px] text-slate-600">ยังไม่มีผลตรวจ</p>
      )}

      {note ? <p className="mt-2 text-[12.5px] leading-snug text-slate-600">{note}</p> : null}
    </div>
  );
}
