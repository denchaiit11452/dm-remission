import RiskBadge, { StaleTag } from "@/components/patients/RiskBadge";
import { GENDER_LABELS, PROGRAM_STATUS_LABELS, formatAgo, formatThaiDate } from "@/lib/format";
import type { PatientSummary } from "@/lib/data/patients";
import type { RiskLevel } from "@/lib/risk/types";

// กล่องเหตุผลสีตามระดับ (ตามดีไซน์: วิกฤต/สูง = แดง)
const REASON_BOX: Record<RiskLevel, string> = {
  CRITICAL: "border-red-200 bg-red-50 text-red-950",
  HIGH: "border-red-200 bg-red-50 text-red-950",
  WATCH: "border-orange-200 bg-orange-50 text-orange-950",
  UNCONTROLLED: "border-amber-200 bg-amber-50 text-amber-950",
  WELL_CONTROLLED: "border-green-200 bg-green-50 text-green-950",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-700">{label}</dt>
      <dd className="mt-1 text-[15px] font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function medicationNote(r: PatientSummary["remission"]): string | null {
  if (r.onDiabetesMedication) return "ยังใช้ยาเบาหวาน";
  if (r.medFreeDays !== null) return `หยุดยาเบาหวาน ${r.medFreeDays} วัน`;
  return null;
}

/**
 * การ์ดหัวโปรไฟล์ผู้ป่วย
 * หมายเหตุ: ยังไม่มีปุ่ม "+ บันทึกน้ำตาล" และ "ปรับระดับความเสี่ยง" โดยตั้งใจ (ฟอร์มอยู่ขั้น 5E)
 * ให้เพิ่มกลับทั้ง Desktop และ Mobile เมื่อฟอร์มพร้อม
 */
export default function ProfileHeader({ summary }: { summary: PatientSummary }) {
  const { patient, risk, remission, openAlertCount } = summary;
  const med = medicationNote(remission);
  const subtitle = [
    `HN ${patient.hn}`,
    patient.gender ? `เพศ${GENDER_LABELS[patient.gender]}` : null,
    patient.ageYears !== null ? `อายุ ${patient.ageYears} ปี` : null,
    patient.programStartDate ? `เริ่มโปรแกรม ${formatThaiDate(patient.programStartDate)}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="patient-name" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <header>
        <h1 id="patient-name" className="text-xl font-semibold text-slate-900 md:text-2xl">{patient.fullName}</h1>
        <p className="mt-1 text-sm text-slate-700">{subtitle}</p>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
        <Field label="ระดับความเสี่ยงปัจจุบัน">
          <span className="flex flex-wrap items-center gap-2">
            <RiskBadge level={risk.level} />
            {risk.isStale ? <StaleTag ageDays={risk.glucoseAgeDays} /> : null}
          </span>
        </Field>
        <Field label="สถานะ Remission">
          {PROGRAM_STATUS_LABELS[patient.programStatus]}
          {med ? <span className="font-normal text-slate-700"> ({med})</span> : null}
        </Field>
        <Field label="ข้อมูลน้ำตาลล่าสุด">
          {risk.glucoseDate ? (
            <>
              {formatThaiDate(risk.glucoseDate)}
              {risk.glucoseAgeDays !== null ? <span className="font-normal text-slate-700"> ({formatAgo(risk.glucoseAgeDays)})</span> : null}
            </>
          ) : (
            "ยังไม่มีข้อมูล"
          )}
        </Field>
        <Field label="Alert ที่ยังไม่รับทราบ">
          {openAlertCount > 0 ? <span className="text-[#991b1b]">{openAlertCount} รายการ</span> : "ไม่มี"}
        </Field>
      </dl>

      <div className={`rounded-lg border p-4 text-sm leading-relaxed ${risk.level ? REASON_BOX[risk.level] : "border-slate-200 bg-slate-50 text-slate-800"}`}>
        <h2 className="font-semibold">ทำไมจึงได้ระดับนี้</h2>
        {risk.level === null ? (
          <p className="mt-1">ยังไม่มีข้อมูลน้ำตาลหรือความดันสำหรับประเมินระดับ</p>
        ) : risk.reasons.length === 0 ? (
          <p className="mt-1">ไม่มีรายละเอียดเหตุผลที่บันทึกไว้</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {risk.reasons.map((r) => (
              <li key={`${r.code}:${r.sourceId}`}>{r.message}</li>
            ))}
          </ul>
        )}
        {risk.source === "OVERRIDE" ? (
          <p className="mt-2 font-medium">แพทย์ปรับระดับเอง{risk.overrideReason ? `: ${risk.overrideReason}` : ""}</p>
        ) : null}
      </div>
    </section>
  );
}
