import Link from "next/link";
import { PRIMARY_BUTTON, TEXT_LINK } from "@/components/forms/fields";
import CopyCoordinatesButton from "@/components/patients/profile/CopyCoordinatesButton";
import { formatThaiDateTime } from "@/lib/alert-center";
import { LOCATION_METHOD_LABELS, type PatientLocationView } from "@/lib/data/locations";
import { formatThaiDate } from "@/lib/format";
import LocationViewMap from "./LocationViewMap";

type Props = { patientId: string; allowed: boolean; canEdit: boolean; location: PatientLocationView | null };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className="text-[12.5px] text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-slate-900">{children}</dd>
    </div>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-slate-200 bg-white px-4 py-10 text-center md:px-5">
      <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-prose text-[14px] text-slate-700">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}

/** แท็บพิกัดบ้านผู้ป่วย (ตรวจสิทธิ์จริงที่ src/lib/data/locations.ts) ปุ่มปักหมุดแสดงเฉพาะผู้ดูแลระบบและพยาบาล */
export default function LocationTab({ patientId, allowed, canEdit, location }: Props) {
  const editHref = `/patients/${patientId}/location/edit`;

  if (!allowed) {
    return <Notice title="บัญชีนี้ไม่มีสิทธิ์ดูพิกัดบ้านผู้ป่วย" body="ติดต่อผู้ดูแลระบบหากต้องใช้พิกัดเพื่อออกเยี่ยมบ้าน" />;
  }
  if (!location) {
    return (
      <Notice
        title="ยังไม่ได้ปักหมุดบ้านผู้ป่วย"
        body={canEdit ? "ขอความยินยอมจากผู้ป่วยก่อน แล้วปักหมุดตรงบ้านบนแผนที่" : "พยาบาลหรือผู้ดูแลระบบปักหมุดได้ หลังได้รับความยินยอมจากผู้ป่วย"}
        action={canEdit ? <Link href={editHref} className={PRIMARY_BUTTON}>ปักหมุดบ้านผู้ป่วย</Link> : undefined}
      />
    );
  }

  const coordinates = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

  return (
    <div className="grid gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <LocationViewMap latitude={location.latitude} longitude={location.longitude} />
      </div>

      <section aria-labelledby="location-title" className="flex min-w-0 flex-col rounded-[10px] border border-slate-200 bg-white p-4 md:p-5">
        <div className="-my-2.5 flex items-center justify-between gap-3">
          <h2 id="location-title" className="text-[17px] font-semibold leading-snug text-slate-900">บ้านผู้ป่วย</h2>
          {canEdit ? <Link href={editHref} className={TEXT_LINK}>แก้ไขหมุด</Link> : null}
        </div>
        <p className="mt-1 select-all text-[20px] font-semibold tabular-nums text-slate-900">{coordinates}</p>
        <p className="text-[12.5px] text-slate-600">ละติจูด, ลองจิจูด</p>

        <dl className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
          <Detail label="จุดสังเกต">{location.addressNote || <span className="text-slate-600">ไม่ได้ระบุ</span>}</Detail>
          <Detail label="วิธีบันทึก">{LOCATION_METHOD_LABELS[location.method]}</Detail>
          <Detail label="ผู้ป่วยให้ความยินยอม">
            {formatThaiDate(location.consentGivenAt)}
            <span className="block text-[12.5px] text-slate-600">บันทึกโดย {location.consentRecordedByName}</span>
          </Detail>
          <Detail label="แก้ไขล่าสุด">
            {formatThaiDateTime(location.updatedAt)}
            <span className="block text-[12.5px] text-slate-600">โดย {location.updatedByName}</span>
          </Detail>
        </dl>

        <div className="mt-auto grid gap-2 pt-4">
          <a href={`/patients/${patientId}/navigate`} target="_blank" rel="noopener noreferrer" className={PRIMARY_BUTTON}>
            นำทางด้วย Google Maps
          </a>
          <CopyCoordinatesButton text={coordinates} />
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-slate-600">
          ภาพแผนที่โหลดจาก OpenStreetMap ซึ่งเห็นเพียงพื้นที่ ไม่เห็นชื่อผู้ป่วย พิกัดถูกส่งไปยัง Google เฉพาะตอนกดนำทาง และทุกการเปิดดูหรือนำทางถูกบันทึกในประวัติการเข้าถึง
        </p>
      </section>
    </div>
  );
}
