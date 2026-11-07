"use client";

import { useEffect, useState } from "react";
import { SECONDARY_BUTTON } from "@/components/forms/fields";

/** คัดลอกพิกัดเป็น "ละติจูด, ลองจิจูด" ซึ่งวางในแอปแผนที่ส่วนใหญ่ได้ทันที */
export default function CopyCoordinatesButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={copy} className={SECONDARY_BUTTON}>
        {state === "copied" ? "คัดลอกพิกัดแล้ว" : "คัดลอกพิกัด"}
      </button>
      <p role="status" className="min-h-[18px] text-[12.5px] text-slate-600">
        {state === "failed" ? "เบราว์เซอร์ไม่อนุญาตให้คัดลอก เลือกตัวเลขพิกัดแล้วคัดลอกเองได้" : ""}
      </p>
    </div>
  );
}
