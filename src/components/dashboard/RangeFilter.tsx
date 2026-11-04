"use client";

// ตัวกรองช่วงเวลาของแนวโน้ม: ค่าอยู่ใน URL รีเฟรชหรือส่งลิงก์ต่อแล้วยังอยู่
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import { buildRangeQuery, RANGE_PRESET_LABELS, RANGE_PRESETS, type DashboardRange, type RangePreset } from "@/lib/dashboard-range";
import { formatThaiDate } from "@/lib/format";
import DateRangePicker from "./DateRangePicker";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

type Props = {
  range: DashboardRange;
  today: string;
  /** วันแรกที่มีข้อมูล (null = ยังไม่มีข้อมูล) */
  earliestDate: string | null;
};

export default function RangeFilter({ range, today, earliestDate }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  /** ช่องวันที่ที่เปิดปฏิทินอยู่ (null = ปิด) ใช้กำหนดตำแหน่งและคืนโฟกัส */
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);

  const navigate = (next: Pick<DashboardRange, "preset" | "from" | "to">) => {
    startTransition(() => router.push(`${pathname}${buildRangeQuery(next)}`, { scroll: false }));
  };

  const onPresetClick = (event: MouseEvent<HTMLAnchorElement>, preset: RangePreset) => {
    event.preventDefault();
    navigate({ preset, from: "", to: "" });
  };

  const isCustom = range.preset === null;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3" aria-busy={pending}>
      {/* หัวข้อบนจอบอกอยู่แล้วว่าเป็นช่วงเวลาของแนวโน้ม ป้ายนี้เหลือไว้ให้โปรแกรมอ่านหน้าจอ */}
      <span id="trend-range-label" className="sr-only">ช่วงเวลาของแนวโน้ม</span>

      <div role="group" aria-labelledby="trend-range-label" className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white md:inline-grid">
        {RANGE_PRESETS.map((preset) => {
          const active = range.preset === preset;
          return (
            <Link
              key={preset}
              href={`${pathname}${buildRangeQuery({ preset, from: "", to: "" })}`}
              aria-current={active ? "true" : undefined}
              scroll={false}
              onClick={(event) => onPresetClick(event, preset)}
              className={`grid min-h-11 place-items-center px-4 text-[13px] -outline-offset-2 focus-visible:outline-2 focus-visible:outline-teal-700 md:min-w-[88px] ${active ? "bg-[#115e59] font-semibold text-white" : "font-medium text-slate-700 hover:bg-slate-50"}`}
            >
              {RANGE_PRESET_LABELS[preset]}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={pickerAnchor !== null}
        onClick={(event) => setPickerAnchor(event.currentTarget)}
        className={`flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-[13px] md:justify-start ${FOCUS} ${isCustom ? "bg-[#115e59] text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
      >
        <span className={isCustom ? "text-teal-50" : "text-slate-600"}>{isCustom ? "ช่วงที่เลือก" : "เลือกวันที่เอง"}</span>
        <span className="font-medium">{formatThaiDate(range.from)} ถึง {formatThaiDate(range.to)}</span>
      </button>

      {/* อยู่ซ้ายของปุ่ม ข้อความโผล่แล้วปุ่มจึงไม่ขยับ */}
      <span role="status" className="text-[13px] text-slate-600 empty:hidden md:order-first">{pending ? "กำลังโหลดข้อมูลช่วงใหม่..." : ""}</span>

      {pickerAnchor ? (
        <DateRangePicker
          anchor={pickerAnchor}
          initial={{ from: range.from, to: range.to }}
          today={today}
          minDate={earliestDate}
          onCancel={() => setPickerAnchor(null)}
          onApply={(from, to) => {
            setPickerAnchor(null);
            navigate({ preset: null, from, to });
          }}
        />
      ) : null}
    </div>
  );
}
