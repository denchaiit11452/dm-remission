"use client";

import { useEffect, useRef } from "react";
import RiskBadge from "@/components/patients/RiskBadge";
import { formatThaiDateTime, type AlertRowDTO } from "@/lib/alert-center";
import { formatThaiDate } from "@/lib/format";

type Props = {
  row: AlertRowDTO | null;
  closing: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

function Spinner() {
  return (
    <svg className="ac-spinner size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** กล่องยืนยันก่อนรับทราบ Alert วิกฤต (มือถือเป็นแผ่นล่าง) ไม่ปิดได้ขณะกำลังบันทึก */
export default function AckDialog({ row, closing, saving, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const open = row !== null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); cancelRef.current?.focus(); }
    if (!open && !closing && d.open) d.close();
  }, [open, closing]);

  const guard = (e: React.SyntheticEvent) => { e.preventDefault(); if (!saving) onCancel(); };

  return (
    <dialog
      ref={ref}
      aria-labelledby="ack-title"
      aria-describedby="ack-desc"
      data-state={closing ? "exit" : "open"}
      onCancel={guard}
      onClick={(e) => { if (e.target === ref.current) guard(e); }}
      className="ac-dialog m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {row ? (
        <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <header>
            <h2 id="ack-title" className="text-xl font-semibold">รับทราบ Alert นี้?</h2>
            <p className="mt-1 text-sm text-slate-700">{row.patientName} · HN {row.hn}</p>
          </header>

          <div className="space-y-1.5 rounded-lg bg-slate-50 p-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <RiskBadge level={row.level} />
              <span className="text-[15px] font-medium">{row.summary}</span>
            </div>
            {row.valueText ? <p className="text-2xl font-semibold text-[#991b1b]">{row.valueText}</p> : null}
            <p className="text-[13px] text-slate-700">
              {row.valueText?.endsWith("mmHg") ? "ตรวจ" : "วัด"} {formatThaiDate(row.measuredDate)} · กรอก {formatThaiDateTime(row.createdAt)}
            </p>
          </div>

          <div id="ack-desc" className="space-y-1.5">
            <p className="text-sm">ยืนยันว่าเจ้าหน้าที่เห็นรายการนี้แล้ว ไม่ใช่การบันทึกว่าได้ดูแลผู้ป่วยแล้ว</p>
            <p className="text-[13px] text-slate-700">ระบบจะบันทึกชื่อและเวลาของคุณ แล้วย้ายรายการไปแท็บ &quot;รับทราบแล้ว&quot; ย้อนกลับไม่ได้</p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button ref={cancelRef} type="button" disabled={saving} onClick={onCancel} className={`ac-btn min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50 max-sm:min-h-12 ${FOCUS}`}>
              ยกเลิก
            </button>
            <button type="button" disabled={saving} aria-busy={saving} onClick={onConfirm} className={`ac-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-800 px-7 text-sm font-medium text-white hover:bg-teal-900 disabled:cursor-wait max-sm:min-h-12 ${FOCUS}`}>
              {saving ? <><Spinner />กำลังบันทึก...</> : "รับทราบ"}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
