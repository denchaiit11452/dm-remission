import type { MetricRow } from "@/lib/dashboard-stats";
import Panel from "./Panel";

const TH = "pb-2 text-left text-[12.5px] font-medium text-slate-600";
const TD = "border-t border-slate-200 py-2.5 align-middle";

/** เส้นแนวโน้มเล็ก สเกลของแต่ละแถวเป็นอิสระ จึงมีค่าล่าสุดและค่าเทียบกำกับเสมอ */
function MiniTrend({ points, label }: { points: (number | null)[]; label: string }) {
  const values = points.flatMap((value, index) => (value === null ? [] : [{ value, index }]));
  if (values.length < 2) return <span className="text-[12.5px] text-slate-600">ข้อมูลไม่พอ</span>;

  const numbers = values.map((v) => v.value);
  const min = Math.min(...numbers);
  const range = Math.max(...numbers) - min;
  const lastIndex = points.length - 1;
  const coords = values.map((v) => ({
    x: lastIndex === 0 ? 50 : (v.index / lastIndex) * 100,
    y: range === 0 ? 50 : 86 - ((v.value - min) / range) * 72,
  }));
  const end = coords[coords.length - 1];

  return (
    <span className="relative mr-2 block h-[34px]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`แนวโน้ม${label}`} className="absolute inset-0 size-full overflow-visible">
        <polyline
          points={coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ")}
          fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span aria-hidden="true" className="absolute box-content size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#115e59]" style={{ left: `${end.x}%`, top: `${end.y}%` }} />
    </span>
  );
}

export default function MetricsPanel({ metrics, comparisonLabel, isCustomRange }: { metrics: MetricRow[]; comparisonLabel: string; isCustomRange: boolean }) {
  const trendHeading = isCustomRange ? "แนวโน้มตามช่วงที่เลือก" : "แนวโน้มตามช่วงเวลา";
  const latestHeading = isCustomRange ? "ณ วันสิ้นสุดช่วง" : "ล่าสุด";
  return (
    <Panel title="ตัวชี้วัดเฉลี่ยทั้งโปรแกรม" subtitle={`เฉลี่ยจากค่าล่าสุดของผู้ป่วยแต่ละคน ${comparisonLabel} จำนวนผู้ป่วย ณ สองจุดอาจไม่เท่ากัน`}>
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className={`${TH} md:w-[20%]`}>ตัวชี้วัด</th>
            <th scope="col" className={`${TH} hidden w-[20%] md:table-cell`}>{latestHeading}</th>
            <th scope="col" className={`${TH} hidden w-[18%] md:table-cell`}>{comparisonLabel}</th>
            <th scope="col" className={`${TH} w-[38%] md:w-[28%]`}>{trendHeading}</th>
            <th scope="col" className={`${TH} hidden w-[14%] text-right md:table-cell`}>มีข้อมูล (ราย)</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.key}>
              <th scope="row" className={`${TD} text-left font-medium text-slate-700`}>
                {m.label}
                <span className="mt-0.5 block text-[15px] font-semibold text-slate-900 md:hidden">{m.latest}</span>
                <span className="block text-[12.5px] font-normal text-slate-600 md:hidden">{comparisonLabel} {m.change}</span>
                <span className="block text-[12.5px] font-normal text-slate-600 md:hidden">มีข้อมูล {m.coverage} ราย, ตอนเทียบ {m.baselineCoverage} ราย</span>
              </th>
              <td className={`${TD} hidden font-semibold text-slate-900 md:table-cell`}>{m.latest}</td>
              <td className={`${TD} hidden tabular-nums text-slate-700 md:table-cell`}>{m.change}</td>
              <td className={TD}><MiniTrend points={m.points} label={m.label} /></td>
              <td className={`${TD} hidden text-right tabular-nums text-slate-700 md:table-cell`}>
                {m.coverage}
                <span className="block text-[12px] text-slate-600">ตอนเทียบ {m.baselineCoverage}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
