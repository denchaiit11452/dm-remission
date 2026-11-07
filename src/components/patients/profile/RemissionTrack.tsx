import type { CSSProperties, ReactNode } from "react";
import { remissionStatusLabel } from "@/components/patients/profile/RemissionPanel";
import { LAB_BANDS, LAB_BAND_LABELS } from "@/lib/dashboard-stats";
import { formatThaiDate } from "@/lib/format";
import { percentOn, type Hba1cTrack, type MedicationTrack, type RemissionTrack as Track, type TimingTrack } from "@/lib/patient-overview";
import { formatPercent, type RemissionStatus } from "@/lib/remission/remission";

type Mark = "met" | "unmet" | "waiting";

/** เครื่องหมายของแต่ละเงื่อนไข มีข้อความกำกับข้างเสมอ ไม่สื่อด้วยรูปอย่างเดียว */
function ConditionMark({ mark, delayMs }: { mark: Mark; delayMs: number }) {
  if (mark === "met") {
    return (
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-white">
        <svg viewBox="0 0 16 16" className="pp-check size-4" style={{ "--pp-check-delay": `${delayMs}ms` } as CSSProperties}>
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (mark === "unmet") {
    return (
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-slate-400 text-slate-500">
        <svg viewBox="0 0 16 16" className="size-3.5"><path d="M4 8h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </span>
    );
  }
  return <span aria-hidden="true" className="size-7 shrink-0 rounded-full border-2 border-dashed border-slate-400" />;
}

const MARK_WORDS: Record<Mark, string> = { met: "ผ่าน", unmet: "ยังไม่ผ่าน", waiting: "รอข้อมูล" };

function Condition({ title, mark, status, delayMs, children }: { title: string; mark: Mark; status: string; delayMs: number; children?: ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-2 py-4 first:pt-0 last:pb-0">
      <ConditionMark mark={mark} delayMs={delayMs} />
      <div className="flex min-h-7 flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
        <p className="text-[14px] tabular-nums text-slate-700">
          <span className="sr-only">{MARK_WORDS[mark]}: </span>
          {status}
        </p>
      </div>
      {children ? <div className="col-start-2 min-w-0">{children}</div> : null}
    </li>
  );
}

/** เส้นนับวันหยุดยา จากวันหยุดยาถึงวันครบกำหนด หมุดคือวันนี้ */
function MedicationRail({ track }: { track: Extract<MedicationTrack, { kind: "COUNTING" }> }) {
  const percent = track.progress * 100;
  const ticks = Array.from({ length: Math.floor(track.required / 10) + 1 }, (_, i) => i * 10).filter((d) => d <= track.required);
  return (
    <div>
      <div className="relative h-[34px]">
        {/* ขีดทุก 10 วัน เหมือนสเกลบนแผ่นบันทึก */}
        <div aria-hidden="true" className="absolute inset-x-0 top-[22px] h-2 rounded-full bg-slate-100" />
        {ticks.map((d) => (
          <span key={d} aria-hidden="true" className="absolute top-[18px] h-1 w-px bg-slate-300" style={{ left: `${(d / track.required) * 100}%` }} />
        ))}
        <div aria-hidden="true" className="pp-track-fill absolute left-0 top-[22px] h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
        <span
          aria-hidden="true"
          className="pp-track-marker absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${percent}%` }}
        >
          <span className="rounded-[4px] bg-primary px-1.5 text-[12px] font-medium leading-[18px] text-white tabular-nums whitespace-nowrap">
            {track.met ? `${track.days} วัน` : "วันนี้"}
          </span>
          <span className="mt-[3px] block size-3 rounded-full border-2 border-white bg-primary shadow-[0_0_0_1px_var(--color-primary)]" />
        </span>
        {/* ธงปลายทาง */}
        <span aria-hidden="true" className={`pp-track-goal absolute right-0 top-[14px] h-6 w-[3px] rounded-full ${track.met ? "bg-primary" : "bg-slate-400"}`} />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-[12.5px] text-slate-600">
        <span>หยุดยา {formatThaiDate(track.stopDate)}</span>
        <span className="text-right">{track.met ? "ครบกำหนดแล้ว" : `ครบ ${track.required} วัน ${formatThaiDate(track.completeOn)}`}</span>
      </div>
    </div>
  );
}

const BAND_FILL = { NORMAL: "bg-risk-well-controlled", RISK: "bg-risk-uncontrolled", DIABETES: "bg-risk-critical" } as const;

/** ไม้บรรทัด HbA1c: แถบช่วงค่าตาม CLAUDE.md, ขีดเกณฑ์ Remission ของโรงพยาบาล และหมุดผลล่าสุด */
function Hba1cRuler({ track }: { track: Hba1cTrack }) {
  const { scale } = track;
  const band = LAB_BANDS.hba1c;
  const normalEnd = percentOn(band.normalBelow, scale);
  const riskEnd = percentOn(band.diabetesFrom, scale);
  const valueAt = percentOn(track.value, scale);
  const thresholdAt = percentOn(track.threshold, scale);
  const ticks = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
  const segments = [
    { key: "NORMAL" as const, from: 0, to: normalEnd },
    { key: "RISK" as const, from: normalEnd, to: riskEnd },
    { key: "DIABETES" as const, from: riskEnd, to: 100 },
  ];

  return (
    <div>
      <div className="relative h-[52px]">
        <span
          aria-hidden="true"
          data-row="1"
          className="pp-track-marker absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${valueAt}%` }}
        >
          <span className="rounded-[4px] bg-slate-900 px-1.5 text-[12px] font-medium leading-[18px] text-white tabular-nums">{formatPercent(track.value)}</span>
          {/* หมุดค่าเป็นวงกลมบนแถบ ส่วนเกณฑ์เป็นขีดตั้ง จึงไม่สับสนกัน */}
          <span className="mt-[7px] block size-3.5 rounded-full border-2 border-white bg-slate-900 shadow-[0_0_0_1px_var(--color-slate-900)]" />
        </span>
        <div aria-hidden="true" className="absolute inset-x-0 top-[30px] flex h-2 gap-0.5">
          {segments.map((s) => (
            <span key={s.key} className={`h-full rounded-[2px] opacity-75 ${BAND_FILL[s.key]}`} style={{ width: `${s.to - s.from}%` }} />
          ))}
        </div>
        {/* เกณฑ์ Remission: เส้นเขียวหัวเป็ดยาวกว่าแถบ เพื่อให้เห็นว่าเป็นคนละเรื่องกับช่วงค่า */}
        <span aria-hidden="true" className="absolute top-[24px] h-5 w-[3px] -translate-x-1/2 rounded-full bg-primary" style={{ left: `${thresholdAt}%` }} />
      </div>
      <div aria-hidden="true" className="relative mt-1 h-4 text-[12px] tabular-nums text-slate-600">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${percentOn(t, scale)}%` }}>{t}</span>
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-[3px] rounded-full bg-primary" />
          เกณฑ์ Remission ต่ำกว่า {formatPercent(track.threshold)}
        </span>
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2.5 rounded-[3px] opacity-75 ${BAND_FILL[s.key]}`} />
            {LAB_BAND_LABELS[s.key]} {band.ranges[s.key]}
          </span>
        ))}
      </p>
    </div>
  );
}

function medicationCondition(m: MedicationTrack, required: number): { title: string; mark: Mark; status: string; note?: string } {
  const title = `หยุดยาเบาหวานครบ ${required} วัน`;
  switch (m.kind) {
    case "ON_DRUG":
      return { title, mark: "unmet", status: "ยังใช้ยาเบาหวาน", note: "เริ่มนับเมื่อบันทึกวันหยุดยาในแท็บยา" };
    case "NO_STOP_RECORD":
      return { title, mark: "waiting", status: "ไม่มีวันหยุดยา", note: "มีประวัติยาเบาหวาน แต่ยังไม่มีวันหยุดยาให้นับ" };
    case "NEVER_MEDICATED":
      return m.confirmed
        ? { title: "ไม่เคยใช้ยาเบาหวาน", mark: "met", status: "แพทย์ยืนยันแล้ว" }
        : { title, mark: "waiting", status: "รอแพทย์ยืนยัน", note: "ไม่มีประวัติยาเบาหวาน แพทย์ยืนยันว่าไม่เคยใช้ยาได้ที่หัวโปรไฟล์" };
    case "COUNTING":
      return { title, mark: m.met ? "met" : "unmet", status: `${m.days} จาก ${m.required} วัน` };
  }
}

function hba1cCondition(h: Hba1cTrack | null, threshold: number): { title: string; mark: Mark; status: string } {
  const title = `HbA1c ต่ำกว่า ${formatPercent(threshold)}`;
  if (!h) return { title, mark: "waiting", status: "ยังไม่มีผล HbA1c" };
  return { title, mark: h.met ? "met" : "unmet", status: `${formatPercent(h.value)} ตรวจ ${formatThaiDate(h.date)}` };
}

function timingCondition(t: TimingTrack | null, minDays: number): { title: string; mark: Mark; status: string } {
  const title = `ตรวจ HbA1c หลังหยุดยาอย่างน้อย ${minDays} วัน`;
  if (!t) return { title, mark: "waiting", status: "รอวันหยุดยาและผล HbA1c" };
  return t.met
    ? { title, mark: "met", status: "ตรวจหลังหยุดยาแล้ว" }
    : { title, mark: "unmet", status: `ต้องตรวจซ้ำตั้งแต่ ${formatThaiDate(t.earliestValidDate)}` };
}

const VERDICT_STYLE: Record<RemissionStatus, string> = {
  REMISSION: "bg-primary text-white",
  NOT_IN_REMISSION: "bg-slate-100 text-slate-900",
  INSUFFICIENT_DATA: "border border-dashed border-slate-400 bg-white text-slate-800",
};

type Props = {
  track: Track;
  status: RemissionStatus;
  rules: { remissionHba1cMax: number; remissionMedFreeDays: number; remissionHba1cMinDaysAfterStop: number };
  ruleSetMissing: boolean;
};

/**
 * แผงติดตาม Remission: แสดงเงื่อนไขทั้งสามข้อเป็นเครื่องวัด เพื่อให้เห็นว่าเหลืออะไรอีก
 * สถานะสุดท้ายมาจาก assessRemission เท่านั้น แผงนี้ไม่ตัดสินเอง
 */
export default function RemissionTrack({ track, status, rules, ruleSetMissing }: Props) {
  if (ruleSetMissing) {
    return (
      <section aria-labelledby="remission-track-title" className="rounded-[10px] border border-slate-200 bg-white p-4 md:p-5">
        <h2 id="remission-track-title" className="text-[17px] font-semibold text-slate-900">เส้นทางสู่ Remission</h2>
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-[14px] text-slate-700">
          ยังไม่มีชุดเกณฑ์ที่ใช้งาน จึงยังวัดระยะถึงเกณฑ์ Remission ไม่ได้
        </p>
      </section>
    );
  }

  const med = medicationCondition(track.medication, rules.remissionMedFreeDays);
  const hba1c = hba1cCondition(track.hba1c, rules.remissionHba1cMax);
  const timing = timingCondition(track.timing, rules.remissionHba1cMinDaysAfterStop);

  return (
    <section aria-labelledby="remission-track-title" className="flex min-w-0 flex-col rounded-[10px] border border-slate-200 bg-white p-4 md:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="remission-track-title" className="text-[17px] font-semibold leading-snug text-slate-900">เส้นทางสู่ Remission</h2>
          <p className="mt-0.5 text-[13px] text-slate-600">ต้องผ่านครบทุกข้อตามเกณฑ์ชุดที่ใช้งานอยู่</p>
        </div>
        <p className={`pp-verdict inline-flex min-h-8 items-center rounded-md px-3 text-[14px] font-semibold ${VERDICT_STYLE[status]}`}>
          {remissionStatusLabel(status, false)}
        </p>
      </header>

      <ul className="mt-5 divide-y divide-slate-200">
        <Condition title={med.title} mark={med.mark} status={med.status} delayMs={1050}>
          {track.medication.kind === "COUNTING" ? <MedicationRail track={track.medication} /> : med.note ? <p className="text-[13px] text-slate-600">{med.note}</p> : null}
        </Condition>
        <Condition title={hba1c.title} mark={hba1c.mark} status={hba1c.status} delayMs={1150}>
          {track.hba1c ? <Hba1cRuler track={track.hba1c} /> : null}
        </Condition>
        <Condition title={timing.title} mark={timing.mark} status={timing.status} delayMs={1250} />
      </ul>
    </section>
  );
}
