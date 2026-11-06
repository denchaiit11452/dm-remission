"use client";

// กราฟย่อยหนึ่งตัวชี้วัด วาดด้วย SVG ที่ยืดตามกล่อง จึงถูกต้องตั้งแต่ก่อน JavaScript ทำงาน
// ตัวอักษรและจุดเป็น HTML ซ้อนด้านบน เพื่อให้ขนาดคงที่ทุกหน้าจอ
import type { KeyboardEvent, PointerEvent } from "react";
import type { MetricDate, MetricRow } from "@/lib/dashboard-stats";
import { formatThaiDate } from "@/lib/format";
import { changeDirection, metricScale, metricValueAt } from "@/lib/metric-chart";
import { useChartArrival } from "./useChartArrival";

const LINE_COLOR = "#115e59";
const SECONDARY_LINE_COLOR = "#2a9d8f";
const REFERENCE_COLOR = "#991b1b";

type Coord = { x: number; y: number };

function polyline(coords: Coord[]): string {
  return coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ");
}

function ChangeArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={`size-3 shrink-0 text-slate-500 ${direction === "down" ? "rotate-180" : ""}`}>
      <path d="M6 10V2.5M2.75 5.5 6 2.25l3.25 3.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LineKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

const DOT = "absolute box-content size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white";

type Props = {
  metric: MetricRow;
  dates: MetricDate[];
  order: number;
  active: number | null;
  onActiveChange: (index: number | null) => void;
  comparisonLabel: string;
  latestCaption: string;
  className: string;
};

export default function MetricTile({ metric, dates, order, active, onActiveChange, comparisonLabel, latestCaption, className }: Props) {
  const lastIndex = dates.length - 1;
  const shownIndex = active ?? lastIndex;
  const shown = metricValueAt(metric, shownIndex);
  const direction = changeDirection(metric.change);

  const seriesValues = [...metric.points, ...(metric.secondaryPoints ?? [])].filter((v): v is number => v !== null);
  const scale = metricScale(seriesValues, metric.decimals, seriesValues.length > 0 ? metric.reference?.value : undefined);
  const xOf = (index: number) => (lastIndex === 0 ? 50 : (index / lastIndex) * 100);
  const yOf = (value: number) => (1 - (value - scale.min) / (scale.max - scale.min)) * 100;
  const coordsOf = (points: (number | null)[]): Coord[] =>
    points.flatMap((value, index) => (value === null ? [] : [{ x: xOf(index), y: yOf(value) }]));

  const primary = coordsOf(metric.points);
  const secondary = metric.secondaryPoints ? coordsOf(metric.secondaryPoints) : [];
  const hasData = primary.length > 0;
  const area = primary.length > 1
    ? `${polyline(primary)} L${primary[primary.length - 1].x.toFixed(2)} 100 L${primary[0].x.toFixed(2)} 100 Z`
    : "";
  const gradientId = `metric-area-${metric.key}`;

  const rootRef = useChartArrival(`${dates[0]?.date}|${dates[lastIndex]?.date}|${seriesValues.join(",")}`, { order });

  const showPointAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = lastIndex === 0 ? 0 : (event.clientX - box.left) / box.width;
    onActiveChange(Math.min(lastIndex, Math.max(0, Math.round(ratio * lastIndex))));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return onActiveChange(null);
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    onActiveChange(Math.min(lastIndex, Math.max(0, shownIndex + delta)));
  };

  const reference = metric.reference && hasData ? metric.reference : null;
  const referenceY = reference ? yOf(reference.value) : 0;
  // วางป้ายเส้นอ้างอิงฝั่งที่เส้นกราฟอยู่ห่างกว่า เพื่อไม่ให้ทับกัน
  const referenceLabelOnLeft = hasData && Math.abs(primary[0].y - referenceY) > Math.abs(primary[primary.length - 1].y - referenceY);
  const activePoints = active === null ? [] : [
    { value: metric.points[active], color: LINE_COLOR },
    { value: metric.secondaryPoints?.[active] ?? null, color: SECONDARY_LINE_COLOR },
  ];

  return (
    <div ref={rootRef} className={`flex min-w-0 flex-col bg-white p-4 md:p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-medium text-slate-700">{metric.label}</h3>
        <span className="text-[12.5px] tabular-nums text-slate-600">{active === null ? latestCaption : formatThaiDate(dates[active].date)}</span>
      </div>

      <p className="mt-0.5 text-[26px] font-semibold leading-tight tabular-nums text-slate-900">
        {shown === null ? (
          <span className="text-[15px] font-medium leading-[32px] text-slate-600">ยังไม่มีข้อมูล</span>
        ) : (
          <>
            {shown.value}
            {shown.unit ? <span className="ml-1 text-[13px] font-medium text-slate-600">{shown.unit}</span> : null}
          </>
        )}
      </p>

      <p className={`mt-0.5 flex min-h-[18px] items-center gap-1 text-[12.5px] leading-snug text-slate-600 ${active === null ? "" : "invisible"}`}>
        {direction ? <ChangeArrow direction={direction} /> : null}
        {metric.change === "-" ? `${comparisonLabel}: ยังเทียบไม่ได้` : <><span className="font-medium tabular-nums text-slate-800">{metric.change}</span> {comparisonLabel}</>}
      </p>

      {hasData ? (
        <div className="mt-3 pl-9 pr-2">
          <div
            role="img"
            aria-label={`แนวโน้ม${metric.label} ${latestCaption} ${metric.latest} กดปุ่มลูกศรซ้ายขวาเพื่อดูแต่ละจุด`}
            tabIndex={0}
            onPointerDown={showPointAt}
            onPointerMove={showPointAt}
            onPointerLeave={(event) => {
              // จอสัมผัส: ยกนิ้วแล้วยังแสดงค่าไว้ แตะที่อื่นจึงหาย
              if (event.pointerType === "mouse") onActiveChange(null);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => onActiveChange(null)}
            className="relative h-[104px] cursor-crosshair touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
          >
            {scale.ticks.map((tick) => (
              <div key={tick} aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-slate-200" style={{ top: `${yOf(tick)}%` }}>
                <span className="absolute right-full mr-2 -translate-y-1/2 text-[12px] leading-none tabular-nums text-slate-600">{tick}</span>
              </div>
            ))}

            {reference ? (
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t" style={{ top: `${referenceY}%`, borderColor: REFERENCE_COLOR }}>
                <span className={`absolute ${referenceLabelOnLeft ? "left-0" : "right-0"} whitespace-nowrap rounded-sm bg-white/85 px-1 text-[12px] leading-[16px] text-[#991b1b] ${referenceY < 20 ? "top-0.5" : "bottom-0.5"}`}>{reference.label}</span>
              </div>
            ) : null}

            <svg data-sweep aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={LINE_COLOR} stopOpacity="0.18" />
                  <stop offset="1" stopColor={LINE_COLOR} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
              {secondary.length > 1 ? <path d={polyline(secondary)} fill="none" stroke={SECONDARY_LINE_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
              {primary.length > 1 ? <path d={polyline(primary)} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
            </svg>

            {[{ line: secondary, color: SECONDARY_LINE_COLOR }, { line: primary, color: LINE_COLOR }].map(({ line, color }) => {
              const end = line[line.length - 1];
              if (!end) return null;
              return (
                <span key={color} aria-hidden="true" className="pointer-events-none">
                  <span data-ripple className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0" style={{ left: `${end.x}%`, top: `${end.y}%`, backgroundColor: color }} />
                  <span data-arrive className={DOT} style={{ left: `${end.x}%`, top: `${end.y}%`, backgroundColor: color }} />
                </span>
              );
            })}

            {active !== null ? (
              <>
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-slate-400 transition-[left] duration-100 ease-out" style={{ left: `${xOf(active)}%` }} />
                {activePoints.map(({ value, color }) =>
                  value === null || value === undefined ? null : (
                    <span key={color} aria-hidden="true" className={`${DOT} pointer-events-none transition-[left,top] duration-100 ease-out`} style={{ left: `${xOf(active)}%`, top: `${yOf(value)}%`, backgroundColor: color }} />
                  ),
                )}
              </>
            ) : null}
          </div>

          <div aria-hidden="true" className="mt-1.5 flex items-baseline justify-between gap-2 text-[12px] text-slate-600">
            <span className="whitespace-nowrap">{dates[0]?.label}</span>
            {metric.secondaryPoints ? (
              <span className="flex gap-2 text-slate-700">
                <LineKey color={LINE_COLOR} label="ตัวบน" />
                <LineKey color={SECONDARY_LINE_COLOR} label="ตัวล่าง" />
              </span>
            ) : null}
            <span className="whitespace-nowrap">{dates[lastIndex]?.label}</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 flex h-[126px] items-center justify-center rounded-md bg-slate-50 text-[13px] text-slate-600">ยังไม่มีผลตรวจในช่วงนี้</p>
      )}

      <p className="mt-2 text-[12.5px] leading-snug text-slate-600">
        {active === null
          ? `มีข้อมูล ${metric.coverage} ราย, ตอนเทียบ ${metric.baselineCoverage} ราย`
          : `มีข้อมูล ${metric.pointCoverage[active] ?? 0} ราย`}
      </p>
    </div>
  );
}
