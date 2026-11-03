"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import "./save-toast.css";

const VISIBLE_MS = 6000;

type SaveMessage = { title: string; detail?: string };
type ShownMessage = SaveMessage & { id: number };

const SaveToastContext = createContext<((message: SaveMessage) => void) | null>(null);

/** เรียก popup แจ้งว่าบันทึกสำเร็จ ใช้ได้ทั้งก่อนเปลี่ยนหน้าและก่อน router.refresh */
export function useSaveToast() {
  const show = useContext(SaveToastContext);
  if (!show) throw new Error("useSaveToast ต้องอยู่ภายใน SaveToastProvider");
  return show;
}

/** วางที่ layout เพื่อให้ popup ยังอยู่หลังเปลี่ยนหน้า แจ้งเฉพาะกรณีสำเร็จ ส่วนข้อผิดพลาดแสดงในฟอร์มเหมือนเดิม */
export function SaveToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ShownMessage | null>(null);

  // id ใหม่ทุกครั้ง: บันทึกซ้ำขณะ popup เดิมยังอยู่จะเริ่มนับเวลาและเล่นการเคลื่อนไหวใหม่
  const show = useCallback((next: SaveMessage) => {
    setMessage((current) => ({ ...next, id: (current?.id ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <SaveToastContext.Provider value={show}>
      {children}
      {/* region อยู่ในหน้าตลอด เพื่อให้โปรแกรมอ่านหน้าจออ่านข้อความเมื่อ popup ขึ้น */}
      <div role="status" aria-live="polite">
        {message ? (
          <div key={message.id} className="save-toast fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-green-200 bg-green-50 p-4 text-green-950 shadow-lg">
            <div className="flex items-start gap-3">
              <svg viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="12" fill="#15803d" />
                <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{message.title}</p>
                {message.detail ? <p className="mt-0.5">{message.detail}</p> : null}
              </div>
              <button type="button" onClick={() => setMessage(null)} aria-label="ปิดข้อความ" className="-mr-2 -mt-2 ml-auto min-h-11 min-w-11 shrink-0 text-lg leading-none text-green-900">×</button>
            </div>
          </div>
        ) : null}
      </div>
    </SaveToastContext.Provider>
  );
}
