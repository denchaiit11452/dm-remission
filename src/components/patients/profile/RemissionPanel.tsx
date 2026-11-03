import NoDrugConfirmButton from "@/components/patients/profile/NoDrugConfirmButton";
import { formatThaiDateTime } from "@/lib/alert-center";
import type { PatientSummary } from "@/lib/data/patients";
import type { RemissionStatus } from "@/lib/remission/remission";

export const REMISSION_STATUS_LABELS: Record<RemissionStatus, string> = {
  REMISSION: "เข้าเกณฑ์ภาวะสงบ",
  NOT_IN_REMISSION: "ยังไม่เข้าเกณฑ์",
  INSUFFICIENT_DATA: "ข้อมูลยังไม่พอประเมิน",
};

type Props = {
  patientId: string;
  remission: PatientSummary["remission"];
  confirmation: PatientSummary["noDrugConfirmation"];
  canConfirm: boolean;
};

/** ผลประเมิน Remission จากเกณฑ์ปัจจุบัน พร้อมเหตุผล และคำยืนยันของแพทย์กรณีผู้ป่วยไม่เคยใช้ยา */
export default function RemissionPanel({ patientId, remission, confirmation, canConfirm }: Props) {
  // ถ้ามีรายการยาเบาหวานในประวัติ คำยืนยันเดิมไม่มีผล ระบบจึงให้ยกเลิกได้แต่ไม่ให้ยืนยันใหม่
  const canAddConfirmation = canConfirm && !confirmation && !remission.hasDiabetesDrugHistory;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900">
      <h2 className="font-semibold">ผลประเมิน Remission: {REMISSION_STATUS_LABELS[remission.status]}</h2>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {remission.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
      {confirmation ? (
        <p className="mt-2">
          แพทย์ยืนยันว่าไม่เคยใช้ยาเบาหวาน{confirmation.reason ? `: ${confirmation.reason}` : ""}
          <span className="text-slate-700"> ({confirmation.byName ?? "ไม่ทราบชื่อผู้ยืนยัน"} · {formatThaiDateTime(confirmation.at)})</span>
          {remission.hasDiabetesDrugHistory ? <span className="font-medium"> คำยืนยันนี้ไม่มีผลเพราะมีรายการยาเบาหวานในประวัติ</span> : null}
        </p>
      ) : null}
      {canConfirm && confirmation ? <NoDrugConfirmButton mode="cancel" patientId={patientId} /> : null}
      {canAddConfirmation ? <NoDrugConfirmButton mode="confirm" patientId={patientId} /> : null}
    </div>
  );
}
