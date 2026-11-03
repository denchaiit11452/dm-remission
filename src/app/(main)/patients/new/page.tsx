import Link from "next/link";
import { TEXT_LINK } from "@/components/forms/fields";
import PatientForm from "@/components/patients/PatientForm";
import { RECORD_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { EMPTY_PATIENT_FORM } from "@/lib/patient-form";

export const metadata = { title: "เพิ่มผู้ป่วย | DM Remission" };

export default async function Page() {
  await requireRole(...RECORD_MANAGER_ROLES);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/patients" className={TEXT_LINK}>← กลับไปรายชื่อผู้ป่วย</Link>
      <h1 className="text-2xl font-semibold text-slate-900">เพิ่มผู้ป่วย</h1>
      <PatientForm initial={EMPTY_PATIENT_FORM} today={todayInBangkok()} cancelHref="/patients" />
    </div>
  );
}
