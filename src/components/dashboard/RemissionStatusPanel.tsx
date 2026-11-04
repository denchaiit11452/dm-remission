import type { DashboardStats, RemissionPhase } from "@/lib/dashboard-stats";
import Panel from "./Panel";
import SegmentBar, { percentOf, Swatch, type Segment } from "./SegmentBar";

const META: { key: RemissionPhase; label: string; color: string; ink: Segment["ink"] }[] = [
  { key: "NOT_IN_REMISSION", label: "ยังไม่เข้าเกณฑ์", color: "#64748b", ink: "light" },
  { key: "REMISSION", label: "เข้าเกณฑ์ภาวะสงบ", color: "#115e59", ink: "light" },
  { key: "LOST_REMISSION", label: "หลุดจากภาวะสงบ", color: "#ea580c", ink: "dark" },
  { key: "INSUFFICIENT_DATA", label: "ข้อมูลยังไม่พอประเมิน", color: "#94a3b8", ink: "dark" },
];

export default function RemissionStatusPanel({ remission, total }: { remission: DashboardStats["remission"]; total: number }) {
  if (!remission.assessable) {
    return (
      <Panel title="สถานะ Remission" subtitle="แยกจากระดับความเสี่ยง">
        <p className="text-sm leading-relaxed text-slate-700">ยังไม่มีชุดเกณฑ์ที่ใช้งาน ระบบจึงยังไม่ประเมินสถานะนี้</p>
      </Panel>
    );
  }

  const segments: Segment[] = META.map((m) => ({ ...m, count: remission.counts[m.key] }));
  return (
    <Panel title="สถานะ Remission" subtitle={`แยกจากระดับความเสี่ยง ผู้ป่วย ${total} ราย`}>
      <SegmentBar segments={segments} label="สัดส่วนสถานะ Remission" />
      <ul className="flex flex-1 flex-col">
        {segments.map((s) => (
          <li key={s.key} className="flex flex-1 items-center gap-2.5 border-t border-slate-200 py-2.5 text-sm">
            <Swatch color={s.color} />
            <span className="min-w-0 flex-1 text-slate-700">{s.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">{s.count} ราย</span>
            <span className="w-12 text-right text-[13px] tabular-nums text-slate-600">{percentOf(s.count, total).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      <p className="text-[12.5px] leading-snug text-slate-600">หลุดจากภาวะสงบ = เคยเข้าเกณฑ์ แล้วตอนนี้ไม่เข้าเกณฑ์</p>
    </Panel>
  );
}
