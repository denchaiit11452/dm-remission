import Link from "next/link";
import { notFound } from "next/navigation";
import { TEXT_LINK } from "@/components/forms/fields";
import LocationPinForm from "@/components/records/LocationPinForm";
import { LOCATION_EDITOR_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { viewPatientLocation } from "@/lib/data/locations";
import { getPatientSummary } from "@/lib/data/patients";

export const metadata = { title: "ปักหมุดบ้านผู้ป่วย | DM Remission" };

// ปักหมุดหรือแก้ไขพิกัดบ้าน: เฉพาะผู้ดูแลระบบและพยาบาล/เจ้าหน้าที่ (ตรวจซ้ำใน savePatientLocation)
// การเปิดหน้านี้เห็นพิกัดเดิม จึงอ่านผ่าน viewPatientLocation ซึ่งบันทึก VIEW_LOCATION ด้วย
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(...LOCATION_EDITOR_ROLES);
  const { id } = await params;
  const summary = await getPatientSummary(id);
  if (!summary) notFound();
  const { patient } = summary;
  const location = await viewPatientLocation(id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/patients/${id}?tab=location`} className={TEXT_LINK}>← กลับไปพิกัดบ้าน</Link>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{location ? "แก้ไขหมุดบ้านผู้ป่วย" : "ปักหมุดบ้านผู้ป่วย"}</h1>
        <p className="mt-1 text-[15px] font-medium text-slate-900">{patient.fullName} · HN {patient.hn}</p>
      </header>
      <LocationPinForm
        patientId={id}
        today={todayInBangkok()}
        initial={
          location
            ? { latitude: location.latitude, longitude: location.longitude, addressNote: location.addressNote, consentGivenAt: location.consentGivenAt }
            : null
        }
      />
    </div>
  );
}
