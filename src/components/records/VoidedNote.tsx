import { formatThaiDateTime } from "@/lib/alert-center";

type Props = { voided: { at: string; byName: string | null; reason: string | null } };

/** ข้อความกำกับรายการที่ยกเลิกแล้ว (มีข้อความบอก ไม่ใช้สีหรือขีดฆ่าอย่างเดียว) */
export default function VoidedNote({ voided }: Props) {
  return (
    <p className="mt-1 text-sm text-slate-800">
      <span className="mr-2 inline-flex rounded-md border border-slate-500 bg-white px-2 py-0.5 text-xs font-medium">ยกเลิกแล้ว</span>
      {voided.reason ?? "ไม่ระบุเหตุผล"} · {voided.byName ?? "ไม่ทราบผู้ยกเลิก"} · {formatThaiDateTime(voided.at)}
    </p>
  );
}
