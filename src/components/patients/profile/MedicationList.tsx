import Link from "next/link";
import { PRIMARY_BUTTON } from "@/components/forms/fields";
import StopMedicationButton from "@/components/records/StopMedicationButton";
import VoidRecordButton from "@/components/records/VoidRecordButton";
import VoidedNote from "@/components/records/VoidedNote";
import type { MedicationRow } from "@/lib/data/medications";
import { formatThaiDate } from "@/lib/format";
import { medicationStatus } from "@/lib/record-forms";

type Props = { patientId: string; rows: MedicationRow[]; today: string; canManage: boolean };

/** แท็บยา: เงื่อนไขการหยุดยาของ Remission คำนวณจากรายการที่นับเป็นยาเบาหวานและยังไม่ถูกยกเลิก */
export default function MedicationList({ patientId, rows, today, canManage }: Props) {
  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex justify-end">
          <Link href={`/patients/${patientId}/medications/new`} className={`${PRIMARY_BUTTON} w-full md:w-auto`}>+ เพิ่มยา</Link>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">ยังไม่มีประวัติการใช้ยา</div>
      ) : (
        <ul className="space-y-3" aria-label="ประวัติการใช้ยา">
          {rows.map((row) => {
            const active = medicationStatus(row, today) === "ACTIVE";
            return (
              <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className={`font-semibold ${row.voided ? "text-slate-600 line-through" : "text-slate-900"}`}>{row.drugName}</p>
                    <p className="mt-0.5 text-sm text-slate-700">
                      {row.isDiabetesDrug ? "ยาเบาหวาน" : "ไม่ใช่ยาเบาหวาน"} · เริ่ม {formatThaiDate(row.startDate)} ·{" "}
                      {row.endDate ? `หยุด ${formatThaiDate(row.endDate)}` : "ยังใช้อยู่"}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-x-4">
                      {!row.voided && active && row.endDate === null ? <StopMedicationButton id={row.id} drugName={row.drugName} startDate={row.startDate} today={today} /> : null}
                      <VoidRecordButton kind="medication" id={row.id} summary={`${row.drugName} · เริ่ม ${formatThaiDate(row.startDate)}`} voided={row.voided !== null} />
                    </div>
                  ) : null}
                </div>
                {row.note ? <p className="mt-1 text-sm text-slate-800">หมายเหตุ: {row.note}</p> : null}
                {row.voided ? <VoidedNote voided={row.voided} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
