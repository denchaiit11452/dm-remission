"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** โหลดข้อมูลใหม่ โดยคงข้อมูลเดิมไว้บนหน้าจอระหว่างรอ */
export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
    >
      {pending ? "กำลังโหลด..." : "โหลดใหม่"}
    </button>
  );
}
