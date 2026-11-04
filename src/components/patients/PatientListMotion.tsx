"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

const MOVE_MS = 380;
const MOVE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const ENTER_MS = 220;
/** นานกว่าการวาดสันแถวสุดท้าย จึงไม่ตัดแอนิเมชันกลางคัน */
const ARRIVAL_DONE_MS = 1600;

/** ทั้งตารางและการ์ดอยู่ใน DOM พร้อมกัน นับเฉพาะแบบที่แสดงอยู่ */
function visibleRows(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-row-id]")].filter((row) => row.getClientRects().length > 0);
}

/**
 * เมื่อกรองหรือเปลี่ยนหน้า แถวที่ยังอยู่จะเลื่อนไปตำแหน่งใหม่ และแถวใหม่ค่อยๆ ปรากฏ
 * จึงเห็นว่ารายการเปลี่ยนอย่างไร ถ้าสคริปต์ไม่ทำงานรายการยังแสดงครบตามปกติ
 */
export default function PatientListMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const positions = useRef<Map<string, number> | null>(null);
  const running = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // แถวที่กำลังเลื่อนอยู่มีตำแหน่งเพี้ยน ต้องหยุดก่อนวัด
    running.current.forEach((animation) => animation.cancel());
    running.current = [];

    const rootTop = root.getBoundingClientRect().top;
    const rows = visibleRows(root);
    const next = new Map(rows.map((row) => [row.dataset.rowId ?? "", row.getBoundingClientRect().top - rootTop]));
    const previous = positions.current;
    positions.current = next;

    if (!previous || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const row of rows) {
      const id = row.dataset.rowId ?? "";
      const before = previous.get(id);
      if (before === undefined) {
        running.current.push(row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ENTER_MS, easing: "ease-out" }));
        continue;
      }
      const distance = before - (next.get(id) ?? before);
      if (Math.abs(distance) < 1) continue;
      running.current.push(row.animate([{ transform: `translateY(${distance}px)` }, { transform: "translateY(0)" }], { duration: MOVE_MS, easing: MOVE_EASE }));
    }
  });

  // สันความเสี่ยงวาดรอบเดียวตอนเปิดหน้า แถวที่เข้ามาภายหลังไม่ต้องวาดซ้ำ
  useEffect(() => {
    const timer = setTimeout(() => rootRef.current?.setAttribute("data-arrived", ""), ARRIVAL_DONE_MS);
    return () => clearTimeout(timer);
  }, []);

  return <div ref={rootRef} data-patient-list>{children}</div>;
}
