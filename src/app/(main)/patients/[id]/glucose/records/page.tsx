import Link from "next/link";
import { notFound } from "next/navigation";
import { PRIMARY_BUTTON, TEXT_LINK } from "@/components/forms/fields";
import VoidRecordButton from "@/components/records/VoidRecordButton";
import VoidedNote from "@/components/records/VoidedNote";
import { formatThaiDateTime } from "@/lib/alert-center";
import { canManageRecords } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { listGlucoseRecordsOfDay, type GlucoseRecordRow } from "@/lib/data/history";
import { getPatientSummary } from "@/lib/data/patients";
import { formatGlucoseValue, formatThaiDate, periodLabel } from "@/lib/format";

export const metadata = { title: "รายการค่าน้ำตาล | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function isValidDateParam(value: string | undefined, today: string): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && value <= today;
}

function valueText(row: GlucoseRecordRow): string {
  const v = formatGlucoseValue(row.valueMgDl, row.meterFlag);
  return v.unit ? `${v.text} ${v.unit}` : v.text;
}

// ทุกรายการของวันที่วัด รวมที่ยกเลิกแล้ว ใช้ตรวจสอบย้อนหลังและยกเลิกค่าที่กรอกผิด (ปุ่มยกเลิกเฉพาะแพทย์และผู้ดูแลระบบ)
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireUser();
  const canManage = canManageRecords(user.role);
  const { id } = await params;
  const raw = await searchParams;
  const summary = await getPatientSummary(id);
  if (!summary) notFound();

  const today = todayInBangkok();
  const wanted = Array.isArray(raw.date) ? raw.date[0] : raw.date;
  const date = isValidDateParam(wanted, today) ? wanted : (summary.risk.glucoseDate ?? today);
  const rows = await listGlucoseRecordsOfDay(id, date);
  const { patient } = summary;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/patients/${id}?tab=history`} className={TEXT_LINK}>← กลับไปประวัติรายวัน</Link>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">รายการค่าน้ำตาล {formatThaiDate(date)}</h1>
        <p className="mt-1 text-[15px] font-medium text-slate-900">{patient.fullName} · HN {patient.hn}</p>
      </header>

      {rows.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">
          <p>ไม่มีรายการของวันนี้</p>
          <Link href={`/patients/${id}/glucose?date=${date}`} className={PRIMARY_BUTTON}>+ เพิ่มค่าของวันนี้</Link>
        </div>
      ) : (
        <ul className="space-y-3" aria-label={`รายการค่าน้ำตาล ${formatThaiDate(date)}`}>
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{periodLabel(row.period)}{row.measuredTime ? ` · ${row.measuredTime} น.` : ""}</p>
                  <p className={`text-lg font-semibold ${row.voided ? "text-slate-600 line-through" : "text-slate-900"}`}>{valueText(row)}</p>
                </div>
                {canManage ? <VoidRecordButton kind="glucose" id={row.id} summary={`${formatThaiDate(date)} · ${periodLabel(row.period)} · ${valueText(row)}`} voided={row.voided !== null} /> : null}
              </div>
              <p className="mt-1 text-xs text-slate-700">กรอกโดย {row.createdByName} · {formatThaiDateTime(row.createdAt)}</p>
              {row.note ? <p className="mt-1 text-sm text-slate-800">หมายเหตุ: {row.note}</p> : null}
              {row.voided ? <VoidedNote voided={row.voided} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
