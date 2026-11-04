"use client";

// กราฟเส้นแนวโน้มภาวะสงบ: วัดความกว้างจริงเพื่อให้ตัวอักษรคงขนาดทุกหน้าจอ
// ชี้หรือใช้ปุ่มลูกศรเพื่อดูค่าแต่ละจุด และมีตารางสำหรับโปรแกรมอ่านหน้าจอ
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatThaiDate } from "@/lib/format";
import type { TrendPoint } from "@/lib/dashboard-stats";

const HEIGHT = 230;
const MARGIN = { top: 8, right: 44, bottom: 26, left: 30 };
const MIN_LABEL_GAP = 64;
const MIN_END_LABEL_GAP = 16;
const REMISSION_COLOR = "#115e59";
const LOST_COLOR = "#ea580c";

/** ค่าสูงสุดของแกนตั้งแบบตัวเลขกลม 5 ช่อง และเป็นจำนวนเต็มเพราะนับเป็นคน */
export function niceAxisMax(max: number): { max: number; step: number } {
  if (max <= 5) return { max: 5, step: 1 };
  const rawStep = max / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? 10 * magnitude;
  return { max: step * Math.ceil(max / step), step };
}

function pathOf(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

/** เลือกป้ายแกนนอนจากจุดท้ายย้อนกลับ เพื่อให้จุดล่าสุดมีป้ายเสมอและไม่ทับกัน */
function labelIndexes(count: number, plotWidth: number): Set<number> {
  const maxLabels = Math.max(2, Math.floor(plotWidth / MIN_LABEL_GAP));
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const indexes = new Set<number>();
  for (let i = count - 1; i >= 0; i -= step) indexes.add(i);
  return indexes;
}

export default function RemissionTrendChart({ points }: { points: TrendPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(760);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(40, width - MARGIN.left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const axis = niceAxisMax(Math.max(...points.map((p) => Math.max(p.remission, p.lost)), 0));
  const xOf = (index: number) => MARGIN.left + (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1));
  const yOf = (value: number) => MARGIN.top + plotHeight * (1 - value / axis.max);

  const remissionLine = points.map((p, i) => ({ x: xOf(i), y: yOf(p.remission) }));
  const lostLine = points.map((p, i) => ({ x: xOf(i), y: yOf(p.lost) }));
  const baseline = yOf(0);
  const area = `${pathOf(remissionLine)} L${xOf(points.length - 1).toFixed(1)} ${baseline} L${xOf(0).toFixed(1)} ${baseline} Z`;
  const ticks = Array.from({ length: axis.max / axis.step + 1 }, (_, i) => i * axis.step);
  const labels = labelIndexes(points.length, plotWidth);
  const last = points[points.length - 1];
  // ค่าปลายสองเส้นใกล้กันต้องแยกตัวเลขออก ไม่ให้ทับกันจนอ่านไม่ได้
  const endGap = Math.abs(yOf(last.remission) - yOf(last.lost));
  const endShift = endGap < MIN_END_LABEL_GAP ? (MIN_END_LABEL_GAP - endGap) / 2 : 0;

  const showPointAt = (event: PointerEvent<SVGSVGElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const ratio = points.length === 1 ? 0 : (event.clientX - left - MARGIN.left) / plotWidth;
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    setActive((current) => Math.min(points.length - 1, Math.max(0, (current ?? points.length - 1) + delta)));
  };

  const shown = active === null ? null : points[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-700">
        <LegendKey color={REMISSION_COLOR} label="เข้าเกณฑ์ภาวะสงบ" />
        <LegendKey color={LOST_COLOR} label="หลุดจากภาวะสงบ" />
      </div>

      <div ref={containerRef} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`แนวโน้มภาวะสงบ ล่าสุดเข้าเกณฑ์ ${last.remission} ราย หลุด ${last.lost} ราย กดปุ่มลูกศรซ้ายขวาเพื่อดูแต่ละจุด`}
          tabIndex={0}
          onPointerDown={showPointAt}
          onPointerMove={showPointAt}
          onPointerLeave={(event) => {
            // จอสัมผัส: ยกนิ้วแล้วยังแสดงค่าไว้ แตะที่อื่นจึงหาย
            if (event.pointerType === "mouse") setActive(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="block max-w-full touch-pan-y rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={yOf(tick)} y2={yOf(tick)} stroke="#e2e8f0" />
              <text x={0} y={yOf(tick) + 4} fontSize={12} fill="#475569" style={{ fontVariantNumeric: "tabular-nums" }}>{tick}</text>
            </g>
          ))}
          {points.map((point, index) => labels.has(index) ? (
            <text
              key={point.date}
              x={xOf(index)}
              y={HEIGHT - 6}
              fontSize={12}
              fill="#475569"
              textAnchor={index === points.length - 1 && points.length > 1 ? "end" : index === 0 ? "start" : "middle"}
            >
              {point.label}
            </text>
          ) : null)}

          <path d={area} fill={REMISSION_COLOR} fillOpacity={0.1} />
          <path d={pathOf(lostLine)} fill="none" stroke={LOST_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathOf(remissionLine)} fill="none" stroke={REMISSION_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {active !== null ? <line x1={xOf(active)} x2={xOf(active)} y1={MARGIN.top} y2={baseline} stroke="#94a3b8" /> : null}

          {[{ value: last.lost, color: LOST_COLOR, line: lostLine, shift: endShift }, { value: last.remission, color: REMISSION_COLOR, line: remissionLine, shift: -endShift }].map(({ value, color, line, shift }) => {
            const end = line[line.length - 1];
            return (
              <g key={color}>
                <circle cx={end.x} cy={end.y} r={4} fill={color} stroke="#ffffff" strokeWidth={2} />
                <text x={end.x + 10} y={end.y + 5 + shift} fontSize={14} fontWeight={600} fill="#0f172a">{value}</text>
              </g>
            );
          })}

          {active !== null ? (
            <>
              <circle cx={xOf(active)} cy={yOf(points[active].lost)} r={4} fill={LOST_COLOR} stroke="#ffffff" strokeWidth={2} />
              <circle cx={xOf(active)} cy={yOf(points[active].remission)} r={4} fill={REMISSION_COLOR} stroke="#ffffff" strokeWidth={2} />
            </>
          ) : null}
        </svg>

        {shown !== null && active !== null ? (
          <div
            aria-live="polite"
            className="pointer-events-none absolute top-2 z-10 w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
            style={{ left: Math.max(0, Math.min(width - 176, xOf(active) + (xOf(active) > width / 2 ? -188 : 12))) }}
          >
            <p className="font-semibold text-slate-900">{formatThaiDate(shown.date)}</p>
            <TooltipRow color={REMISSION_COLOR} label="เข้าเกณฑ์" value={shown.remission} />
            <TooltipRow color={LOST_COLOR} label="หลุด" value={shown.lost} />
          </div>
        ) : null}
      </div>

      <div className="sr-only">
      <table>
        <caption>จำนวนผู้ป่วยตามวันที่</caption>
        <thead>
          <tr><th scope="col">วันที่</th><th scope="col">เข้าเกณฑ์ภาวะสงบ</th><th scope="col">หลุดจากภาวะสงบ</th></tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}><th scope="row">{formatThaiDate(p.date)}</th><td>{p.remission}</td><td>{p.lost}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="h-0.5 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-slate-700">
      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
      <span className="ml-auto font-semibold text-slate-900">{value} ราย</span>
    </p>
  );
}
