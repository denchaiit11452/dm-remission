"use client";

import { useEffect } from "react";
import "./critical-alert.css";

/** ทั้งหน้าสะดุ้งแรงกว่า popup กรอกผิด เพราะเป็นเหตุการณ์จริงของผู้ป่วย ขยับแนวตั้งเท่านั้นเพื่อไม่ให้เกิดแถบเลื่อนแนวนอน */
const PAGE_THUD: Keyframe[] = [
  { transform: "translateY(0)" },
  { transform: "translateY(16px)", offset: 0.14 },
  { transform: "translateY(-10px)", offset: 0.34 },
  { transform: "translateY(5px)", offset: 0.56 },
  { transform: "translateY(-2px)", offset: 0.78 },
  { transform: "translateY(0)" },
];
const THUD_DELAY_MS = 170;

/** ให้ทั้งหน้าสะดุ้งหนึ่งครั้งตอนกล่องวิกฤตเปิด */
export function usePageThud(open: boolean) {
  useEffect(() => {
    if (!open || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelector("main")?.animate(PAGE_THUD, { duration: 480, delay: THUD_DELAY_MS, easing: "ease-out" });
  }, [open]);
}

/** สัญญาณเต้นต่อเนื่องบนแถบหัวกล่อง บอกว่าเหตุยังไม่จบจนกว่าจะมีคนจัดการ */
export default function CriticalBeacon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-12 shrink-0 overflow-visible text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle className="crit-beacon-ring" cx="12" cy="12" r="10" strokeWidth="1.4" />
      <circle className="crit-beacon-ring crit-beacon-ring-late" cx="12" cy="12" r="10" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="none" />
      <path d="M12 6.5v7.5" stroke="#991b1b" strokeWidth="3" />
      <path d="M12 17.8h.01" stroke="#991b1b" strokeWidth="3.4" />
    </svg>
  );
}
