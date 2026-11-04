import type { ReactNode } from "react";

/** กรอบของแต่ละส่วนในหน้าภาพรวม */
export default function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-4 rounded-[10px] border border-slate-200 bg-white p-4 md:p-5">
      <header>
        <h2 className="text-[17px] font-semibold leading-snug text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] leading-snug text-slate-600">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** ลิงก์ในหน้าภาพรวม สูงอย่างน้อย 44 px เพื่อกดง่ายบนมือถือ */
export const PANEL_LINK =
  "inline-flex min-h-11 items-center font-medium text-teal-800 underline underline-offset-2 hover:text-teal-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
