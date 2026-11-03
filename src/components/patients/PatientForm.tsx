"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPatientAction, updatePatientAction } from "@/app/(main)/patients/actions";
import { useSaveToast } from "@/components/forms/SaveToast";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { GENDER_LABELS } from "@/lib/format";
import { DIABETES_TYPE_LABELS, toPatientPayload, type PatientFormValues } from "@/lib/patient-form";

type Props = {
  /** ไม่มี = เพิ่มผู้ป่วยใหม่ */
  patientId?: string;
  initial: PatientFormValues;
  today: string;
  cancelHref: string;
};

export default function PatientForm({ patientId, initial, today, cancelHref }: Props) {
  const router = useRouter();
  const showSaved = useSaveToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(name: string) {
    setError(null);
    setFieldErrors((errors) => {
      const next = { ...errors };
      delete next[name];
      return next;
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget)) as PatientFormValues;
    const payload = toPatientPayload(values);
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = patientId
        ? await updatePatientAction({ ...payload, id: patientId })
        : await createPatientAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setSaving(false);
        return;
      }
      showSaved({ title: patientId ? "บันทึกการแก้ไขข้อมูลผู้ป่วยแล้ว" : "เพิ่มผู้ป่วยแล้ว", detail: `HN ${values.hn}` });
      router.push(`/patients/${result.id}`); // คงสถานะกำลังบันทึกไว้จนเปลี่ยนหน้า กันกดซ้ำ
    } catch {
      setError("บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} onChange={(e) => clearFieldError(e.target.name)} noValidate className="space-y-5">
      <section aria-labelledby="pf-identity" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <h2 id="pf-identity" className="text-base font-semibold text-slate-900">ข้อมูลผู้ป่วย</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="hn" label="HN" required maxLength={30} defaultValue={initial.hn} error={fieldErrors.hn} autoComplete="off" />
          <TextField name="prefix" label="คำนำหน้า" maxLength={30} defaultValue={initial.prefix} error={fieldErrors.prefix} autoComplete="off" />
          <TextField name="firstName" label="ชื่อ" required maxLength={100} defaultValue={initial.firstName} error={fieldErrors.firstName} autoComplete="off" />
          <TextField name="lastName" label="นามสกุล" required maxLength={100} defaultValue={initial.lastName} error={fieldErrors.lastName} autoComplete="off" />
          <SelectField name="gender" label="เพศ" defaultValue={initial.gender} error={fieldErrors.gender}>
            <option value="">ไม่ระบุ</option>
            {Object.entries(GENDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField>
          <TextField name="birthDate" label="วันเกิด" type="date" max={today} defaultValue={initial.birthDate} error={fieldErrors.birthDate} />
        </div>
      </section>

      <section aria-labelledby="pf-contact" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <h2 id="pf-contact" className="text-base font-semibold text-slate-900">การติดต่อ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="phone" label="เบอร์โทรศัพท์" type="tel" maxLength={30} defaultValue={initial.phone} error={fieldErrors.phone} autoComplete="off" />
          <TextField name="emergencyContactName" label="ชื่อผู้ติดต่อฉุกเฉิน" maxLength={200} defaultValue={initial.emergencyContactName} error={fieldErrors.emergencyContactName} autoComplete="off" />
          <TextField name="emergencyContactPhone" label="เบอร์ผู้ติดต่อฉุกเฉิน" type="tel" maxLength={30} defaultValue={initial.emergencyContactPhone} error={fieldErrors.emergencyContactPhone} autoComplete="off" />
        </div>
        <TextAreaField name="address" label="ที่อยู่" maxLength={500} defaultValue={initial.address} error={fieldErrors.address} />
      </section>

      <section aria-labelledby="pf-program" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <h2 id="pf-program" className="text-base font-semibold text-slate-900">เบาหวานและโปรแกรม</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField name="diabetesType" label="ชนิดเบาหวาน" defaultValue={initial.diabetesType} error={fieldErrors.diabetesType}>
            {Object.entries(DIABETES_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectField>
          <TextField name="diagnosedAt" label="วันที่วินิจฉัย" type="date" max={today} defaultValue={initial.diagnosedAt} error={fieldErrors.diagnosedAt} />
          <TextField name="programStartDate" label="วันที่เริ่มโปรแกรม" type="date" max={today} defaultValue={initial.programStartDate} error={fieldErrors.programStartDate} />
        </div>
        <TextAreaField name="notes" label="หมายเหตุ" maxLength={2000} defaultValue={initial.notes} error={fieldErrors.notes} />
      </section>

      <FormError message={error} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className={SECONDARY_BUTTON}>ยกเลิก</Link>
        <button type="submit" disabled={saving} aria-busy={saving} className={PRIMARY_BUTTON}>
          {saving ? "กำลังบันทึก..." : patientId ? "บันทึกการแก้ไข" : "เพิ่มผู้ป่วย"}
        </button>
      </div>
    </form>
  );
}
