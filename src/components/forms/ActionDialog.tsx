"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  /** ขณะกำลังบันทึกปิดกล่องไม่ได้ กันกดซ้ำ */
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** กล่องโต้ตอบกลางจอ (มือถือเป็นแผ่นล่าง) ปิดด้วย Esc หรือคลิกนอกกล่องได้เมื่อไม่ได้กำลังบันทึก */
export default function ActionDialog({ open, title, busy, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const guardClose = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!busy) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={guardClose}
      onClick={(e) => { if (e.target === ref.current) guardClose(e); }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border-0 bg-white p-0 text-left font-normal text-slate-900 shadow-2xl backdrop:bg-slate-900/50 max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {open ? (
        <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
