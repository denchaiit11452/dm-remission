import type { ReactNode } from "react";

type Props = {
  /** db = ยืนยันแล้วว่าติดต่อฐานข้อมูลไม่ได้, generic = ข้อผิดพลาดอื่น/ไม่ทราบสาเหตุ */
  kind: "db" | "generic";
  /** รหัสอ้างอิงของ Next.js (digest) ไว้ให้ผู้ดูแลระบบค้นหาใน log */
  reference?: string | null;
  /** ปุ่มลองใหม่ (RetryPanel) */
  actions: ReactNode;
};

const COPY = {
  db: {
    title: "เชื่อมต่อฐานข้อมูลไม่ได้ชั่วคราว",
    lead: "เปิดหน้านี้ไม่ได้ เพราะระบบติดต่อฐานข้อมูลไม่ได้ในขณะนี้ ข้อมูลที่บันทึกไว้แล้วไม่ได้หายไปไหน",
  },
  generic: {
    title: "ระบบขัดข้องชั่วคราว",
    lead: "เปิดหน้านี้ไม่สำเร็จ อาจเกิดจากการเชื่อมต่อฐานข้อมูลหรือเครือข่ายขัดข้อง ข้อมูลที่บันทึกไว้แล้วไม่ได้หายไปไหน",
  },
} as const;

function Icon() {
  // ฐานข้อมูลที่มีเส้นขีดฆ่า (วาดเอง เส้นเดียวกันทั้งชุด) สีเหลืองอำพันเพื่อไม่ชนกับสีแดงของระดับวิกฤต
  return (
    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-900">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v6c0 1.66 3.13 3 7 3m7-3V6" />
        <path d="M5 12v6c0 1.66 3.13 3 7 3" />
        <path d="M3 3l18 18" />
      </svg>
    </span>
  );
}

/** เนื้อหาแจ้งเมื่อระบบใช้ไม่ได้ (ใช้ได้ทั้งในกรอบเมนูซ้ายและเต็มหน้าจอ) */
export default function ServiceNotice({ kind, reference, actions }: Props) {
  const c = COPY[kind];
  return (
    <div className="mx-auto w-full max-w-xl space-y-6 text-slate-900">
      <div className="flex items-start gap-4">
        <Icon />
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold leading-snug">{c.title}</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-800">{c.lead}</p>
        </div>
      </div>

      {actions}

      <section aria-labelledby="notice-meanwhile" className="space-y-2 border-t border-slate-200 pt-5">
        <h2 id="notice-meanwhile" className="text-base font-semibold">ระหว่างนี้</h2>
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-800">
          <li>ค่าที่ยังไม่ได้กดบันทึกจะยังไม่อยู่ในระบบ จดไว้ก่อน แล้วกรอกเมื่อระบบกลับมา</li>
          <li>หากพบผู้ป่วยที่ต้องดูแลเร่งด่วน ให้ใช้ขั้นตอนสำรองของหน่วยงาน (เช่น แจ้งแพทย์ทางโทรศัพท์) ไม่ต้องรอระบบ</li>
          <li>ถ้ารอหลายนาทีแล้วยังไม่กลับมา แจ้งผู้ดูแลระบบ{reference ? " พร้อมรหัสอ้างอิงด้านล่าง" : ""}</li>
        </ul>
      </section>

      <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
        <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
          สำหรับผู้ดูแลระบบ
        </summary>
        <ul className="mt-1 list-disc space-y-1.5 pb-2 pl-5 leading-relaxed">
          <li>โปรเจกต์ Supabase ถูก Pause (แบบฟรีหยุดเองเมื่อไม่ได้ใช้นาน) ให้กด Restore ใน Dashboard</li>
          <li>เครือข่ายหรือไฟร์วอลล์บล็อกพอร์ต 6543 (pooler) ลองจากเครือข่ายอื่น</li>
          <li>ค่า <code className="rounded bg-slate-100 px-1">DATABASE_URL</code> ผิดหรือรหัสผ่านมีอักขระพิเศษที่ยังไม่ได้เข้ารหัส</li>
          <li>Supabase ขัดข้อง ดูที่ status.supabase.com</li>
        </ul>
        {reference ? <p className="border-t border-slate-200 pt-2">รหัสอ้างอิง: <code className="rounded bg-slate-100 px-1 break-all">{reference}</code></p> : null}
      </details>
    </div>
  );
}
