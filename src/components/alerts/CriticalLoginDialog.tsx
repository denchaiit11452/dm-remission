"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import RiskBadge from "@/components/patients/RiskBadge";
import { CRITICAL_LIST_LIMIT, type CriticalAlertDTO } from "@/lib/critical-alerts";
import { formatThaiDate } from "@/lib/format";
import CriticalBeacon, { usePageThud } from "./CriticalBeacon";

type Props = {
  /** ผู้ป่วยวิกฤตที่ยังไม่รับทราบ ว่าง = ปิดกล่อง */
  alerts: CriticalAlertDTO[];
  onClose: () => void;
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

/** กล่องสรุปผู้ป่วยวิกฤตที่ค้างอยู่ เด้งหนึ่งครั้งหลังเข้าสู่ระบบ แล้วพาไปจัดการต่อที่หน้าการแจ้งเตือน */
export default function CriticalLoginDialog({ alerts, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const open = alerts.length > 0;
  const countText = alerts.length >= CRITICAL_LIST_LIMIT ? `${CRITICAL_LIST_LIMIT} รายขึ้นไป` : `${alerts.length} ราย`;

  usePageThud(open);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      primaryRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="crit-login-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="crit-dialog m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {open ? (
        <>
          <header className="crit-band relative flex items-center gap-5 overflow-hidden py-4 pl-6 pr-5 text-white">
            <CriticalBeacon />
            <div className="min-w-0">
              <h2 id="crit-login-title" className="text-2xl font-semibold leading-tight">ผู้ป่วยวิกฤตที่ยังไม่รับทราบ {countText}</h2>
              <div className="mt-1.5"><span className="inline-flex rounded-md ring-1 ring-white"><RiskBadge level="CRITICAL" /></span></div>
            </div>
          </header>

        <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p className="text-sm text-slate-700">รับทราบและดูรายละเอียดได้ที่หน้าการแจ้งเตือน</p>

          <ul className="max-h-[45vh] divide-y divide-slate-200 overflow-y-auto border-y border-slate-200" aria-label="รายชื่อผู้ป่วยวิกฤต">
            {alerts.map((alert) => (
              <li key={alert.id} className="py-3">
                <p className="text-lg font-semibold leading-snug">{alert.patientName} <span className="text-sm font-normal tabular-nums text-slate-700">HN {alert.hn}</span></p>
                <p className="mt-0.5 text-base font-semibold text-[#991b1b]">{alert.summary}</p>
                <p className="mt-0.5 text-[13px] text-slate-700">วัด {formatThaiDate(alert.measuredDate)}</p>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
            <Link ref={primaryRef} href="/alerts" onClick={onClose} className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white hover:bg-teal-900 ${FOCUS}`}>
              ไปหน้าการแจ้งเตือน
            </Link>
            <button type="button" onClick={onClose} className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-slate-800 hover:bg-slate-100 sm:mr-auto ${FOCUS}`}>
              ปิดไว้ก่อน
            </button>
          </div>
        </div>
        </>
      ) : null}
    </dialog>
  );
}
