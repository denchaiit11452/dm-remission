"use client";

// กราฟย่อยของตัวชี้วัดเฉลี่ย: หน่วยต่างกันจึงแยกแกนคนละกราฟ แต่ใช้วันที่ร่วมกัน
// ชี้ที่กราฟใดก็ตาม ทุกกราฟจะแสดงค่าของวันเดียวกัน
import { useState } from "react";
import type { MetricDate, MetricRow } from "@/lib/dashboard-stats";
import { formatThaiDate } from "@/lib/format";
import { metricValueAt } from "@/lib/metric-chart";
import MetricTile from "./MetricTile";

function formatValue(metric: MetricRow, index: number): string {
  const shown = metricValueAt(metric, index);
  return shown === null ? "ยังไม่มีข้อมูล" : `${shown.value} ${shown.unit}`.trim();
}

/** ช่องกว้าง: HbA1c และ FBS เป็นค่าหลักของโปรแกรมจึงอยู่แถวบนและกว้างกว่า */
const TILE_LAYOUT = [
  "@3xl:col-span-3",
  "@3xl:col-span-3",
  "@3xl:col-span-2",
  "@3xl:col-span-2",
  "@xl:col-span-2 @3xl:col-span-2",
];

type Props = { metrics: MetricRow[]; dates: MetricDate[]; comparisonLabel: string; latestCaption: string };

export default function MetricCharts({ metrics, dates, comparisonLabel, latestCaption }: Props) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      <div className="@container -mx-4 -mb-4 overflow-hidden rounded-b-[9px] border-t border-slate-200 md:-mx-5 md:-mb-5">
        <div className="grid gap-px bg-slate-200 @xl:grid-cols-2 @3xl:grid-cols-6">
          {metrics.map((metric, index) => (
            <MetricTile
              key={metric.key}
              metric={metric}
              dates={dates}
              order={index}
              active={active}
              onActiveChange={setActive}
              comparisonLabel={comparisonLabel}
              latestCaption={latestCaption}
              className={TILE_LAYOUT[index] ?? ""}
            />
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {active === null ? "" : `${formatThaiDate(dates[active].date)} ${metrics.map((m) => `${m.label} ${formatValue(m, active)}`).join(" ")}`}
      </p>

      <div className="sr-only">
        <table>
          <caption>ค่าเฉลี่ยตัวชี้วัดตามวันที่</caption>
          <thead>
            <tr>
              <th scope="col">วันที่</th>
              {metrics.map((m) => <th key={m.key} scope="col">{m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {dates.map((d, index) => (
              <tr key={d.date}>
                <th scope="row">{formatThaiDate(d.date)}</th>
                {metrics.map((m) => <td key={m.key}>{formatValue(m, index)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
