import { LAB_BAND_LABELS, LAB_BANDS, type DashboardStats, type LabBandKey, type LabBandSummary } from "@/lib/dashboard-stats";
import Panel from "./Panel";
import SegmentBar, { Swatch, type Segment } from "./SegmentBar";

const BAND_STYLES: { key: LabBandKey; color: string; ink: Segment["ink"] }[] = [
  { key: "NORMAL", color: "#15803d", ink: "light" },
  { key: "RISK", color: "#d97706", ink: "dark" },
  { key: "DIABETES", color: "#991b1b", ink: "light" },
];

function BandGroup({ title, summary, ranges }: { title: string; summary: LabBandSummary; ranges: Record<LabBandKey, string> }) {
  const segments: Segment[] = BAND_STYLES.map((b) => ({ ...b, label: LAB_BAND_LABELS[b.key], count: summary.counts[b.key] }));
  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[15px] font-semibold text-slate-900">{title}</span>
        <span className="text-[12.5px] text-slate-600">มีผล {summary.tested} ราย, ไม่มีผล {summary.untested} ราย</span>
      </p>
      <SegmentBar segments={segments} label={`ช่วงค่า ${title}`} />
      <ul className="flex flex-col gap-1">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[13px]">
            <Swatch color={s.color} />
            <span className="min-w-0 flex-1 text-slate-700">{s.label} {ranges[s.key as LabBandKey]}</span>
            <span className="font-semibold tabular-nums text-slate-900">{s.count} ราย</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LabBandsPanel({ bands }: { bands: DashboardStats["bands"] }) {
  return (
    <Panel title="ผลตรวจล่าสุดตามช่วงค่า" subtitle="ใช้ผลล่าสุดของผู้ป่วยแต่ละคน ไม่ใช่เกณฑ์ Remission">
      <BandGroup title="HbA1c" summary={bands.hba1c} ranges={LAB_BANDS.hba1c.ranges} />
      <BandGroup title="FBS" summary={bands.fbs} ranges={LAB_BANDS.fbs.ranges} />
      <p className="text-[12.5px] leading-snug text-slate-600">เส้นแบ่งปกติของ HbA1c รอแพทย์ยืนยัน</p>
    </Panel>
  );
}
