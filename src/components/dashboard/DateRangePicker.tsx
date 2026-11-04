"use client";

// ปฏิทินเลือกช่วงวันที่: จอกว้างเป็นกล่องใต้ช่องวันที่ แสดง 2 เดือน มือถือเป็นแผ่นล่าง แสดง 1 เดือน
// ใช้ <dialog> ของเบราว์เซอร์: โฟกัสไม่หลุดออกนอกกล่อง Esc ปิดได้ และโฟกัสกลับช่องวันที่เมื่อปิด
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/shell/icons";
import { addDays } from "@/lib/date";
import {
  addMonths, inclusiveDays, monthGrid, monthTitle, nextDraft, startOfMonth, THAI_MONTHS_SHORT, THAI_WEEKDAYS_SHORT, type RangeDraft,
} from "@/lib/dashboard-range";
import { formatThaiDate } from "@/lib/format";

const WIDE_QUERY = "(min-width: 768px)";
const GAP_BELOW_FIELD = 8;
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700";

type Props = {
  anchor: HTMLElement | null;
  initial: { from: string; to: string };
  today: string;
  minDate: string | null;
  onCancel: () => void;
  onApply: (from: string, to: string) => void;
};

function Chevron({ direction, className = "" }: { direction: "left" | "right" | "up" | "down"; className?: string }) {
  const path = { left: "m12.5 4-6 6 6 6", right: "m7.5 4 6 6-6 6", up: "m5 12.5 5-5 5 5", down: "m5 7.5 5 5 5-5" }[direction];
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function NavButton({ direction, label, disabled, onClick }: { direction: "left" | "right"; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-11 shrink-0 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-transparent ${FOCUS}`}
    >
      <Chevron direction={direction} />
    </button>
  );
}

export default function DateRangePicker({ anchor, initial, today, minDate, onCancel, onApply }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  const [draft, setDraft] = useState<RangeDraft>({ from: initial.from, to: initial.to });
  const toMonth = startOfMonth(initial.to);
  const [viewMonth, setViewMonth] = useState(isWide ? addMonths(toMonth, -1) : toMonth);
  const [mode, setMode] = useState<"days" | "months">("days");
  const [focusKey, setFocusKey] = useState(initial.to);
  const shouldMoveFocus = useRef(false);

  const todayMonth = startOfMonth(today);
  const minKey = minDate !== null && minDate < initial.from ? minDate : initial.from;
  const minMonth = startOfMonth(minKey);
  const months = isWide ? [viewMonth, addMonths(viewMonth, 1)] : [viewMonth];
  const lastVisibleMonth = months[months.length - 1];
  const viewYear = Number(viewMonth.slice(0, 4));
  const isDisabled = (key: string) => key > today || key < minKey;
  const clampMonth = (month: string) => (month > todayMonth ? todayMonth : month < minMonth ? minMonth : month);
  // ปฏิทินมีจุดหยุดของปุ่ม Tab จุดเดียว ถ้าวันที่โฟกัสไม่อยู่ในเดือนที่แสดง ใช้วันแรกที่เลือกได้แทน
  const rovingKey = months.includes(startOfMonth(focusKey))
    ? focusKey
    : months.flatMap((month) => monthGrid(month).flat()).find((key): key is string => key !== null && !isDisabled(key)) ?? focusKey;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // คำนวณตำแหน่งหลังเปิด เพราะก่อนเปิดกล่องยังไม่มีขนาดจริง
    if (isWide && anchor) {
      const rect = anchor.getBoundingClientRect();
      const left = Math.max(16, Math.min(rect.left, document.documentElement.clientWidth - dialog.offsetWidth - 16));
      dialog.style.left = `${left + window.scrollX}px`;
      dialog.style.top = `${rect.bottom + window.scrollY + GAP_BELOW_FIELD}px`;
    }
    dialog.querySelector<HTMLButtonElement>(`[data-day="${initial.to}"]`)?.focus();
    // ต้องปิดกล่องก่อน เพราะระหว่างเปิดอยู่ส่วนอื่นของหน้ารับโฟกัสไม่ได้
    return () => {
      dialog.close();
      anchor?.focus();
    };
  }, [anchor, initial.to, isWide]);

  useEffect(() => {
    if (!shouldMoveFocus.current) return;
    shouldMoveFocus.current = false;
    dialogRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusKey}"]`)?.focus();
  }, [focusKey, viewMonth]);

  const moveFocus = (key: string) => {
    if (isDisabled(key)) return;
    shouldMoveFocus.current = true;
    setFocusKey(key);
    const month = startOfMonth(key);
    if (month < viewMonth) setViewMonth(month);
    else if (month > lastVisibleMonth) setViewMonth(isWide ? addMonths(month, -1) : month);
  };

  const onDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const step = steps[event.key];
    if (step === undefined) return;
    event.preventDefault();
    moveFocus(addDays(key, step));
  };

  const pickDay = (key: string) => {
    setDraft((current) => nextDraft(current, key));
    setFocusKey(key);
  };

  const pickMonth = (monthKey: string) => {
    // จอกว้างให้เดือนที่เลือกอยู่ซ้าย ถ้าเดือนถัดไปเลยเดือนปัจจุบันให้เลื่อนกลับ 1 เดือน
    setViewMonth(isWide && monthKey >= todayMonth ? addMonths(monthKey, -1) : monthKey);
    setMode("days");
  };

  const complete = draft.from !== null && draft.to !== null;
  const dayCount = complete && draft.from && draft.to ? inclusiveDays(draft.from, draft.to) : null;
  const summary = complete ? `${formatThaiDate(draft.from)} ถึง ${formatThaiDate(draft.to)}` : `เริ่ม ${formatThaiDate(draft.from)}`;
  const summaryNote = dayCount !== null ? `รวม ${dayCount} วัน` : "เลือกวันสิ้นสุด";

  return (
    <dialog
      ref={dialogRef}
      aria-label="เลือกช่วงวันที่"
      onCancel={onCancel}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel(); // กดนอกกล่อง
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-0 bg-white p-0 text-slate-900 backdrop:bg-slate-950/50 md:absolute md:inset-auto md:w-[682px] md:rounded-xl md:border md:border-slate-200 md:shadow-[0_8px_24px_rgba(15,23,42,0.16)] md:backdrop:bg-transparent"
    >
      <div className="flex flex-col gap-3 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 md:pb-4 md:pt-3.5">
        <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-sm bg-slate-300 md:hidden" />
        <div className="flex items-center justify-between md:hidden">
          <h2 className="text-lg font-semibold">เลือกช่วงวันที่</h2>
          <button type="button" aria-label="ปิด" onClick={onCancel} className={`grid size-11 place-items-center rounded-lg text-slate-700 ${FOCUS}`}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-2 md:hidden">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[12.5px] text-slate-600">วันเริ่มต้น</dt>
            <dd className="text-[15px] font-semibold">{formatThaiDate(draft.from)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[12.5px] text-slate-600">วันสิ้นสุด</dt>
            <dd className="text-[15px] font-semibold">{draft.to ? formatThaiDate(draft.to) : "ยังไม่ได้เลือก"}</dd>
          </div>
        </dl>

        {mode === "months" ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <NavButton direction="left" label="ปีก่อนหน้า" disabled={viewYear <= Number(minMonth.slice(0, 4))} onClick={() => setViewMonth(clampMonth(addMonths(viewMonth, -12)))} />
              <button type="button" onClick={() => pickMonth(viewMonth)} aria-label="กลับไปปฏิทิน" className={`mx-auto flex min-h-11 items-center gap-1 rounded-lg px-3 text-[15px] font-semibold hover:bg-slate-100 ${FOCUS}`}>
                {viewYear + 543}
                <Chevron direction="up" className="text-slate-600" />
              </button>
              <NavButton direction="right" label="ปีถัดไป" disabled={viewYear >= Number(today.slice(0, 4))} onClick={() => setViewMonth(clampMonth(addMonths(viewMonth, 12)))} />
            </div>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
              {THAI_MONTHS_SHORT.map((name, index) => {
                const monthKey = `${viewYear}-${String(index + 1).padStart(2, "0")}-01`;
                const disabled = monthKey > todayMonth || monthKey < minMonth;
                const current = monthKey === viewMonth;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={disabled}
                    aria-current={current ? "true" : undefined}
                    onClick={() => pickMonth(monthKey)}
                    className={`min-h-11 rounded-lg text-sm ${FOCUS} ${current ? "bg-[#115e59] font-semibold text-white" : disabled ? "text-slate-400" : "text-slate-900 hover:bg-slate-100"}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {months.map((monthKey, index) => {
              const showPrev = index === 0;
              const showNext = index === months.length - 1;
              return (
                <div key={monthKey} className="min-w-0">
                  <div className="flex items-center">
                    {showPrev ? (
                      <NavButton direction="left" label="เดือนก่อนหน้า" disabled={viewMonth <= minMonth} onClick={() => setViewMonth(addMonths(viewMonth, -1))} />
                    ) : <span className="size-11 shrink-0" />}
                    <button type="button" onClick={() => setMode("months")} aria-label={`${monthTitle(monthKey)} เปิดตัวเลือกเดือนและปี`} className={`mx-auto flex min-h-11 items-center gap-1 rounded-lg px-2 text-[15px] font-semibold hover:bg-slate-100 ${FOCUS}`}>
                      {monthTitle(monthKey)}
                      <Chevron direction="down" className="text-slate-600" />
                    </button>
                    {showNext ? (
                      <NavButton direction="right" label="เดือนถัดไป" disabled={lastVisibleMonth >= todayMonth} onClick={() => setViewMonth(addMonths(viewMonth, 1))} />
                    ) : <span className="size-11 shrink-0" />}
                  </div>
                  <div className="mt-1 grid grid-cols-7">
                    {THAI_WEEKDAYS_SHORT.map((day, dayIndex) => (
                      <span key={dayIndex} aria-hidden="true" className="grid h-7 place-items-center text-[12.5px] font-medium text-slate-600">{day}</span>
                    ))}
                    {monthGrid(monthKey).flat().map((key, cellIndex) => key === null ? (
                      <span key={`empty-${cellIndex}`} className="h-11" />
                    ) : (
                      <DayCell
                        key={key}
                        dateKey={key}
                        draft={draft}
                        today={today}
                        disabled={isDisabled(key)}
                        focusable={key === rovingKey}
                        onPick={pickDay}
                        onKeyDown={onDayKeyDown}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2.5 border-slate-200 md:flex-row md:items-center md:border-t md:pt-3">
          <div className="hidden min-w-0 flex-1 md:block" aria-live="polite">
            <p className="text-sm font-semibold">{summary}</p>
            <p className="text-[12.5px] text-slate-600">{summaryNote}</p>
          </div>
          <div className="flex flex-col gap-2.5 md:flex-row-reverse">
            <button
              type="button"
              disabled={!complete}
              onClick={() => {
                if (draft.from && draft.to) onApply(draft.from, draft.to);
              }}
              className={`min-h-12 rounded-lg px-5 text-sm font-semibold md:min-h-11 ${FOCUS} ${complete ? "bg-[#115e59] text-white hover:bg-[#0f4f4b]" : "bg-slate-200 text-slate-600"}`}
            >
              ใช้ช่วงนี้{dayCount !== null ? <span className="md:hidden"> ({dayCount} วัน)</span> : null}
            </button>
            <button type="button" onClick={onCancel} className={`min-h-12 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 md:min-h-11 ${FOCUS}`}>
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

type DayCellProps = {
  dateKey: string;
  draft: RangeDraft;
  today: string;
  disabled: boolean;
  focusable: boolean;
  onPick: (key: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, key: string) => void;
};

function DayCell({ dateKey, draft, today, disabled, focusable, onPick, onKeyDown }: DayCellProps) {
  const isStart = draft.from === dateKey;
  const isEnd = draft.to === dateKey;
  const inRange = draft.from !== null && draft.to !== null && dateKey > draft.from && dateKey < draft.to;
  const isToday = dateKey === today;
  const endpoint = isStart || isEnd;

  let shape = "";
  if (isStart && (isEnd || draft.to === null)) shape = "rounded-lg";
  else if (isStart) shape = "rounded-l-lg";
  else if (isEnd) shape = "rounded-r-lg";
  else if (isToday) shape = "rounded-lg";

  const state = endpoint
    ? "bg-[#115e59] font-semibold text-white"
    : inRange
      ? "bg-[#d9ebe8] text-slate-900"
      : disabled
        ? "text-slate-400"
        : "text-slate-900 hover:bg-slate-100";

  const labelParts = [formatThaiDate(dateKey)];
  if (isStart) labelParts.push("วันเริ่มต้น");
  if (isEnd) labelParts.push("วันสิ้นสุด");
  if (isToday) labelParts.push("วันนี้");

  return (
    <button
      type="button"
      data-day={dateKey}
      disabled={disabled}
      tabIndex={focusable ? 0 : -1}
      aria-label={labelParts.join(" ")}
      aria-pressed={endpoint || inRange}
      onClick={() => onPick(dateKey)}
      onKeyDown={(event) => onKeyDown(event, dateKey)}
      className={`h-11 min-w-0 text-sm tabular-nums -outline-offset-2 focus-visible:outline-2 focus-visible:outline-teal-700 ${shape} ${state} ${isToday && !endpoint ? "font-semibold ring-1 ring-inset ring-[#115e59]" : ""}`}
    >
      {Number(dateKey.slice(8))}
    </button>
  );
}
