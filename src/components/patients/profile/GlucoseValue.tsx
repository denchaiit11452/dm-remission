import { formatGlucoseValue } from "@/lib/format";
import type { HistoryReading } from "@/lib/history";
import type { RiskLevel } from "@/lib/risk/types";

// สีตามดีไซน์: ค่าปกติเป็นตัวเลขสีเขียว ค่าผิดปกติเป็นป้ายสีพร้อมลูกศร (ไม่ใช้สีอย่างเดียว)
export const TILE_STYLES: Record<RiskLevel, string> = {
  WELL_CONTROLLED: "text-[#166534]",
  UNCONTROLLED: "bg-[#fef3c7] text-[#78350f]",
  WATCH: "bg-[#ffedd5] text-[#7c2d12]",
  HIGH: "bg-[#fee2e2] text-[#7f1d1d]",
  CRITICAL: "bg-[#991b1b] text-white",
};

function Arrow({ direction }: { direction: "LOW" | "HIGH" | null }) {
  if (!direction) return null;
  return (
    <>
      <span aria-hidden="true" className="mr-1 text-[0.7em]">{direction === "HIGH" ? "▲" : "▼"}</span>
      <span className="sr-only">{direction === "HIGH" ? "สูง " : "ต่ำ "}</span>
    </>
  );
}

function valueText(r: HistoryReading): string {
  return formatGlucoseValue(r.valueMgDl, r.meterFlag).text;
}

/** ค่าน้ำตาล 1 ช่อง ใช้ในตาราง (Desktop/Tablet) */
export default function GlucoseValue({ primary, repeats }: { primary: HistoryReading | null; repeats: HistoryReading[] }) {
  if (!primary) return <span aria-label="ไม่ได้บันทึก" className="text-slate-500">—</span>;
  const style = primary.level ? TILE_STYLES[primary.level] : "text-slate-800";
  const filled = primary.level && primary.level !== "WELL_CONTROLLED";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-flex min-w-14 items-center justify-center rounded-lg px-3 py-1.5 text-base font-semibold tabular-nums ${style} ${filled ? "" : "px-0"}`}>
        <Arrow direction={primary.direction} />
        {valueText(primary)}
      </span>
      {repeats.length > 0 ? <span className="text-xs text-slate-700">+ วัดซ้ำ {repeats.map(valueText).join(", ")}</span> : null}
    </div>
  );
}

/** ช่องแบบการ์ดมือถือ: มีป้ายช่วงเวลาและพื้นหลังตามระดับ */
export function GlucoseTile({ label, primary, repeats }: { label: string; primary: HistoryReading | null; repeats: HistoryReading[] }) {
  const style = primary?.level && primary.level !== "WELL_CONTROLLED" ? TILE_STYLES[primary.level] : "bg-slate-50 text-[#166534]";
  const all = primary ? [primary, ...repeats] : [];
  return (
    <div className={`rounded-lg border border-transparent p-3 ${primary ? style : "bg-slate-50 text-slate-500"}`}>
      <p className={`text-xs ${primary?.level === "CRITICAL" ? "text-white/90" : "text-slate-700"}`}>{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {primary ? (
          <>
            <Arrow direction={primary.direction} />
            {all.map(valueText).join(" / ")}
          </>
        ) : (
          <span aria-label="ไม่ได้บันทึก">—</span>
        )}
      </p>
    </div>
  );
}
