"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import RiskBadge from "@/components/patients/RiskBadge";
import type { CriticalAlertDTO } from "@/lib/critical-alerts";
import { formatThaiDate } from "@/lib/format";
import CriticalBeacon, { usePageThud } from "./CriticalBeacon";

type Props = {
  /** คิวรายที่ต้องเด้ง (แสดงรายแรก) ว่าง = ปิดกล่อง */
  queue: CriticalAlertDTO[];
  muted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

function timeOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** กล่องเด้งเมื่อมีผู้ป่วยวิกฤตรายใหม่ (มือถือเป็นแผ่นล่าง) ปิดได้ด้วย Esc หรือปุ่มปิด และไม่เตือนซ้ำ */
export default function CriticalAlertDialog({ queue, muted, onClose, onToggleMute }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const open = queue.length > 0;
  const head = queue[0];

  usePageThud(open);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // รายถัดไปขึ้นมา: ย้ายโฟกัสไปปุ่มหลักเพื่อให้โปรแกรมอ่านหน้าจออ่านรายใหม่
  useEffect(() => {
    if (head) primaryRef.current?.focus();
  }, [head?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="crit-title"
      aria-describedby="crit-desc"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="crit-dialog m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {head ? (
        <>
          <header className="crit-band relative flex items-center gap-5 overflow-hidden py-4 pl-6 pr-5 text-white">
            <CriticalBeacon />
            <div className="min-w-0 flex-1">
              <h2 id="crit-title" className="text-2xl font-semibold leading-tight">ผู้ป่วยวิกฤตรายใหม่</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-md ring-1 ring-white"><RiskBadge level="CRITICAL" /></span>
                {queue.length > 1 ? <span className="text-sm text-[#fee2e2]">1 จาก {queue.length}</span> : null}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="ปิด" className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center self-start rounded-lg text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>

        {/* key ทำให้รายถัดไปในคิวเลื่อนเข้ามาใหม่ ผู้ใช้จึงรู้ว่าเป็นคนละรายกับเมื่อครู่ */}
        <div key={head.id} className="crit-content space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div id="crit-desc" className="space-y-1">
            <p className="break-words text-2xl font-semibold leading-snug">{head.patientName}</p>
            <p className="text-sm tabular-nums text-slate-700">HN {head.hn}</p>
            <p className="!mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xl font-semibold leading-snug text-[#991b1b]">{head.summary}</p>
            <p className="!mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span>วัด {formatThaiDate(head.measuredDate)}</span>
              {head.backdatedDays > 0 ? <span className="rounded-md border border-slate-500 px-2 py-0.5 text-xs font-medium text-slate-800">ย้อนหลัง {head.backdatedDays} วัน</span> : null}
              <span>· ระบบบันทึกเมื่อ {timeOf(head.createdAt)} น.</span>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
            <Link ref={primaryRef} href={`/patients/${head.patientId}`} onClick={onClose} className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white hover:bg-teal-900 ${FOCUS}`}>
              ดูผู้ป่วย
            </Link>
            <Link href="/alerts" onClick={onClose} className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-50 ${FOCUS}`}>
              ไปหน้าการแจ้งเตือน
            </Link>
            <button type="button" onClick={onClose} className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-slate-800 hover:bg-slate-100 sm:mr-auto ${FOCUS}`}>
              {queue.length > 1 ? "ปิด (ดูรายถัดไป)" : "ปิด"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-700">
            <p>กล่องนี้ไม่เตือนซ้ำ ดูรายการที่ยังไม่รับทราบได้ในหน้าการแจ้งเตือน</p>
            <button type="button" onClick={onToggleMute} className={`min-h-11 px-2 font-medium text-teal-800 underline underline-offset-2 ${FOCUS}`}>
              {muted ? "เปิดเสียงแจ้งเตือน" : "ปิดเสียงแจ้งเตือน"}
            </button>
          </div>
        </div>
        </>
      ) : null}
    </dialog>
  );
}
