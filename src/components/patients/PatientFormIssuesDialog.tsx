"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PRIMARY_BUTTON } from "@/components/forms/fields";
import type { PatientFormIssue } from "@/lib/patient-form";

type Props = {
  issues: PatientFormIssue[];
  /** เรียกเมื่อกล่องปิดสนิทแล้ว พร้อมชื่อช่องที่ต้องพาผู้ใช้ไป */
  onClose: (fieldName: PatientFormIssue["name"]) => void;
};

/** จังหวะที่ตราปั๊มกระแทกกล่อง (ตรงกับ patient-form.css) ทุกอย่างที่สะดุ้งเริ่มพร้อมกันที่จุดนี้ */
const IMPACT_MS = 280;

/** ทั้งหน้าสะดุ้งตามแรงกระแทก ขยับแนวตั้งเท่านั้น เพื่อไม่ให้เกิดแถบเลื่อนแนวนอนชั่วขณะ */
const PAGE_FLINCH: Keyframe[] = [
  { transform: "translateY(0)" },
  { transform: "translateY(10px)", offset: 0.15 },
  { transform: "translateY(-7px)", offset: 0.35 },
  { transform: "translateY(4px)", offset: 0.55 },
  { transform: "translateY(-2px)", offset: 0.75 },
  { transform: "translateY(0)" },
];

/** รายการตามมาหลังแรงกระแทก และจำกัดการหน่วงรวมไว้ ทุกอย่างกดได้ตั้งแต่กล่องเปิด จึงไม่ต้องรอให้เล่นจบ */
const ROW_START_MS = 340;
const ROW_STEP_MS = 45;
const ROW_DELAY_CAP = 6;

const FLIGHT_MS = 260;
/** จอแคบเป็นแผ่นล่าง เลื่อนลงตามขอบจอจะเข้าใจง่ายกว่าการบินไปหาช่อง (ค่าเดียวกับ patient-form.css) */
const FLIGHT_MIN_VIEWPORT = "(min-width: 640px)";

/** กล่องหดและบินไปหาช่องปลายทาง ผู้ใช้จึงเห็นว่าถูกพาไปที่ไหนแทนการที่จอกระโดดไปเอง */
function flyToField(dialog: HTMLDialogElement, field: HTMLElement | null) {
  const canFly = window.matchMedia(FLIGHT_MIN_VIEWPORT).matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!field || !canFly) return;
  // เลื่อนจอทันทีก่อนวัดตำแหน่ง เพื่อให้กล่องบินไปถูกจุดแม้ช่องอยู่นอกจอ ฉากมืดช่วยกลบการเลื่อนนี้
  field.scrollIntoView({ block: "center", behavior: "auto" });
  const from = dialog.getBoundingClientRect();
  const to = field.getBoundingClientRect();
  const x = to.left + to.width / 2 - (from.left + from.width / 2);
  const y = to.top + to.height / 2 - (from.top + from.height / 2);
  dialog.animate(
    [
      { transform: "none", opacity: 1 },
      { transform: `translate(${x}px, ${y}px) scale(0.12)`, opacity: 0 },
    ],
    { duration: FLIGHT_MS, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" },
  );
}

function dialogTitle(issues: PatientFormIssue[]): string {
  const missing = issues.filter((issue) => issue.kind === "missing").length;
  if (missing === issues.length) return `ยังกรอกไม่ครบ ${missing} ช่อง`;
  if (missing === 0) return `กรอกไม่ถูกต้อง ${issues.length} ช่อง`;
  return `ยังบันทึกไม่ได้ ต้องแก้ ${issues.length} ช่อง`;
}

function WarningMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-12 shrink-0 overflow-visible text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle className="pf-issues-ripple" cx="12" cy="12" r="10" strokeWidth="1.2" />
      <circle className="pf-issues-ripple pf-issues-ripple-late" cx="12" cy="12" r="10" strokeWidth="1.2" />
      <g className="pf-issues-mark">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 7v6.5" strokeWidth="2.6" />
        <path d="M12 17h.01" strokeWidth="3" />
      </g>
    </svg>
  );
}

/** แยกประเภทด้วยรูปทรงด้วย ไม่ใช้สีอย่างเดียว: วงประ = ยังว่าง, กากบาท = กรอกแล้วแต่ไม่ถูกต้อง */
function IssueMarker({ kind }: { kind: PatientFormIssue["kind"] }) {
  if (kind === "missing") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle className="pf-issues-marker-pop" cx="10" cy="10" r="7" strokeDasharray="2.6 3" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-risk-critical" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle className="pf-issues-marker-draw" cx="10" cy="10" r="7" pathLength={1} />
      <path className="pf-issues-marker-draw pf-issues-marker-late" d="M7.5 7.5l5 5" pathLength={1} />
      <path className="pf-issues-marker-draw pf-issues-marker-later" d="M12.5 7.5l-5 5" pathLength={1} />
    </svg>
  );
}

type IssueRowProps = { issue: PatientFormIssue; index: number; picked: boolean; onPick: () => void };

function IssueRow({ issue, index, picked, onPick }: IssueRowProps) {
  const rowDelay = `${ROW_START_MS + Math.min(index, ROW_DELAY_CAP) * ROW_STEP_MS}ms`;
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        data-picked={picked ? "" : undefined}
        style={{ "--row-delay": rowDelay } as CSSProperties}
        className="pf-issues-row group flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <IssueMarker kind={issue.kind} />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-900">{issue.label}</span>
            {issue.kind === "invalid" ? <span className="mt-0.5 block text-[13px] text-red-800">{issue.message}</span> : null}
          </span>
        </span>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 text-slate-500 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      </button>
    </li>
  );
}

/** แจ้งว่าช่องไหนยังไม่ได้กรอกหรือกรอกไม่ถูกต้อง แตะรายการเพื่อไปยังช่องนั้น (บนมือถือเป็นแผ่นล่าง) */
export default function PatientFormIssuesDialog({ issues, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  /** ชื่อช่องที่จะพาไปหลังปิด ไม่เป็น null ระหว่างเล่นแอนิเมชันออก */
  const [closing, setClosing] = useState<PatientFormIssue["name"] | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    primaryRef.current?.focus();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.closest("main")?.animate(PAGE_FLINCH, { duration: 420, delay: IMPACT_MS, easing: "ease-out" });
    }
  }, []);

  // รอแอนิเมชันออกจบก่อน แล้วจึงให้ฟอร์มย้ายโฟกัส ผู้ใช้จึงเห็นช่องสั่นหลังกล่องหายไปแล้ว
  useEffect(() => {
    if (!closing) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    let cancelled = false;
    flyToField(dialog, dialog.closest("form")?.querySelector<HTMLElement>(`[name="${closing}"]`) ?? null);
    Promise.allSettled(dialog.getAnimations().map((animation) => animation.finished)).then(() => {
      if (cancelled) return;
      dialog.close();
      onClose(closing);
    });
    return () => { cancelled = true; };
  }, [closing, onClose]);

  // กดซ้ำระหว่างกำลังปิดให้คงปลายทางเดิม กล่องจะได้ไม่เปลี่ยนทิศกลางทาง
  const closeTo = (fieldName: PatientFormIssue["name"]) => setClosing((current) => current ?? fieldName);

  const firstField = issues[0].name;
  const missing = issues.filter((issue) => issue.kind === "missing");
  const invalid = issues.filter((issue) => issue.kind === "invalid");
  const groups = [
    { title: "ยังไม่ได้กรอก", items: missing },
    { title: "กรอกไม่ถูกต้อง", items: invalid },
  ].filter((group) => group.items.length > 0);

  let rowIndex = 0;

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="pf-issues-title"
      aria-describedby="pf-issues-desc"
      data-state={closing ? "exit" : "open"}
      onCancel={(e) => { e.preventDefault(); closeTo(firstField); }}
      onClick={(e) => { if (e.target === dialogRef.current) closeTo(firstField); }}
      className="pf-issues m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50 max-sm:mb-0 max-sm:mt-auto max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      {/* ใช้แดงสดกว่าสีวิกฤตของผู้ป่วย (risk-critical) เพื่อไม่ให้อ่านเป็นระดับความเสี่ยง */}
      <header className="pf-issues-band relative flex items-center gap-4 overflow-hidden bg-stop-red px-5 py-4 text-white">
        <WarningMark />
        <h2 id="pf-issues-title" className="min-w-0">
          <span className="pf-issues-stamp inline-block rounded-md border-[3px] border-white px-3 py-0.5 text-2xl font-semibold leading-tight tracking-wide">หยุดก่อน!</span>{" "}
          <span className="mt-2 block text-[17px] font-semibold leading-6">{dialogTitle(issues)}</span>
        </h2>
      </header>

      <div className="space-y-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p id="pf-issues-desc" className="text-sm text-slate-700">เลือกรายการเพื่อไปยังช่องนั้น ข้อมูลที่กรอกไว้ยังอยู่</p>

        <div className="-mx-2 max-h-[50dvh] space-y-3 overflow-y-auto">
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title}>
              {groups.length > 1 ? <h3 className="px-2 pb-1 text-[12.5px] font-medium text-slate-600">{group.title}</h3> : null}
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {group.items.map((issue) => (
                  <IssueRow key={issue.name} issue={issue} index={rowIndex++} picked={closing === issue.name} onPick={() => closeTo(issue.name)} />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex sm:justify-end">
          <button ref={primaryRef} type="button" onClick={() => closeTo(firstField)} className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
            {issues.length > 1 ? "ไปแก้ช่องแรก" : "ไปแก้ช่องนี้"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
