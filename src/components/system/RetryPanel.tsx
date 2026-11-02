"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type Props = {
  /** ใช้เมื่ออยู่ใน error boundary (reset) ถ้าไม่ส่งมาจะสั่งโหลดหน้าจากเซิร์ฟเวอร์ใหม่ */
  onRetry?: () => void;
  autoSeconds?: number;
  /** หยุดตรวจเองหลังกี่ครั้ง (กันยิงฐานข้อมูลไม่สิ้นสุด) 90 ครั้ง x 20 วินาที = 30 นาที */
  maxAuto?: number;
};

const BTN =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-6 text-base font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait disabled:bg-teal-800/70";

/** ปุ่มลองใหม่ + ตรวจการเชื่อมต่อให้เองเป็นระยะ (เฉพาะเมื่อแท็บเปิดอยู่) เมื่อกลับมาใช้ได้หน้านี้จะถูกแทนที่เอง */
export default function RetryPanel({ onRetry, autoSeconds = 20, maxAuto = 90 }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [autoStopped, setAutoStopped] = useState(false);
  const autoCount = useRef(0);

  const check = useCallback(() => {
    startTransition(() => (onRetry ? onRetry() : router.refresh()));
    setCheckedAt(new Date().toLocaleTimeString("th-TH", { hour12: false }));
  }, [onRetry, router]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (autoCount.current >= maxAuto) { setAutoStopped(true); clearInterval(t); return; }
      autoCount.current += 1;
      check();
    }, autoSeconds * 1000);
    return () => clearInterval(t);
  }, [check, autoSeconds, maxAuto]);

  return (
    <div className="space-y-3">
      <button type="button" onClick={check} disabled={pending} aria-busy={pending} className={BTN}>
        {pending ? "กำลังตรวจสอบ..." : "ลองใหม่"}
      </button>
      <p role="status" aria-live="polite" className="text-sm leading-relaxed text-slate-700">
        {autoStopped
          ? "หยุดตรวจสอบอัตโนมัติแล้ว กด \"ลองใหม่\" เมื่อพร้อม"
          : checkedAt
            ? `ตรวจสอบล่าสุด ${checkedAt} น. ยังเชื่อมต่อไม่ได้ ระบบจะตรวจซ้ำให้เองทุก ${autoSeconds} วินาที`
            : `ระบบจะตรวจการเชื่อมต่อให้เองทุก ${autoSeconds} วินาที`}
      </p>
    </div>
  );
}
