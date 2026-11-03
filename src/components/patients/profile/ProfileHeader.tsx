import Link from "next/link";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/forms/fields";
import RiskBadge, { StaleTag } from "@/components/patients/RiskBadge";
import RemissionPanel, { remissionStatusLabel } from "@/components/patients/profile/RemissionPanel";
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
 * หมายเหตุ: ยังไม่มีปุ่ม "ปรับระดับความเสี่ยง" โดยตั้งใจ (เพิ่มพร้อมฟอร์ม Override)
 */
export default function ProfileHeader({ summary, canManage, canConfirmNoDrug }: { summary: PatientSummary; canManage: boolean; canConfirmNoDrug: boolean }) {
  const { patient, risk, remission, noDrugConfirmation, openAlertCount, ruleSetMissing } = summary;
  const med = medicationNote(remission);
  const subtitle = [
    `HN ${patient.hn}`,
    patient.gender ? `เพศ${GENDER_LABELS[patient.gender]}` : null,
    patient.ageYears !== null ? `อายุ ${patient.ageYears} ปี` : null,
    patient.programStartDate ? `เริ่มโปรแกรม ${formatThaiDate(patient.programStartDate)}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="patient-name" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 id="patient-name" className="text-xl font-semibold text-slate-900 md:text-2xl">{patient.fullName}</h1>
          <p className="mt-1 text-sm text-slate-700">{subtitle}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          {canManage ? <Link href={`/patients/${patient.id}/edit`} className={SECONDARY_BUTTON}>แก้ไขข้อมูล</Link> : null}
          <Link href={`/patients/${patient.id}/labs/new`} className={SECONDARY_BUTTON}>+ บันทึกผลตรวจ</Link>
          <Link href={`/patients/${patient.id}/glucose`} className={PRIMARY_BUTTON}>+ บันทึกน้ำตาล</Link>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-5">
        <Field label="ระดับความเสี่ยงปัจจุบัน">
          <span className="flex flex-wrap items-center gap-2">
            <RiskBadge level={risk.level} />
            {risk.isStale ? <StaleTag ageDays={risk.glucoseAgeDays} /> : null}
          </span>
        </Field>
        <Field label="สถานะ Remission">
          {remissionStatusLabel(remission.status, ruleSetMissing)}
          {med ? <span className="font-normal text-slate-700"> ({med})</span> : null}
        </Field>
        <Field label="สถานะโปรแกรม">{PROGRAM_STATUS_LABELS[patient.programStatus]}</Field>
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

      <RemissionPanel patientId={patient.id} remission={remission} confirmation={noDrugConfirmation} canConfirm={canConfirmNoDrug} ruleSetMissing={ruleSetMissing} />
    </section>
  );
}
