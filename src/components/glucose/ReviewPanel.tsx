import RiskBadge from "@/components/patients/RiskBadge";
import { TILE_STYLES } from "@/components/patients/profile/GlucoseValue";
import { formatGlucoseValue, formatThaiDate, periodLabel } from "@/lib/format";
import type { EntryCheck } from "@/lib/glucose-form";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import type { RiskLevel } from "@/lib/risk/types";

export type PreviewState = { status: "idle" | "loading" | "ready" | "failed"; levelAfter: RiskLevel | null; worstOfDay: RiskLevel | null };

export type AlertPreview = { key: string; summary: string };

export type SavedSnapshot = {
  measuredDate: string;
  filled: EntryCheck[];
  savedCount: number;
  alertsCreated: number;
  levelBefore: RiskLevel | null;
  levelAfter: RiskLevel | null;
  glucoseDateBefore: string | null;
  glucoseDateAfter: string | null;
  alertTotalBefore: number;
  alertTotalAfter: number;
};

type Common = { recorderName: string; today: string };

function ValueRows({ filled }: { filled: EntryCheck[] }) {
  return (
    <ul className="space-y-2">
      {filled.map((c) => {
        const v = formatGlucoseValue(c.valueMgDl, c.meterFlag);
        const a = c.assessment;
        return (
          <li key={c.key} className="flex items-center justify-between gap-2 text-[15px]">
            <span className="text-slate-800">{periodLabel(c.period)}</span>
            <span className="flex items-center gap-2">
              <strong className={a?.level === "CRITICAL" ? "text-[#991b1b]" : ""}>{c.error ? "—" : v.text}</strong>
              {a && !c.error ? (
                <span className={`rounded-md px-2 py-0.5 text-[13px] font-medium ${a.level === "WELL_CONTROLLED" ? "bg-[#dcfce7] text-[#14532d]" : TILE_STYLES[a.level]}`}>
                  {RISK_LEVEL_LABELS[a.level]}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ChangeTag({ changed }: { changed: boolean }) {
  return changed ? (
    <span className="gl-changed rounded-full px-2 py-0.5 text-xs font-medium text-teal-900" style={{ ["--highlight" as string]: "#ccfbf1" }}>เปลี่ยน</span>
  ) : (
    <span className="rounded-full border border-slate-400 px-2 py-0.5 text-xs font-medium text-slate-800">ไม่เปลี่ยน</span>
  );
}

function Arrow() {
  return <span aria-label="เป็น" className="mx-1 text-slate-600">→</span>;
}

/** ก่อนบันทึก: ตรวจสอบค่าและผลที่จะเกิด */
export function BeforePanel(p: Common & {
  measuredDate: string;
  filled: EntryCheck[];
  preview: PreviewState;
  alerts: AlertPreview[];
  ruleSummary: string;
}) {
  return (
    <div className="space-y-4 text-sm">
      {p.filled.length === 0 ? (
        <p className="text-slate-700">ยังไม่มีค่าที่จะบันทึก กรอกค่า DTX อย่างน้อย 1 ช่วง</p>
      ) : (
        <>
          <div>
            <p className="mb-2 text-slate-700">ค่าที่จะบันทึก ({p.filled.length} ค่า)</p>
            <ValueRows filled={p.filled} />
          </div>
          <hr className="border-slate-200" />
          <div className="space-y-3">
            <div>
              <p className="text-slate-700">ค่าที่แย่ที่สุดของวันที่ {formatThaiDate(p.measuredDate)}</p>
              <div className="mt-1.5"><PreviewBadge state={p.preview} field="worstOfDay" /></div>
            </div>
            <div>
              <p className="text-slate-700">ระดับปัจจุบันของผู้ป่วยหลังบันทึก</p>
              <div className="mt-1.5"><PreviewBadge state={p.preview} field="levelAfter" /></div>
            </div>
            <div>
              <p className="text-slate-700">Alert ที่จะถูกสร้าง</p>
              {p.alerts.length === 0 ? (
                <p className="mt-1.5 font-medium text-slate-900">ไม่มี</p>
              ) : (
                <ul className="mt-1.5 space-y-1 font-medium text-[#991b1b]">
                  {p.alerts.map((a) => <li key={a.key}>{a.summary}</li>)}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
      <hr className="border-slate-200" />
      <div className="space-y-3">
        <div>
          <p className="text-slate-700">เกณฑ์ที่ใช้</p>
          <p className="mt-1 font-medium text-slate-900">{p.ruleSummary}</p>
        </div>
        <div>
          <p className="text-slate-700">ผู้บันทึก</p>
          <p className="mt-1 font-medium text-slate-900">{p.recorderName} · {formatThaiDate(p.today)}</p>
        </div>
        <p className="text-xs text-slate-700">ค่าที่บันทึกแล้วแก้ไขได้ ระบบเก็บค่าเดิมและผู้แก้ไว้ในประวัติ</p>
      </div>
    </div>
  );
}

function PreviewBadge({ state, field }: { state: PreviewState; field: "levelAfter" | "worstOfDay" }) {
  if (state.status === "loading") return <span className="text-slate-600">กำลังคำนวณ...</span>;
  if (state.status === "failed") return <span className="text-slate-700">ประเมินตัวอย่างไม่ได้ในขณะนี้ (ยังบันทึกได้ตามปกติ)</span>;
  if (state.status === "idle") return <span className="text-slate-600">—</span>;
  return <RiskBadge level={state[field]} />;
}

/** หลังบันทึก: สิ่งที่เปลี่ยน (อยู่ถาวร ตรวจย้อนหลังได้หลังไฮไลต์จางไปแล้ว) */
export function AfterPanel(p: Common & { saved: SavedSnapshot }) {
  const s = p.saved;
  const dateChanged = s.glucoseDateBefore !== s.glucoseDateAfter;
  const alertChanged = s.alertTotalBefore !== s.alertTotalAfter;
  const levelChanged = s.levelBefore !== s.levelAfter;
  return (
    <div className="space-y-4 text-sm">
      <p className="text-slate-700">บันทึกโดย {p.recorderName} · {formatThaiDate(p.today)}</p>
      <hr className="border-slate-200" />
      <div>
        <p className="mb-2 text-slate-700">ค่าที่บันทึกแล้ว ({s.savedCount} ค่า)</p>
        <ValueRows filled={s.filled} />
      </div>
      <hr className="border-slate-200" />
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between"><p className="text-slate-700">ข้อมูลน้ำตาลล่าสุด</p><ChangeTag changed={dateChanged} /></div>
          <p className="mt-1 font-medium text-slate-900">
            {s.glucoseDateBefore ? formatThaiDate(s.glucoseDateBefore) : "ยังไม่มี"}<Arrow /><strong>{s.glucoseDateAfter ? formatThaiDate(s.glucoseDateAfter) : "—"}</strong>
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between"><p className="text-slate-700">Alert ที่ยังไม่รับทราบ</p><ChangeTag changed={alertChanged} /></div>
          <p className="mt-1 font-medium text-slate-900">{s.alertTotalBefore}<Arrow /><strong>{s.alertTotalAfter}</strong></p>
        </div>
        <div>
          <div className="flex items-center justify-between"><p className="text-slate-700">ระดับปัจจุบันของผู้ป่วย</p><ChangeTag changed={levelChanged} /></div>
          <p className="mt-1.5 flex items-center"><RiskBadge level={s.levelBefore} /><Arrow /><RiskBadge level={s.levelAfter} /></p>
        </div>
      </div>
      <p className="text-xs text-slate-700">ค่าที่บันทึกแล้วแก้ไขได้ ระบบเก็บค่าเดิมและผู้แก้ไว้ในประวัติ</p>
    </div>
  );
}

/** ข้อความสำหรับโปรแกรมอ่านหน้าจอและ Toast */
export function savedAnnouncement(s: SavedSnapshot): string {
  const alert = s.alertsCreated > 0 ? `สร้าง Alert ${s.alertsCreated} รายการ` : "ไม่มี Alert ใหม่";
  const level = s.levelBefore === s.levelAfter
    ? `ระดับปัจจุบันไม่เปลี่ยน${s.levelAfter ? ` (${RISK_LEVEL_LABELS[s.levelAfter]})` : ""}`
    : `ระดับปัจจุบันเปลี่ยนเป็น ${s.levelAfter ? RISK_LEVEL_LABELS[s.levelAfter] : "ยังไม่มีข้อมูล"}`;
  return `บันทึกสำเร็จ ${s.savedCount} ค่า ${alert} ${level}`;
}
