"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelNoDrugConfirmationAction, confirmNoDrugAction } from "@/app/(main)/patients/actions";
import ActionDialog from "@/components/forms/ActionDialog";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK, TextAreaField } from "@/components/forms/fields";

type Mode = "confirm" | "cancel";
type Props = { mode: Mode; patientId: string };

const COPY: Record<Mode, { open: string; title: string; detail: string; label: string; submit: string }> = {
  confirm: {
    open: "ยืนยันว่าไม่เคยใช้ยาเบาหวาน",
    title: "ยืนยันว่าผู้ป่วยไม่เคยใช้ยาเบาหวาน?",
    detail: "ระบบจะถือว่าผ่านเงื่อนไขเรื่องยา แต่ยังต้องมีผล HbA1c ต่ำกว่าเกณฑ์จึงจะเข้าเกณฑ์ภาวะสงบ ชื่อของคุณและเหตุผลจะถูกบันทึกไว้",
    label: "เหตุผล",
    submit: "บันทึกคำยืนยัน",
  },
  cancel: {
    open: "ยกเลิกคำยืนยัน",
    title: "ยกเลิกคำยืนยันนี้?",
    detail: "ระบบจะกลับไปรอคำยืนยันของแพทย์ คำยืนยันเดิมและเหตุผลยังเก็บไว้ในประวัติการแก้ไข",
    label: "เหตุผลที่ยกเลิก",
    submit: "ยืนยันยกเลิก",
  },
};

/** ปุ่มและกล่องบันทึกคำยืนยันของแพทย์ การตรวจสิทธิ์จริงอยู่ที่ฝั่ง server */
export default function NoDrugConfirmButton({ mode, patientId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const action = mode === "confirm" ? confirmNoDrugAction : cancelNoDrugConfirmationAction;
      const result = await action({ patientId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mt-1">
        <button type="button" onClick={() => setOpen(true)} className={TEXT_LINK}>{copy.open}</button>
      </div>
      <ActionDialog open={open} title={copy.title} busy={saving} onClose={() => { setOpen(false); setError(null); }}>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-700">{copy.detail}</p>
          <TextAreaField
            name={`no-drug-reason-${mode}`} label={copy.label} required maxLength={500} value={reason} disabled={saving} autoFocus
            onChange={(e) => setReason(e.target.value)}
          />
          <FormError message={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={saving} onClick={() => { setOpen(false); setError(null); }} className={SECONDARY_BUTTON}>กลับ</button>
            <button type="submit" disabled={saving || reason.trim() === ""} aria-busy={saving} className={PRIMARY_BUTTON}>
              {saving ? "กำลังบันทึก..." : copy.submit}
            </button>
          </div>
        </form>
      </ActionDialog>
    </>
  );
}
