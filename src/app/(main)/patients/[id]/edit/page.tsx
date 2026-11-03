import Link from "next/link";
import { notFound } from "next/navigation";
import { TEXT_LINK } from "@/components/forms/fields";
import PatientForm from "@/components/patients/PatientForm";
import { RECORD_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { getPatientFormValues } from "@/lib/data/patient-store";

export const metadata = { title: "แก้ไขข้อมูลผู้ป่วย | DM Remission" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(...RECORD_MANAGER_ROLES);
  const { id } = await params;
  const initial = await getPatientFormValues(id);
  if (!initial) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`/patients/${id}`} className={TEXT_LINK}>← กลับไปโปรไฟล์</Link>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">แก้ไขข้อมูลผู้ป่วย</h1>
        <p className="mt-1 text-sm text-slate-700">ระบบเก็บค่าเดิมและผู้แก้ไขไว้ในประวัติ</p>
      </header>
      <PatientForm patientId={id} initial={initial} today={todayInBangkok()} cancelHref={`/patients/${id}`} />
    </div>
  );
}
