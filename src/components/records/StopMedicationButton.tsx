"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { stopMedicationAction } from "@/app/(main)/patients/actions";
import ActionDialog from "@/components/forms/ActionDialog";
import { useSaveToast } from "@/components/forms/SaveToast";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, TextField } from "@/components/forms/fields";

type Props = { id: string; drugName: string; startDate: string; today: string };

/** บันทึกวันที่หยุดยา (วันแรกที่ไม่ได้ใช้ยาแล้ว ใช้เริ่มนับวันหยุดยาของ Remission) */
export default function StopMedicationButton({ id, drugName, startDate, today }: Props) {
  const router = useRouter();
  const showSaved = useSaveToast();
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await stopMedicationAction({ id, endDate });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      showSaved({ title: "บันทึกการหยุดยาแล้ว", detail: drugName });
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
        บันทึกการหยุดยา
      </button>
      <ActionDialog open={open} title={`บันทึกการหยุดยา ${drugName}`} busy={saving} onClose={() => { setOpen(false); setError(null); }}>
        <form onSubmit={submit} className="space-y-4">
          <TextField
            name={`stop-date-${id}`} label="วันที่หยุดยา" type="date" required min={startDate} max={today} value={endDate} disabled={saving}
            hint="วันแรกที่ผู้ป่วยไม่ได้ใช้ยานี้แล้ว" onChange={(e) => setEndDate(e.target.value)}
          />
          <FormError message={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={saving} onClick={() => { setOpen(false); setError(null); }} className={SECONDARY_BUTTON}>กลับ</button>
            <button type="submit" disabled={saving} aria-busy={saving} className={PRIMARY_BUTTON}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
          </div>
        </form>
      </ActionDialog>
    </>
  );
}
