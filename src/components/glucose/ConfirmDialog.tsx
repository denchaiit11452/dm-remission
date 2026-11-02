"use client";

import { useEffect, useRef } from "react";
import { formatThaiDate, formatGlucoseValue, periodLabel } from "@/lib/format";
import type { EntryCheck } from "@/lib/glucose-form";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import type { RiskLevel } from "@/lib/risk/types";
import { TILE_STYLES } from "@/components/patients/profile/GlucoseValue";

type Props = {
  open: boolean;
  /** กำลังปิด (เล่นแอนิเมชันออก) */
  closing: boolean;
  saving: boolean;
  patientName: string;
  hn: string;
  measuredDate: string;
  dateNote: string;
  filled: EntryCheck[];
  criticalCount: number;
  alertCount: number;
  levelAfter: RiskLevel | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/** กล่องยืนยันก่อนบันทึกเมื่อมีค่าวิกฤต (บนมือถือเป็นแผ่นล่าง) */
export default function ConfirmDialog(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (p.open && !d.open) {
      d.showModal();
      backRef.current?.focus();
    }
    if (!p.open && !p.closing && d.open) d.close();
  }, [p.open, p.closing]);

  // ปิดด้วยการกด Esc หรือคลิกนอกกล่อง ไม่ได้ขณะกำลังบันทึก (กันกดซ้ำ)
  const blockWhileSaving = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!p.saving) p.onCancel();
  };

  if (!p.open && !p.closing) return <dialog ref={ref} className="hidden" aria-hidden="true" />;

  const n = p.filled.length;
  const confirmLabel = p.alertCount > 0 ? `บันทึก ${n} ค่าและสร้าง Alert` : `บันทึก ${n} ค่า`;

  return (
    <dialog
      ref={ref}
      aria-labelledby="gl-confirm-title"
      aria-describedby="gl-confirm-desc"
      data-state={p.closing ? "exit" : "open"}
      onCancel={blockWhileSaving}
      onClick={(e) => { if (e.target === ref.current) blockWhileSaving(e); }}
      className="gl-dialog m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <header>
          <h2 id="gl-confirm-title" className="text-lg font-semibold">บันทึกค่าน้ำตาล {n} ค่า?</h2>
          <p id="gl-confirm-desc" className="mt-1 text-sm text-slate-700">
            {p.patientName} · HN {p.hn}
            <br />
            วันที่ผู้ป่วยวัด <strong className="text-slate-900">{formatThaiDate(p.measuredDate)}</strong> ({p.dateNote})
          </p>
        </header>

        <div>
          <p className="text-sm text-slate-700">ค่าที่จะบันทึก</p>
          <ul className="mt-1 divide-y divide-slate-200 border-y border-slate-200">
            {p.filled.map((c) => {
              const v = formatGlucoseValue(c.valueMgDl, c.meterFlag);
              const a = c.assessment;
              return (
                <li key={c.key} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                  <span>{periodLabel(c.period)}</span>
                  <span className={`font-semibold ${a?.level === "CRITICAL" ? "text-[#991b1b]" : ""}`}>
                    {v.text}
                    {v.unit ? <span className="ml-1 text-xs font-normal text-slate-600">{v.unit}</span> : null}
                  </span>
                  {a ? (
                    <span className={`rounded-md px-2 py-0.5 text-[13px] font-medium ${a.level === "WELL_CONTROLLED" ? "bg-[#dcfce7] text-[#14532d]" : TILE_STYLES[a.level]}`}>
                      {RISK_LEVEL_LABELS[a.level]}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        {p.criticalCount > 0 ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-950">
            <p className="font-semibold">⚠ มีค่าวิกฤต {p.criticalCount} ค่า</p>
            <p className="mt-1">
              ระบบจะสร้าง Alert ทันที
              {p.levelAfter ? <> และปรับระดับปัจจุบันของผู้ป่วยเป็น &quot;{RISK_LEVEL_LABELS[p.levelAfter]}&quot;</> : null}
              {" "}· ตรวจว่าตัวเลขตรงกับที่ผู้ป่วยรายงานก่อนยืนยัน
            </p>
          </div>
        ) : null}

        <p className="text-xs text-slate-700">ค่าที่บันทึกแล้วแก้ไขได้ ระบบเก็บค่าเดิมและผู้แก้ไว้ในประวัติ</p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={backRef} type="button" disabled={p.saving} onClick={p.onCancel} className="gl-btn min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50">
            กลับไปแก้ไข
          </button>
          <button type="button" disabled={p.saving} onClick={p.onConfirm} className={`gl-btn min-h-11 rounded-lg bg-teal-800 px-5 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait ${p.saving ? "gl-saving" : ""}`}>
            {p.saving ? (
              <span className="inline-flex items-center gap-2">
                <svg className="gl-spinner size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                กำลังบันทึก...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
