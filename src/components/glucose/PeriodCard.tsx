"use client";

import { useId, useState } from "react";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import { formatTimeInput, type EntryCheck, type EntryMode, type FormEntry } from "@/lib/glucose-form";
import { TILE_STYLES } from "@/components/patients/profile/GlucoseValue";

type Props = {
  entry: FormEntry;
  check: EntryCheck;
  title: string;
  isRepeat: boolean;
  /** บันทึกแล้ว: ล็อกช่องกรอกและแสดงเครื่องหมาย "บันทึกแล้ว" */
  saved: boolean;
  disabled: boolean;
  serverError?: string;
  onChange: (patch: Partial<FormEntry>) => void;
  onRemove?: () => void;
};

const MODES: { mode: EntryMode; label: string }[] = [
  { mode: "VALUE", label: "ค่า" },
  { mode: "LO", label: "LO" },
  { mode: "HI", label: "HI" },
];

const FIELD = "min-h-11 w-full rounded-[10px] border bg-white px-3 text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:bg-slate-50 disabled:text-slate-700";

function LevelChip({ check }: { check: EntryCheck }) {
  const a = check.assessment;
  if (!a) return null;
  const filled = a.level !== "WELL_CONTROLLED";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-medium ${filled ? TILE_STYLES[a.level] : "bg-[#dcfce7] text-[#14532d]"}`}>
      {a.direction ? <span aria-hidden="true" className="text-[0.7em]">{a.direction === "HIGH" ? "▲" : "▼"}</span> : null}
      {a.direction ? <span className="sr-only">{a.direction === "HIGH" ? "สูง " : "ต่ำ "}</span> : null}
      {RISK_LEVEL_LABELS[a.level]}
    </span>
  );
}

function SavedMark() {
  return (
    <span className="gl-saved-chip inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-green-800">
      <svg className="gl-saved-check size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 8.5 6.5 12 13 4.5" pathLength={1} />
      </svg>
      บันทึกแล้ว
    </span>
  );
}

export default function PeriodCard({ entry, check, title, isRepeat, saved, disabled, serverError, onChange, onRemove }: Props) {
  const id = useId();
  // แสดงข้อความเวลาผิดรูปแบบเมื่อออกจากช่องแล้วเท่านั้น (ไม่ฟ้องระหว่างที่ยังพิมพ์ไม่ครบ)
  const [timeTouched, setTimeTouched] = useState(false);
  const locked = saved || disabled;
  const critical = check.assessment?.level === "CRITICAL";
  const error = check.error ?? serverError ?? null;
  const timeError = timeTouched ? check.timeError : null;
  const border = critical ? "border-2 border-red-300" : "border border-slate-200";

  return (
    <div className={`rounded-xl bg-white p-4 ${border}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-slate-900">
          {title}
          {isRepeat ? <span className="ml-1 text-sm font-normal text-slate-700">(วัดซ้ำ)</span> : null}
        </h3>
        <div className="flex items-center gap-2">
          {saved && check.filled ? <SavedMark /> : null}
          {check.filled && !error ? <LevelChip check={check} /> : <span className="text-sm text-slate-600">{check.filled ? "" : "ยังไม่กรอก"}</span>}
          {isRepeat && onRemove && !locked ? (
            <button type="button" onClick={onRemove} className="min-h-11 px-2 text-sm text-slate-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-teal-700">
              ลบ
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <div className="relative">
          <label htmlFor={`${id}-v`} className="sr-only">ค่า DTX {title}{isRepeat ? " วัดซ้ำ" : ""}</label>
          <input
            id={`${id}-v`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={entry.mode === "VALUE" ? entry.value : entry.mode}
            disabled={locked || entry.mode !== "VALUE"}
            placeholder="กรอกค่า DTX"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-e` : undefined}
            onChange={(ev) => onChange({ value: ev.target.value })}
            className={`${FIELD} pr-16 text-lg font-semibold ${error ? "border-red-500" : "border-slate-300"}`}
          />
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">mg/dL</span>
        </div>
        {error ? <p id={`${id}-e`} className="text-sm text-red-800">{error}</p> : null}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label htmlFor={`${id}-t`} className="sr-only">เวลาที่วัด (ไม่บังคับ)</label>
            <input
              id={`${id}-t`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={5}
              value={entry.time}
              disabled={locked}
              placeholder="เวลา เช่น 0730"
              aria-invalid={timeError ? true : undefined}
              aria-describedby={`${id}-th`}
              onBlur={() => setTimeTouched(true)}
              onChange={(ev) => onChange({ time: formatTimeInput(ev.target.value) })}
              className={`${FIELD} ${timeError ? "border-red-500" : "border-slate-300"}`}
            />
          </div>
          <span id={`${id}-th`} className="sr-only">พิมพ์ตัวเลข 4 หลัก เช่น 0730 ระบบใส่เครื่องหมายทวิภาคให้เอง</span>
          <div role="radiogroup" aria-label="ชนิดค่า" className="inline-flex overflow-hidden rounded-[10px] border border-slate-300 bg-white">
            {MODES.map((m) => {
              const active = entry.mode === m.mode;
              return (
                <button
                  key={m.mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={locked}
                  onClick={() => onChange({ mode: m.mode })}
                  className={`min-h-11 min-w-11 px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700 disabled:cursor-not-allowed ${active ? "bg-teal-100 font-semibold text-teal-900" : "text-slate-800 hover:bg-slate-50"}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        {timeError ? <p className="text-sm text-red-800">{timeError}</p> : null}
      </div>
    </div>
  );
}
