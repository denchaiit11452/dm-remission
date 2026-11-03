import Link from "next/link";
import { notFound } from "next/navigation";
import { TEXT_LINK } from "@/components/forms/fields";
import MedicationForm from "@/components/records/MedicationForm";
import { RECORD_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { getPatientSummary } from "@/lib/data/patients";

export const metadata = { title: "เพิ่มยา | DM Remission" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(...RECORD_MANAGER_ROLES);
  const { id } = await params;
  const summary = await getPatientSummary(id);
  if (!summary) notFound();
  const { patient } = summary;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/patients/${id}?tab=medications`} className={TEXT_LINK}>← กลับไปรายการยา</Link>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">เพิ่มยา</h1>
        <p className="mt-1 text-[15px] font-medium text-slate-900">{patient.fullName} · HN {patient.hn}</p>
      </header>
      <MedicationForm patientId={id} today={todayInBangkok()} />
    </div>
  );
}
