import Link from "next/link";
import { notFound } from "next/navigation";
import { TEXT_LINK } from "@/components/forms/fields";
import LabForm from "@/components/records/LabForm";
import { requireUser } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { listLabRecords } from "@/lib/data/labs";
import { getPatientSummary, loadRules } from "@/lib/data/patients";
import { buildLabSeries } from "@/lib/lab-summary";

export const metadata = { title: "บันทึกผลตรวจ | DM Remission" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const summary = await getPatientSummary(id);
  if (!summary) notFound();
  const [{ rules, ruleSetMissing }, labs] = await Promise.all([loadRules(), listLabRecords(id)]);
  const { patient } = summary;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href={`/patients/${id}?tab=labs`} className={`${TEXT_LINK} gap-1`}>
        <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 8H3M7 4 3 8l4 4" />
        </svg>
        กลับไปผลตรวจ
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">บันทึกผลตรวจ</h1>
        <p className="mt-1 text-[15px] font-medium text-slate-900">{patient.fullName} · HN {patient.hn}</p>
      </header>
      {ruleSetMissing ? (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
          ยังไม่มีชุดเกณฑ์ความเสี่ยงที่ใช้งานอยู่ จึงบันทึกผลตรวจไม่ได้ กรุณาแจ้งผู้ดูแลระบบ
        </div>
      ) : (
        <LabForm patient={{ id: patient.id, hn: patient.hn, fullName: patient.fullName }} rules={rules} today={todayInBangkok()} series={buildLabSeries(labs, rules)} />
      )}
    </div>
  );
}
