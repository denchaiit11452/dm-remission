import RetryPanel from "./RetryPanel";
import ServiceNotice from "./ServiceNotice";

/** หน้าเต็มจอ ใช้เมื่อโครงหน้าหลัก (เมนูซ้าย) โหลดไม่ได้เพราะฐานข้อมูลล่ม จึงยังไม่รู้ว่าผู้ใช้คือใครและเห็นเมนูอะไรได้ */
export default function ServiceUnavailableScreen({ kind = "db", reference }: { kind?: "db" | "generic"; reference?: string | null }) {
  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10 sm:py-16">
      <p className="mx-auto mb-8 w-full max-w-xl text-sm font-semibold text-slate-700">DM Remission</p>
      <main id="main" className="mx-auto w-full max-w-xl">
        <ServiceNotice kind={kind} reference={reference} actions={<RetryPanel />} />
      </main>
    </div>
  );
}
