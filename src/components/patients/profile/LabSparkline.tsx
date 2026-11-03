import { daysBetween } from "@/lib/date";
import { formatThaiDate } from "@/lib/format";
import { withUnit, type LabPoint } from "@/lib/lab-summary";

// พิกัดภายในกราฟเป็นร้อยละ เพื่อให้เส้นยืดเต็มความกว้างช่องโดยจุดปลายไม่บิดเบี้ยว
const PAD_Y = 16;

type Props = { points: LabPoint[]; label: string; unit: string };

/**
 * กราฟเล็กแสดงรูปทรงของแนวโน้ม แกนนอนตามระยะเวลาจริงเพราะนัดตรวจห่างไม่เท่ากัน
 * สเกลแนวตั้งของแต่ละกราฟเป็นอิสระ จึงมีคำบรรยายบอกค่าเริ่มต้น วันที่ และจำนวนครั้งกำกับเสมอ
 */
export default function LabSparkline({ points, label, unit }: Props) {
  if (points.length < 2) return null;

  const first = points[0];
  const latest = points[points.length - 1];
  const span = daysBetween(first.date, latest.date) || 1;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const range = Math.max(...values) - min;

  const coords = points.map((p) => ({
    ...p,
    x: (daysBetween(first.date, p.date) / span) * 100,
    y: range === 0 ? 50 : 100 - PAD_Y - ((p.value - min) / range) * (100 - PAD_Y * 2),
  }));
  const end = coords[coords.length - 1];

  return (
    <figure className="min-w-0">
      <div className="relative mr-1 h-9">
        <svg
          viewBox="0 0 100 100" preserveAspectRatio="none" role="img" className="absolute inset-0 size-full overflow-visible"
          aria-label={`แนวโน้ม${label} ${points.length} ครั้ง จาก ${withUnit(first.value, unit)} เป็น ${withUnit(latest.value, unit)}`}
        >
          <polyline
            points={coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ")}
            fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          aria-hidden="true"
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-teal-700 box-content"
          style={{ left: `${end.x}%`, top: `${end.y}%` }}
        />
      </div>
      <figcaption className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-700">
        <span className="whitespace-nowrap">{label} เริ่ม {withUnit(first.value, unit)}</span>
        <span className="whitespace-nowrap">{formatThaiDate(first.date)}</span>
        <span className="whitespace-nowrap">{points.length} ครั้ง</span>
      </figcaption>
    </figure>
  );
}
