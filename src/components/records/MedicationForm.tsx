"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveMedicationAction } from "@/app/(main)/patients/actions";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, TextAreaField, TextField } from "@/components/forms/fields";

type Props = { patientId: string; today: string };

export default function MedicationForm({ patientId, today }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const backHref = `/patients/${patientId}?tab=medications`;

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
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await saveMedicationAction({
        patientId,
        drugName: text("drugName"),
        isDiabetesDrug: text("isDiabetesDrug") === "yes",
        startDate: text("startDate"),
        endDate: text("endDate") || null,
        note: text("note") || null,
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setSaving(false);
        return;
      }
      router.push(backHref); // คงสถานะกำลังบันทึกไว้จนเปลี่ยนหน้า กันกดซ้ำ
    } catch {
      setError("บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} onChange={(e) => clearFieldError(e.target.name)} noValidate className="space-y-5">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <TextField name="drugName" label="ชื่อยา" required maxLength={200} error={fieldErrors.drugName} autoComplete="off" />
        <fieldset>
          <legend className="text-sm font-medium text-slate-900">นับเป็นยาเบาหวานในเงื่อนไข Remission หรือไม่</legend>
          <div className="mt-1 flex flex-wrap gap-x-6">
            <label className="inline-flex min-h-11 items-center gap-2 text-[15px]"><input type="radio" name="isDiabetesDrug" value="yes" defaultChecked className="size-5" />เป็นยาเบาหวาน</label>
            <label className="inline-flex min-h-11 items-center gap-2 text-[15px]"><input type="radio" name="isDiabetesDrug" value="no" className="size-5" />ไม่ใช่ยาเบาหวาน</label>
          </div>
        </fieldset>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="startDate" label="วันที่เริ่มยา" type="date" required max={today} error={fieldErrors.startDate} />
          <TextField name="endDate" label="วันที่หยุดยา" type="date" max={today} error={fieldErrors.endDate} hint="เว้นว่างถ้ายังใช้ยาอยู่ · วันแรกที่ผู้ป่วยไม่ได้ใช้ยานี้แล้ว" />
        </div>
        <TextAreaField name="note" label="หมายเหตุ" maxLength={500} error={fieldErrors.note} />
      </section>

      <FormError message={error} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={backHref} className={SECONDARY_BUTTON}>ยกเลิก</Link>
        <button type="submit" disabled={saving} aria-busy={saving} className={PRIMARY_BUTTON}>{saving ? "กำลังบันทึก..." : "บันทึกยา"}</button>
      </div>
    </form>
  );
}
