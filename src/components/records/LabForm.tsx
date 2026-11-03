"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { saveLabAction } from "@/app/(main)/patients/actions";
import ActionDialog from "@/components/forms/ActionDialog";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, TextField } from "@/components/forms/fields";
import type { SaveLabData } from "@/lib/data/labs";
import { computeBmi } from "@/lib/data/view";
import { formatThaiDate } from "@/lib/format";
import { parseOptionalNumber, toLabPayload, type LabFormValues } from "@/lib/record-forms";
import { assessBloodPressure } from "@/lib/risk/blood-pressure";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import type { RiskRules } from "@/lib/risk/types";

type Props = {
  patient: { id: string; hn: string; fullName: string };
  rules: RiskRules;
  today: string;
};

export default function LabForm({ patient, rules, today }: Props) {
  const router = useRouter();
  const initialValues: LabFormValues = { recordedDate: today, hba1c: "", fbs: "", weightKg: "", heightCm: "", sbp: "", dbp: "", note: "" };
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SaveLabData | null>(null);

  const bmi = useMemo(() => {
    const weight = parseOptionalNumber(values.weightKg);
    const height = parseOptionalNumber(values.heightCm);
    return weight !== null && height !== null && Number.isFinite(weight) && Number.isFinite(height) ? computeBmi(weight, height) : null;
  }, [values.weightKg, values.heightCm]);

  const criticalBp = useMemo(() => {
    const sbp = parseOptionalNumber(values.sbp);
    const dbp = parseOptionalNumber(values.dbp);
    if (sbp === null || dbp === null || !Number.isFinite(sbp) || !Number.isFinite(dbp)) return null;
    return assessBloodPressure({ id: "", recordedDate: values.recordedDate, sbp, dbp, isVoided: false }, rules);
  }, [values.sbp, values.dbp, values.recordedDate, rules]);

  const field = (name: keyof LabFormValues) => ({
    name,
    value: values[name],
    error: fieldErrors[name],
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      setFieldErrors({});
      setError(null);
    },
  });

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveLabAction(toLabPayload(patient.id, values));
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSaved(result.data);
      router.refresh(); // ปรับตัวเลข Alert บนเมนู
    } catch {
      setError("บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (criticalBp) setConfirming(true); // ค่าวิกฤตต้องยืนยันก่อนเสมอ
    else void save();
  }

  if (saved) {
    return (
      <section role="status" className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-5 text-green-950">
        <h2 className="text-base font-semibold">บันทึกผลตรวจของ {patient.fullName} แล้ว</h2>
        <p className="text-sm">
          {saved.alertsCreated > 0 ? `สร้าง Alert ${saved.alertsCreated} รายการ` : "ไม่มี Alert ใหม่"} ·{" "}
          {saved.levelAfter ? `ระดับปัจจุบัน: ${RISK_LEVEL_LABELS[saved.levelAfter]}` : "ยังไม่มีข้อมูลสำหรับประเมินระดับ"}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => { setSaved(null); setValues(initialValues); }} className={SECONDARY_BUTTON}>บันทึกผลตรวจเพิ่ม</button>
          <Link href={`/patients/${patient.id}?tab=labs`} className={PRIMARY_BUTTON}>ดูผลตรวจของผู้ป่วย</Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="max-w-xs">
          <TextField {...field("recordedDate")} label="วันที่ตรวจ" type="date" required max={today} />
        </div>
        <p className="text-sm text-slate-700">กรอกเฉพาะรายการที่ตรวจในครั้งนี้ อย่างน้อย 1 รายการ</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField {...field("hba1c")} label="HbA1c (%)" inputMode="decimal" />
          <TextField {...field("fbs")} label="FBS (mg/dL)" inputMode="numeric" />
          <TextField {...field("weightKg")} label="น้ำหนัก (กก.)" inputMode="decimal" />
          <TextField {...field("heightCm")} label="ส่วนสูง (ซม.)" inputMode="decimal" />
          <TextField {...field("sbp")} label="ความดันตัวบน (mmHg)" inputMode="numeric" />
          <TextField {...field("dbp")} label="ความดันตัวล่าง (mmHg)" inputMode="numeric" />
          <div>
            <p className="text-sm font-medium text-slate-900">BMI</p>
            <p className="mt-1 flex min-h-11 items-center text-base text-slate-900">{bmi ?? "คำนวณเมื่อกรอกน้ำหนักและส่วนสูง"}</p>
          </div>
        </div>
        <TextField {...field("note")} label="หมายเหตุ" maxLength={500} />
      </section>

      {criticalBp ? (
        <div role="note" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-950">
          ⚠ {criticalBp.message} ระบบจะสร้าง Alert ทันทีหลังบันทึก และจะขอให้ยืนยันก่อนบันทึก
        </div>
      ) : null}

      <FormError message={error} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={`/patients/${patient.id}?tab=labs`} className={SECONDARY_BUTTON}>ยกเลิก</Link>
        <button type="submit" disabled={saving} aria-busy={saving} className={PRIMARY_BUTTON}>{saving ? "กำลังบันทึก..." : "บันทึกผลตรวจ"}</button>
      </div>

      <ActionDialog open={confirming} title="ความดันถึงเกณฑ์วิกฤต บันทึกหรือไม่?" busy={saving} onClose={() => setConfirming(false)}>
        <p className="text-sm text-slate-700">{patient.fullName} · HN {patient.hn} · ตรวจ {formatThaiDate(values.recordedDate)}</p>
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-950">
          {criticalBp?.message} ระบบจะสร้าง Alert ทันที ตรวจตัวเลขก่อนยืนยัน
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={saving} onClick={() => setConfirming(false)} className={SECONDARY_BUTTON}>กลับไปแก้ไข</button>
          <button type="button" disabled={saving} aria-busy={saving} onClick={() => void save()} className={PRIMARY_BUTTON}>{saving ? "กำลังบันทึก..." : "บันทึกและสร้าง Alert"}</button>
        </div>
      </ActionDialog>
    </form>
  );
}
