"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { RiskRow, RiskRowKey } from "@/lib/dashboard-stats";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import { RISK_COLORS, STALE_OPACITY } from "./RiskSpine";

type Props = {
  rows: RiskRow[];
  active: RiskRowKey | null;
  onSelect: (level: RiskRowKey | null) => void;
  staleOnly: boolean;
  onToggleStale: () => void;
};

const CHIP =
  "patient-chip relative z-[1] flex min-h-11 flex-wrap items-center gap-x-2 rounded-lg border px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 motion-reduce:transition-none";
const CHIP_IDLE = "border-slate-300 text-slate-800 hover:bg-slate-50 active:bg-slate-100 active:duration-0";
/** พื้นสีนี้ใช้ตอนสคริปต์ยังไม่ทำงาน เมื่อพร้อมแล้วแถบไฮไลต์ที่เลื่อนได้จะมาแทน */
const CHIP_ACTIVE = "border-[#115e59] bg-[#115e59] text-white";

function levelName(key: RiskRowKey): string {
  return key === "NONE" ? "ยังไม่มีข้อมูล" : RISK_LEVEL_LABELS[key];
}

/** ตอบสนองเฉพาะเมาส์ บนจอสัมผัสการแตะจะค้างสถานะ hover ไว้ */
function fromMouse(event: PointerEvent, action: () => void) {
  if (event.pointerType === "mouse") action();
}

type SegmentProps = {
  row: RiskRow;
  dimmed: boolean;
  lifted: boolean;
  onHover: (key: RiskRowKey | null) => void;
  onSelect: () => void;
};

/** กดบนแถบได้เป็นทางลัดของเมาส์ ส่วนคีย์บอร์ดและโปรแกรมอ่านจอใช้ปุ่มด้านล่าง ซึ่งบอกข้อมูลครบกว่า */
function Segment({ row, dimmed, lifted, onHover, onSelect }: SegmentProps) {
  const fresh = row.count - row.stale;
  const color = RISK_COLORS[row.key];
  return (
    <span
      data-lifted={lifted ? "" : undefined}
      onPointerEnter={(event) => fromMouse(event, () => onHover(row.key))}
      onPointerLeave={(event) => fromMouse(event, () => onHover(null))}
      onClick={onSelect}
      className={`patient-scale-segment flex min-w-0 cursor-pointer gap-0.5 ${row.count > 0 ? "mr-1.5 last:mr-0" : ""}`}
      style={{ flexGrow: row.count, flexBasis: 0, opacity: dimmed ? 0.3 : 1 }}
    >
      {fresh > 0 ? <span className="block min-w-1 rounded" style={{ flexGrow: fresh, flexBasis: 0, backgroundColor: color }} /> : null}
      {row.stale > 0 ? <span className="block min-w-1 rounded" style={{ flexGrow: row.stale, flexBasis: 0, backgroundColor: color, opacity: STALE_OPACITY }} /> : null}
    </span>
  );
}

type ChipProps = {
  row: RiskRow;
  active: boolean;
  onHover: (key: RiskRowKey | null) => void;
  onSelect: () => void;
};

function LevelChip({ row, active, onHover, onSelect }: ChipProps) {
  const name = levelName(row.key);
  const label = row.awaitingThreshold
    ? `${name}: รอแพทย์กำหนดเกณฑ์`
    : `${name} ${row.count} ราย${row.stale > 0 ? ` ข้อมูลเก่า ${row.stale} ราย` : ""}`;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onSelect}
      onPointerEnter={(event) => fromMouse(event, () => onHover(row.key))}
      onPointerLeave={(event) => fromMouse(event, () => onHover(null))}
      onFocus={() => onHover(row.key)}
      onBlur={() => onHover(null)}
      className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
    >
      <span aria-hidden="true" className={`size-3 shrink-0 rounded-[3px] ${active ? "ring-1 ring-white" : ""}`} style={{ backgroundColor: RISK_COLORS[row.key] }} />
      <span className="min-w-0">{name}</span>
      <span className={`ml-auto text-sm font-semibold tabular-nums ${row.count === 0 && !active ? "text-slate-500" : ""}`}>
        {row.awaitingThreshold ? "-" : row.count}
      </span>
      {row.awaitingThreshold ? <span className={`w-full text-[12.5px] font-normal ${active ? "text-white" : "text-slate-600"}`}>รอแพทย์กำหนดเกณฑ์</span> : null}
    </button>
  );
}

/** ไฮไลต์เลื่อนไปหาปุ่มที่เลือก จึงเห็นว่าตัวกรองย้ายจากไหนไปไหน */
function useSelectionSlider(active: RiskRowKey | null) {
  const gridRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const slider = sliderRef.current;
    if (!grid || !slider) return;

    const place = () => {
      const chip = grid.querySelector<HTMLElement>('.patient-chip[aria-pressed="true"]');
      if (!chip) return;
      slider.style.width = `${chip.offsetWidth}px`;
      slider.style.height = `${chip.offsetHeight}px`;
      slider.style.transform = `translate(${chip.offsetLeft}px, ${chip.offsetTop}px)`;
    };
    place();
    // เปิดใช้เฟรมถัดไป ตำแหน่งแรกจึงไม่เลื่อนจากมุมซ้ายบน
    const frame = requestAnimationFrame(() => grid.setAttribute("data-ready", ""));
    const observer = new ResizeObserver(place);
    observer.observe(grid);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active]);

  return { gridRef, sliderRef };
}

/**
 * ภาพรวมระดับความเสี่ยงและตัวกรองในชิ้นเดียว กดครั้งเดียวกรอง กดซ้ำเพื่อเลิกกรอง
 * ความกว้างเปลี่ยนตามคำค้นและตัวกรองอื่น จึงเห็นสัดส่วนของกลุ่มที่กำลังดูอยู่
 * ใช้ container query เพราะหน้ากว้างต่างกันตามแถบเมนู ไม่ใช่ตามจออย่างเดียว
 */
export default function RiskScale({ rows, active, onSelect, staleOnly, onToggleStale }: Props) {
  const [hovered, setHovered] = useState<RiskRowKey | null>(null);
  const { gridRef, sliderRef } = useSelectionSlider(active);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const staleTotal = rows.reduce((sum, row) => sum + row.stale, 0);
  const emphasis = hovered ?? active;
  const toggle = (key: RiskRowKey) => onSelect(active === key ? null : key);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4">
        <div aria-hidden="true" className={`patient-scale-bar flex h-7 min-w-60 flex-1 rounded ${total === 0 ? "bg-slate-100" : ""}`}>
          {rows.map((row) => (
            <Segment
              key={row.key}
              row={row}
              dimmed={emphasis !== null && emphasis !== row.key}
              lifted={hovered === row.key}
              onHover={setHovered}
              onSelect={() => toggle(row.key)}
            />
          ))}
        </div>
        {staleTotal > 0 || staleOnly ? (
          <button
            type="button"
            aria-pressed={staleOnly}
            onClick={onToggleStale}
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] text-slate-700 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <span aria-hidden="true" className={`size-3 rounded-[3px] ${staleOnly ? "bg-[#115e59]" : "bg-slate-600/30"}`} />
            {staleOnly ? "แสดงเฉพาะข้อมูลเก่า" : "สีจางคือข้อมูลเก่า"}
            <span className="font-semibold tabular-nums text-slate-900 underline underline-offset-2">{staleTotal} ราย</span>
          </button>
        ) : null}
      </div>

      <div
        ref={gridRef}
        role="group"
        aria-label="กรองตามระดับความเสี่ยง"
        onPointerLeave={() => setHovered(null)}
        className="relative grid grid-cols-2 gap-2 @[560px]:grid-cols-4 @[960px]:grid-cols-7"
      >
        <span ref={sliderRef} aria-hidden="true" className="patient-chip-slider absolute left-0 top-0 rounded-lg bg-[#115e59]" />
        <button
          type="button"
          aria-pressed={active === null}
          onClick={() => onSelect(null)}
          className={`${CHIP} col-span-2 @[960px]:col-span-1 ${active === null ? CHIP_ACTIVE : CHIP_IDLE}`}
        >
          <span>ทั้งหมด</span>
          <span className="ml-auto text-sm font-semibold tabular-nums">{total}</span>
        </button>
        {rows.map((row) => (
          <LevelChip key={row.key} row={row} active={active === row.key} onHover={setHovered} onSelect={() => toggle(row.key)} />
        ))}
      </div>
    </div>
  );
}
