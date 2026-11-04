import { LAB_BAND_LABELS, LAB_BANDS, type DashboardStats, type LabBandKey, type LabBandSummary } from "@/lib/dashboard-stats";
import ArrivalGroup from "./ArrivalGroup";
import Panel from "./Panel";
import SegmentBar, { Swatch, type Segment } from "./SegmentBar";

const BAND_STYLES: { key: LabBandKey; color: string; ink: Segment["ink"] }[] = [
  { key: "NORMAL", color: "#15803d", ink: "light" },
  { key: "RISK", color: "#d97706", ink: "dark" },
  { key: "DIABETES", color: "#991b1b", ink: "light" },
];

/** สามคอลัมน์เรียงตรงกันทุกกลุ่ม จึงเทียบ HbA1c กับ FBS ในแนวตั้งได้ */
function BandGroup({ title, summary, ranges }: { title: string; summary: LabBandSummary; ranges: Record<LabBandKey, string> }) {
  const segments: Segment[] = BAND_STYLES.map((b) => ({ ...b, label: LAB_BAND_LABELS[b.key], count: summary.counts[b.key] }));
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[15px] font-semibold text-slate-900">{title}</span>
        <span className="text-[12.5px] text-slate-600">มีผล {summary.tested} ราย, ไม่มีผล {summary.untested} ราย</span>
      </p>
      <SegmentBar segments={segments} label={`ช่วงค่า ${title}`} />
      <ul className="grid grid-cols-3 gap-2">
        {segments.map((s) => (
          <li key={s.key} className="min-w-0">
            <span className="flex items-center gap-1.5 text-[13px] text-slate-700"><Swatch color={s.color} />{s.label}</span>
            <span className={`mt-0.5 block text-[17px] leading-snug tabular-nums ${s.count === 0 ? "font-medium text-slate-500" : "font-semibold text-slate-900"}`}>
              {s.count}<span className="ml-1 text-[12.5px] font-normal text-slate-600">ราย</span>
            </span>
            <span className="block text-[12.5px] leading-snug text-slate-600">{ranges[s.key as LabBandKey]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LabBandsPanel({ bands }: { bands: DashboardStats["bands"] }) {
  const signature = [bands.hba1c, bands.fbs].map((b) => Object.values(b.counts).join(",")).join("|");
  return (
    <Panel title="ผลตรวจล่าสุดตามช่วงค่า" subtitle="ใช้ผลล่าสุดของผู้ป่วยแต่ละคน ไม่ใช่เกณฑ์ Remission">
      <ArrivalGroup signature={signature} className="flex flex-1 flex-col gap-4">
        <BandGroup title="HbA1c" summary={bands.hba1c} ranges={LAB_BANDS.hba1c.ranges} />
        <div className="border-t border-slate-200 pt-4">
          <BandGroup title="FBS" summary={bands.fbs} ranges={LAB_BANDS.fbs.ranges} />
        </div>
        <p className="mt-auto text-[12.5px] leading-snug text-slate-600">เส้นแบ่งปกติของ HbA1c รอแพทย์ยืนยัน</p>
      </ArrivalGroup>
    </Panel>
  );
}
