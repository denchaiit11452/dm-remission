import type { ReactNode } from "react";
import type { RiskRow, RiskRowKey } from "@/lib/dashboard-stats";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import { RISK_COLORS, STALE_OPACITY } from "./RiskSpine";

type Props = {
  rows: RiskRow[];
  active: RiskRowKey | null;
  onSelect: (level: RiskRowKey | null) => void;
  /** อยู่ท้ายแถวปุ่ม เมื่อปรากฏหรือหายไปจึงไม่ดันรายการผู้ป่วย */
  action?: ReactNode;
};

const CHIP =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none";
const CHIP_IDLE = "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100 active:duration-0";
const CHIP_ACTIVE = "border-[#115e59] bg-[#115e59] text-white";

function levelName(key: RiskRowKey): string {
  return key === "NONE" ? "ยังไม่มีข้อมูล" : RISK_LEVEL_LABELS[key];
}

/** ส่วนสีจางคือผู้ป่วยที่ใช้ข้อมูลเก่า ไม่แสดงตัวเลขในแถบ เพราะปุ่มข้างล่างบอกจำนวนครบแล้ว */
function Segment({ row, dimmed }: { row: RiskRow; dimmed: boolean }) {
  const fresh = row.count - row.stale;
  const color = RISK_COLORS[row.key];
  return (
    <span
      className={`patient-scale-segment flex min-w-0 gap-0.5 overflow-hidden ${row.count > 0 ? "mr-0.5 last:mr-0" : ""}`}
      style={{ flexGrow: row.count, flexBasis: 0, opacity: dimmed ? 0.25 : 1 }}
    >
      {fresh > 0 ? <span className="block min-w-1 rounded-[4px]" style={{ flexGrow: fresh, flexBasis: 0, backgroundColor: color }} /> : null}
      {row.stale > 0 ? <span className="block min-w-1 rounded-[4px]" style={{ flexGrow: row.stale, flexBasis: 0, backgroundColor: color, opacity: STALE_OPACITY }} /> : null}
    </span>
  );
}

function LevelChip({ row, active, onSelect }: { row: RiskRow; active: boolean; onSelect: () => void }) {
  const name = levelName(row.key);
  const label = row.awaitingThreshold
    ? `${name}: รอแพทย์กำหนดเกณฑ์`
    : `${name} ${row.count} ราย${row.stale > 0 ? ` ข้อมูลเก่า ${row.stale} ราย` : ""}`;
  return (
    <button type="button" aria-pressed={active} aria-label={label} onClick={onSelect} className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}>
      <span
        aria-hidden="true"
        className={`size-3 shrink-0 rounded-[3px] ${active ? "ring-1 ring-white" : ""}`}
        style={{ backgroundColor: RISK_COLORS[row.key] }}
      />
      <span>{name}</span>
      {row.awaitingThreshold ? (
        <span className={`text-[12.5px] ${active ? "text-white" : "text-slate-600"}`}>รอแพทย์กำหนดเกณฑ์</span>
      ) : (
        <span className={`font-semibold tabular-nums ${row.count === 0 && !active ? "text-slate-500" : ""}`}>{row.count}</span>
      )}
    </button>
  );
}

/**
 * ภาพรวมระดับความเสี่ยงและตัวกรองในชิ้นเดียว กดครั้งเดียวกรอง กดซ้ำเพื่อเลิกกรอง
 * ความกว้างเปลี่ยนตามคำค้นและตัวกรองอื่น จึงเห็นสัดส่วนของกลุ่มที่กำลังดูอยู่
 */
export default function RiskScale({ rows, active, onSelect, action }: Props) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 md:p-4">
      <div aria-hidden="true" className="patient-scale-bar flex h-7 overflow-hidden rounded-[4px] bg-slate-100">
        {rows.map((row) => <Segment key={row.key} row={row} dimmed={active !== null && active !== row.key} />)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="กรองตามระดับความเสี่ยง" className="contents">
          <button type="button" aria-pressed={active === null} onClick={() => onSelect(null)} className={`${CHIP} ${active === null ? CHIP_ACTIVE : CHIP_IDLE}`}>
            <span>ทั้งหมด</span>
            <span className="font-semibold tabular-nums">{total}</span>
          </button>
          {rows.map((row) => (
            <LevelChip key={row.key} row={row} active={active === row.key} onSelect={() => onSelect(active === row.key ? null : row.key)} />
          ))}
        </div>
        {action}
      </div>
    </div>
  );
}
