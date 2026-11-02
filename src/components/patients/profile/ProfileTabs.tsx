import Link from "next/link";

export const PROFILE_TABS = [
  { key: "overview", label: "ภาพรวม" },
  { key: "trend", label: "กราฟแนวโน้ม" },
  { key: "history", label: "ประวัติรายวัน" },
  { key: "labs", label: "ผลตรวจ" },
  { key: "risk", label: "ความเสี่ยงและ Alert" },
  { key: "location", label: "พิกัด" },
] as const;

export type ProfileTabKey = (typeof PROFILE_TABS)[number]["key"];

export function parseTab(v: string | string[] | undefined): ProfileTabKey {
  const s = Array.isArray(v) ? v[0] : v;
  return PROFILE_TABS.find((t) => t.key === s)?.key ?? "history";
}

export default function ProfileTabs({ patientId, active, openAlertCount }: { patientId: string; active: ProfileTabKey; openAlertCount: number }) {
  return (
    <nav aria-label="หัวข้อโปรไฟล์ผู้ป่วย" className="-mx-1 overflow-x-auto border-b border-slate-200">
      <ul className="flex min-w-max gap-1 px-1">
        {PROFILE_TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={`/patients/${patientId}?tab=${t.key}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 border-b-2 px-3 text-[15px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700 ${
                  isActive ? "border-teal-700 font-semibold text-slate-900" : "border-transparent text-slate-700 hover:text-slate-900"
                }`}
              >
                {t.label}
                {t.key === "risk" && openAlertCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#991b1b] px-1.5 text-xs font-semibold text-white">
                    {openAlertCount}
                    <span className="sr-only"> รายการที่ยังไม่รับทราบ</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
