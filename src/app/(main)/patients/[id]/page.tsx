import Link from "next/link";
import { notFound } from "next/navigation";
import DailyHistory from "@/components/patients/profile/DailyHistory";
import ProfileHeader from "@/components/patients/profile/ProfileHeader";
import ProfileTabs, { PROFILE_TABS, parseTab } from "@/components/patients/profile/ProfileTabs";
import { requireUser } from "@/lib/auth/session";
import { getDailyHistory } from "@/lib/data/history";
import { getPatientSummary } from "@/lib/data/patients";

export const metadata = { title: "โปรไฟล์ผู้ป่วย | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// หน้าโปรไฟล์ผู้ป่วย (ขั้น 5D): หัวโปรไฟล์ + แท็บ "ประวัติรายวัน"
// แท็บอื่นยังไม่เปิดใช้งาน และยังไม่มีปุ่ม "บันทึกน้ำตาล"/"ปรับระดับความเสี่ยง"/"เพิ่มค่าย้อนหลัง" (อยู่ขั้น 5E)
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  await requireUser();
  const { id } = await params;
  const raw = await searchParams;
  const tab = parseTab(raw.tab);

  const summary = await getPatientSummary(id);
  if (!summary) notFound();

  const data = tab === "history" ? await getDailyHistory(id, raw) : null;
  const tabLabel = PROFILE_TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <div className="space-y-4">
      <Link href="/patients" className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
        ← กลับไปรายชื่อผู้ป่วย
      </Link>

      <ProfileHeader summary={summary} />

      <ProfileTabs patientId={id} active={tab} openAlertCount={summary.openAlertCount} />

      <section aria-label={tabLabel}>
        {data ? (
          <DailyHistory
            patientId={id}
            history={data.history}
            range={data.range}
            goodMin={data.rules.goodMin}
            goodMax={data.rules.goodMax}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">
            แท็บ &quot;{tabLabel}&quot; ยังไม่เปิดใช้งาน
          </div>
        )}
      </section>
    </div>
  );
}
