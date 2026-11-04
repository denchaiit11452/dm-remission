export type Segment = {
  key: string;
  label: string;
  count: number;
  color: string;
  /** สีตัวเลขบนแถบ เลือกตามความสว่างของสีพื้น */
  ink: "light" | "dark";
};

/** ส่วนที่แคบกว่านี้ไม่มีที่พอวางตัวเลข ค่ายังอ่านได้จากรายการใต้แถบ */
const MIN_LABEL_SHARE = 0.15;

export function percentOf(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}

/** แถบสัดส่วนของกลุ่มเดียวกัน ส่วนที่เป็น 0 ไม่วาด */
export default function SegmentBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  const summary = segments.map((s) => `${s.label} ${s.count} ราย`).join(", ");

  if (total === 0) {
    return <div role="img" aria-label={`${label}: ยังไม่มีข้อมูล`} className="h-7 rounded bg-slate-100" />;
  }
  return (
    <div role="img" aria-label={`${label}: ${summary}`} className="flex h-7 gap-0.5">
      {segments.filter((s) => s.count > 0).map((s) => {
        const share = s.count / total;
        return (
          <div
            key={s.key}
            title={`${s.label} ${s.count} ราย (${percentOf(s.count, total).toFixed(1)}%)`}
            className="flex min-w-0.5 items-center overflow-hidden rounded px-2 text-[13px] font-semibold"
            style={{ flexGrow: s.count, flexBasis: 0, backgroundColor: s.color, color: s.ink === "light" ? "#ffffff" : "#0f172a" }}
          >
            {share >= MIN_LABEL_SHARE ? `${Math.round(share * 100)}%` : null}
          </div>
        );
      })}
    </div>
  );
}

export function Swatch({ color }: { color: string }) {
  return <span aria-hidden="true" className="size-3 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />;
}
