"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { voidGlucoseAction, voidLabAction, voidMedicationAction } from "@/app/(main)/patients/actions";
import ActionDialog from "@/components/forms/ActionDialog";
import { DANGER_BUTTON, FormError, SECONDARY_BUTTON, TextAreaField } from "@/components/forms/fields";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import type { RiskLevel } from "@/lib/risk/types";

type Props = {
  kind: "glucose" | "lab" | "medication";
  id: string;
  /** สรุปรายการที่จะยกเลิก เพื่อให้เห็นว่ากำลังยกเลิกค่าใด */
  summary: string;
  /** ยกเลิกแล้ว = ซ่อนปุ่ม */
  voided: boolean;
};

const ACTIONS = { glucose: voidGlucoseAction, lab: voidLabAction, medication: voidMedicationAction };

const CONSEQUENCES: Record<Props["kind"], string> = {
  glucose: "ระบบจะไม่นำค่านี้มาคำนวณอีก ยกเลิก Alert ที่เกิดจากค่านี้ และประเมินระดับความเสี่ยงใหม่",
  lab: "ระบบจะไม่นำผลนี้มาคำนวณอีก ยกเลิก Alert ที่เกิดจากผลนี้ และประเมินระดับความเสี่ยงใหม่",
  medication: "ระบบจะไม่นำรายการนี้มาประเมินเงื่อนไขการหยุดยาของ Remission อีก",
};

function outcomeText(alertsCancelled: number, levelAfter: RiskLevel | null): string {
  const alerts = alertsCancelled > 0 ? `ยกเลิก Alert ${alertsCancelled} รายการ` : "ไม่มี Alert ที่ต้องยกเลิก";
  const level = levelAfter ? `ระดับปัจจุบัน: ${RISK_LEVEL_LABELS[levelAfter]}` : "ไม่เหลือข้อมูลสำหรับประเมินระดับ";
  return `${alerts} · ${level}`;
}

/**
 * ปุ่มยกเลิกรายการ: ต้องระบุเหตุผล และแสดงผลที่เกิดขึ้น ระบบเก็บค่าเดิมและผู้ยกเลิกไว้
 * แถวที่ยกเลิกแล้วต้องยังแสดงคอมโพเนนต์นี้ (voided) เพราะ Next.js อาจรีเฟรชหน้าทันทีหลัง Server Action
 * เมื่อ session cookie เปลี่ยน ถ้าถอดออกจากแถว กล่องผลลัพธ์จะหายไปก่อนผู้ใช้ได้อ่าน
 */
export default function VoidRecordButton({ kind, id, summary, voided }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await ACTIONS[kind]({ id, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOutcome("alertsCancelled" in result ? outcomeText(result.alertsCancelled, result.levelAfter) : "ยกเลิกรายการแล้ว");
    } catch {
      setError("ยกเลิกรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    setOpen(false);
    setError(null);
    if (outcome) router.refresh();
  }

  return (
    <>
      {voided ? null : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center text-sm font-medium text-[#991b1b] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
          ยกเลิกรายการ
        </button>
      )}
      <ActionDialog open={open} title={outcome ? "ยกเลิกรายการแล้ว" : "ยกเลิกรายการนี้?"} busy={saving} onClose={close}>
        {outcome ? (
          <>
            <p role="status" className="text-sm leading-relaxed text-slate-900">{outcome}</p>
            <div className="flex justify-end">
              <button type="button" onClick={close} className={SECONDARY_BUTTON}>ปิด</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-lg bg-slate-50 p-3 text-[15px] font-medium">{summary}</p>
            <p className="text-sm leading-relaxed text-slate-700">{CONSEQUENCES[kind]} ค่าเดิมยังเก็บไว้ในประวัติ และย้อนกลับไม่ได้</p>
            <TextAreaField
              name={`void-reason-${id}`} label="เหตุผลที่ยกเลิก" required maxLength={500} value={reason} disabled={saving} autoFocus
              placeholder="เช่น กรอกผิดคน กรอกผิดวัน" onChange={(e) => setReason(e.target.value)}
            />
            <FormError message={error} />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={close} className={SECONDARY_BUTTON}>กลับ</button>
              <button type="submit" disabled={saving || reason.trim() === ""} aria-busy={saving} className={DANGER_BUTTON}>
                {saving ? "กำลังบันทึก..." : "ยืนยันยกเลิกรายการ"}
              </button>
            </div>
          </form>
        )}
      </ActionDialog>
    </>
  );
}
