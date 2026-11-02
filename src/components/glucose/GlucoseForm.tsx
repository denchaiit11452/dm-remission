"use client";

import "./glucose-motion.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RiskBadge from "@/components/patients/RiskBadge";
import { saveGlucoseAction, previewGlucoseAction } from "@/app/(main)/patients/[id]/glucose/actions";
import type { SaveGlucoseResult } from "@/lib/data/glucose";
import { daysBetween } from "@/lib/date";
import { formatThaiDate } from "@/lib/format";
import { buildSavePayload, newEntry, previewAlerts, summarizeForm, type FormEntry } from "@/lib/glucose-form";
import { weekdayName } from "@/lib/history";
import type { GlucosePeriod, RiskLevel, RiskRules } from "@/lib/risk/types";
import ConfirmDialog from "./ConfirmDialog";
import PeriodCard from "./PeriodCard";
import { AfterPanel, BeforePanel, savedAnnouncement, type PreviewState, type SavedSnapshot } from "./ReviewPanel";

export type GlucoseFormProps = {
  patient: { id: string; hn: string; fullName: string; subtitle: string };
  currentLevel: RiskLevel | null;
  lastGlucoseDate: string | null;
  openAlertCount: number;
  rules: RiskRules;
  ruleSummary: string;
  recorder: { name: string };
  today: string;
  initialDate: string;
};

type Status = "idle" | "confirming" | "saving" | "saved" | "error";

const PERIOD_TITLES: Record<GlucosePeriod, string> = {
  BEFORE_BREAKFAST: "ก่อนอาหาร", AFTER_BREAKFAST: "หลังอาหาร", BEFORE_DINNER: "ก่อนอาหาร", AFTER_DINNER: "หลังอาหาร",
};
const PERIOD_MENU: { period: GlucosePeriod; label: string }[] = [
  { period: "BEFORE_BREAKFAST", label: "ก่อนอาหารเช้า" }, { period: "AFTER_BREAKFAST", label: "หลังอาหารเช้า" },
  { period: "BEFORE_DINNER", label: "ก่อนอาหารเย็น" }, { period: "AFTER_DINNER", label: "หลังอาหารเย็น" },
];
const COLUMNS: { title: string; periods: GlucosePeriod[] }[] = [
  { title: "มื้อเช้า", periods: ["BEFORE_BREAKFAST", "AFTER_BREAKFAST"] },
  { title: "มื้อเย็น", periods: ["BEFORE_DINNER", "AFTER_DINNER"] },
];
const MIN_SAVING_MS = 300; // แสดงสถานะ "กำลังบันทึก" อย่างน้อย 300 ms กันภาพกะพริบ
const EXIT_MS = 150;

const initialEntries = (): FormEntry[] => (Object.keys(PERIOD_TITLES) as GlucosePeriod[]).map((p) => newEntry(p, `main-${p}`));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function GlucoseForm(props: GlucoseFormProps) {
  const { patient, rules, today } = props;
  const router = useRouter();
  const [entries, setEntries] = useState<FormEntry[]>(initialEntries);
  const [date, setDate] = useState(props.initialDate);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SavedSnapshot | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [fetched, setFetched] = useState<{ key: string; status: "ready" | "failed"; levelAfter: RiskLevel | null; worstOfDay: RiskLevel | null } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const counter = useRef(0);
  const backRef = useRef<HTMLAnchorElement>(null);
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;

  const summary = useMemo(() => summarizeForm(entries, rules, date), [entries, rules, date]);
  const alerts = useMemo(() => previewAlerts(summary, rules, date, today), [summary, rules, date, today]);
  const locked = status === "saving" || status === "saved";
  const canSave = summary.canSave && dateValid && !locked;

  // ตัวอย่างระดับหลังบันทึก (อ่านอย่างเดียว) รอผู้ใช้หยุดกรอกสักครู่ และทิ้งผลที่มาช้ากว่าคำขอใหม่
  const payloadKey = useMemo(() => JSON.stringify(summary.filled.map((c) => [c.period, c.valueMgDl, c.meterFlag])) + date, [summary.filled, date]);
  const previewWanted = status !== "saved" && summary.canSave && dateValid;
  const preview: PreviewState = !previewWanted
    ? { status: "idle", levelAfter: null, worstOfDay: null }
    : fetched && fetched.key === payloadKey
      ? { status: fetched.status, levelAfter: fetched.levelAfter, worstOfDay: fetched.worstOfDay }
      : { status: "loading", levelAfter: null, worstOfDay: null };

  useEffect(() => {
    if (!previewWanted) return;
    let stale = false;
    const t = setTimeout(async () => {
      let next: NonNullable<typeof fetched>;
      try {
        const r = await previewGlucoseAction(buildSavePayload(patient.id, date, summary, ""));
        next = r.ok
          ? { key: payloadKey, status: "ready", levelAfter: r.preview.levelAfter, worstOfDay: r.preview.worstOfDay }
          : { key: payloadKey, status: "failed", levelAfter: null, worstOfDay: null };
      } catch {
        next = { key: payloadKey, status: "failed", levelAfter: null, worstOfDay: null };
      }
      if (!stale) setFetched(next); // ทิ้งผลที่มาช้ากว่าคำขอใหม่
    }, 400);
    return () => { stale = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey, previewWanted]);

  const patch = useCallback((key: string, p: Partial<FormEntry>) => {
    setEntries((es) => es.map((e) => (e.key === key ? { ...e, ...p } : e)));
    setFieldErrors({});
    setError(null);
    if (status === "error") setStatus("idle");
  }, [status]);

  const addRepeat = (period: GlucosePeriod) => setEntries((es) => {
    const lastIdx = es.map((e) => e.period).lastIndexOf(period);
    const next = [...es];
    next.splice(lastIdx + 1, 0, newEntry(period, `rep-${++counter.current}`));
    return next;
  });
  const removeEntry = (key: string) => setEntries((es) => es.filter((e) => e.key !== key));

  async function doSave() {
    setStatus("saving");
    setError(null);
    const filledNow = summary.filled;
    const payload = buildSavePayload(patient.id, date, summary, note);
    const failed = (): SaveGlucoseResult => ({ ok: false, error: "บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง" });
    // แสดงสถานะ "กำลังบันทึก" อย่างน้อย MIN_SAVING_MS แม้ตอบกลับเร็วกว่านั้น
    const [result] = await Promise.all([saveGlucoseAction(payload).catch(failed), sleep(MIN_SAVING_MS)]);

    if (!result.ok) {
      // ไม่มีเอฟเฟกต์เช็กถูก: กล่องปิด ข้อมูลที่กรอกยังอยู่ ขึ้นข้อความแดงพร้อมปุ่มลองใหม่
      const fe: Record<string, string> = {};
      for (const [k, v] of Object.entries(result.fieldErrors ?? {})) {
        const m = /^entries\.(\d+)\.(\w+)$/.exec(k);
        const key = m ? filledNow[Number(m[1])]?.key : undefined;
        if (key) fe[key] = v;
      }
      setFieldErrors(fe);
      setError(result.error);
      await closeDialog();
      setStatus("error");
      return;
    }

    const d = result.data;
    setSaved({
      measuredDate: d.measuredDate,
      filled: filledNow,
      savedCount: d.savedCount,
      alertsCreated: d.alertsCreated,
      levelBefore: d.levelBefore,
      levelAfter: d.levelAfter,
      glucoseDateBefore: props.lastGlucoseDate,
      glucoseDateAfter: props.lastGlucoseDate && props.lastGlucoseDate > d.measuredDate ? props.lastGlucoseDate : d.measuredDate,
      alertTotalBefore: d.newAlertTotal - d.alertsCreated,
      alertTotalAfter: d.newAlertTotal,
    });
    await closeDialog();
    setStatus("saved");
    setToastOpen(true);
    router.refresh(); // ปรับตัวเลข Alert บนเมนูและข้อมูลในหน้าอื่น
    requestAnimationFrame(() => backRef.current?.focus());
  }

  async function closeDialog() {
    setClosing(true);
    await sleep(EXIT_MS);
    setClosing(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    if (summary.criticalCount > 0) setStatus("confirming"); // ค่าวิกฤตต้องยืนยันก่อนเสมอ
    else void doSave();
  }

  function resetForNext() {
    setEntries(initialEntries());
    setNote("");
    setSaved(null);
    setToastOpen(false);
    setStatus("idle");
    setError(null);
  }

  const dateNote = useMemo(() => {
    if (!dateValid) return "";
    const ago = daysBetween(date, today);
    return ago === 0 ? `วันนี้ · ${weekdayName(date)}` : `ย้อนหลัง ${ago} วัน · ${weekdayName(date)}`;
  }, [date, today, dateValid]);

  const statusText = saved
    ? savedAnnouncement(saved)
    : summary.filledCount === 0 ? "ยังไม่ได้กรอกค่า ปุ่มบันทึกยังกดไม่ได้" : `พร้อมบันทึก ${summary.filledCount} ค่า`;

  const confirming = status === "confirming" || (status === "saving" && summary.criticalCount > 0 && !saved);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-28 lg:pb-6">
      {/* ประกาศผลให้โปรแกรมอ่านหน้าจอ ไม่พึ่งภาพอย่างเดียว */}
      <p role="status" aria-live="polite" className="sr-only">{saved ? savedAnnouncement(saved) : ""}</p>

      {toastOpen && saved ? (
        <div data-state="enter" className="gl-toast fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-green-200 bg-green-50 p-4 text-green-950 shadow-lg">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">✓</span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">บันทึกสำเร็จ {saved.savedCount} ค่า</p>
              <p className="mt-0.5">
                {saved.alertsCreated > 0 ? `สร้าง Alert ${saved.alertsCreated} รายการ` : "ไม่มี Alert ใหม่"} ·{" "}
                {saved.levelBefore === saved.levelAfter ? "ระดับปัจจุบันไม่เปลี่ยน" : "ระดับปัจจุบันเปลี่ยน"}
              </p>
              <Link href={`/patients/${patient.id}?tab=history&to=${saved.measuredDate}&from=${saved.measuredDate}`} className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-2">
                ดูในประวัติรายวัน →
              </Link>
            </div>
            <button type="button" onClick={() => setToastOpen(false)} aria-label="ปิดข้อความ" className="ml-auto min-h-11 min-w-11 text-lg leading-none text-green-900">×</button>
          </div>
        </div>
      ) : null}

      <Link href={`/patients/${patient.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
        ← กลับไปโปรไฟล์ {patient.fullName}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">บันทึกน้ำตาล DTX</h1>
        <p className="mt-1 text-sm text-slate-700">ผู้ป่วยวัดเองที่บ้าน เจ้าหน้าที่เป็นผู้กรอก</p>
      </header>

      <section aria-label="ผู้ป่วย" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-900">{patient.fullName}</p>
          <p className="text-sm text-slate-700">{patient.subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="hidden sm:block">
            <p className="text-slate-700">ข้อมูลน้ำตาลล่าสุด</p>
            <p className="font-semibold text-slate-900">{formatThaiDate(saved?.glucoseDateAfter ?? props.lastGlucoseDate)}</p>
          </div>
          <div>
            <p className="text-slate-700">ระดับความเสี่ยงปัจจุบัน</p>
            <div className="mt-1"><RiskBadge level={saved ? saved.levelAfter : props.currentLevel} /></div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <section>
            <h2 className="text-base font-semibold text-slate-900"><label htmlFor="gl-date">วันที่ผู้ป่วยวัด</label></h2>
            <p className="mt-1 text-sm text-slate-700">วันที่วัดจริง ไม่ใช่วันที่กรอก ใช้วันที่วัดประเมินระดับความเสี่ยงปัจจุบัน</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                id="gl-date" type="date" value={date} max={today} disabled={locked} required
                aria-invalid={!dateValid ? true : undefined}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:bg-slate-50"
              />
              {dateValid ? <span className="rounded-full border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm text-teal-900">✓ {formatThaiDate(date)} · {dateNote}</span>
                : <span className="text-sm text-red-800">เลือกวันที่ให้ถูกต้อง (ห้ามเป็นวันในอนาคต)</span>}
            </div>
          </section>

          <section aria-labelledby="gl-values">
            <h2 id="gl-values" className="text-base font-semibold text-slate-900">ค่าน้ำตาล DTX</h2>
            <p className="mt-1 text-sm text-slate-700">กรอกเฉพาะช่วงที่ผู้ป่วยวัด ไม่ต้องกรอกครบทั้ง 4 ช่วง · เวลาที่วัดไม่บังคับ · ถ้าเครื่องไม่แสดงตัวเลข เลือก LO หรือ HI</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {COLUMNS.map((col) => (
                <div key={col.title} className="space-y-3">
                  <h3 className="text-[15px] font-semibold text-slate-900">{col.title === "มื้อเช้า" ? "☀ " : "☾ "}{col.title}</h3>
                  {col.periods.flatMap((period) =>
                    entries.map((e, i) => (e.period === period ? { e, i } : null)).filter((x): x is { e: FormEntry; i: number } => x !== null).map(({ e }) => {
                      const check = summary.checks.find((c) => c.key === e.key)!;
                      return (
                        <PeriodCard
                          key={e.key} entry={e} check={check} title={PERIOD_TITLES[period]} isRepeat={e.key.startsWith("rep-")}
                          saved={status === "saved"} disabled={status === "saving"} serverError={fieldErrors[e.key]}
                          onChange={(p) => patch(e.key, p)} onRemove={() => removeEntry(e.key)}
                        />
                      );
                    }),
                  )}
                </div>
              ))}
            </div>

            <details className="relative mt-4 inline-block">
              <summary className={`gl-btn inline-flex min-h-11 list-none items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-teal-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${locked ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
                + เพิ่มค่าวัดซ้ำในช่วงเดียวกัน
              </summary>
              <ul className="absolute z-10 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {PERIOD_MENU.map((m) => (
                  <li key={m.period}>
                    <button type="button" onClick={(ev) => { addRepeat(m.period); (ev.currentTarget.closest("details") as HTMLDetailsElement).open = false; }} className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700">
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900"><label htmlFor="gl-note">หมายเหตุ (ไม่บังคับ)</label></h2>
            <input
              id="gl-note" type="text" value={note} maxLength={500} disabled={locked}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น วัดซ้ำเพราะค่าสูง ผู้ป่วยมีอาการเหงื่อออก"
              className="mt-2 min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-base placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:bg-slate-50"
            />
          </section>

          {summary.criticalCount > 0 && status !== "saved" ? (
            <div role="note" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-950">
              ⚠ มีค่าวิกฤต {summary.criticalCount} ค่า เข้าเกณฑ์วิกฤต ระบบจะสร้าง Alert ทันทีหลังบันทึก ตรวจตัวเลขอีกครั้ง ระบบจะขอให้ยืนยันก่อนบันทึก
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
              <p>{error}</p>
              {summary.canSave ? <button type="button" onClick={() => (summary.criticalCount > 0 ? setStatus("confirming") : void doSave())} className="gl-btn min-h-11 rounded-lg border border-red-400 bg-white px-4 font-medium">ลองใหม่</button> : null}
            </div>
          ) : null}
        </div>

        {/* แผงตรวจสอบ: จอใหญ่อยู่ด้านขวา, มือถือเป็นแถบพับ */}
        <aside className="hidden self-start rounded-xl border border-slate-200 bg-white p-5 lg:block" aria-label={saved ? "สิ่งที่เปลี่ยนจากการบันทึกนี้" : "ตรวจสอบก่อนบันทึก"}>
          <h2 className="mb-3 text-base font-semibold text-slate-900">{saved ? "สิ่งที่เปลี่ยนจากการบันทึกนี้" : "ตรวจสอบก่อนบันทึก"}</h2>
          {saved ? <AfterPanel saved={saved} recorderName={props.recorder.name} today={today} /> : <BeforePanel measuredDate={date} filled={summary.filled} preview={preview} alerts={alerts} ruleSummary={props.ruleSummary} recorderName={props.recorder.name} today={today} />}
        </aside>
        <details open={reviewOpen} onToggle={(e) => setReviewOpen((e.currentTarget as HTMLDetailsElement).open)} className="rounded-xl border border-slate-200 bg-white lg:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-[15px] font-semibold text-slate-900">
            <span>{saved ? "สิ่งที่เปลี่ยนจากการบันทึกนี้" : "ตรวจสอบก่อนบันทึก"} <span className="font-normal text-slate-700">{summary.filledCount > 0 && !saved ? `${summary.filledCount} ค่า` : ""}</span></span>
            {summary.worstLevel && !saved ? <RiskBadge level={summary.worstLevel} /> : null}
          </summary>
          <div className="border-t border-slate-200 p-4">
            {saved ? <AfterPanel saved={saved} recorderName={props.recorder.name} today={today} /> : <BeforePanel measuredDate={date} filled={summary.filled} preview={preview} alerts={alerts} ruleSummary={props.ruleSummary} recorderName={props.recorder.name} today={today} />}
          </div>
        </details>
      </div>

      {/* แถบปุ่มล่าง: ติดขอบล่างบนมือถือ */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:rounded-xl lg:border lg:px-5 lg:pb-3">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3">
          <div id="gl-status" className="hidden min-w-0 text-sm sm:block">
            <p className="font-semibold text-slate-900">{saved ? `บันทึกแล้ว ${saved.savedCount} ค่า` : summary.filledCount === 0 ? "ยังไม่ได้กรอกค่า" : `พร้อมบันทึก ${summary.filledCount} ค่า`}</p>
            <p className="text-slate-700">
              {saved ? `บันทึกโดย ${props.recorder.name} · ${formatThaiDate(saved.measuredDate)}`
                : summary.criticalCount > 0 ? `มีค่าวิกฤต ${summary.criticalCount} ค่า · ระบบจะขอยืนยันก่อนบันทึก`
                : summary.hasErrors ? "มีช่องที่กรอกไม่ถูกต้อง กรุณาแก้ไข" : "กรอกค่า DTX อย่างน้อย 1 ช่วง"}
            </p>
          </div>
          <span className="sr-only" id="gl-status-sr">{statusText}</span>
          <div className="flex w-full gap-3 sm:w-auto">
            {status === "saved" ? (
              <>
                <button type="button" onClick={resetForNext} className="gl-btn min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:flex-none">บันทึกค่าเพิ่ม</button>
                <Link ref={backRef} href={`/patients/${patient.id}`} className="gl-btn inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:flex-none">กลับไปโปรไฟล์</Link>
              </>
            ) : (
              <>
                <Link href={`/patients/${patient.id}`} aria-disabled={status === "saving"} className="gl-btn inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:flex-none">ยกเลิก</Link>
                <button
                  type="submit" disabled={!canSave} aria-describedby="gl-status-sr"
                  className={`gl-btn min-h-11 flex-[2] rounded-lg px-5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:flex-none ${canSave ? "bg-teal-800 text-white hover:bg-teal-900" : "cursor-not-allowed bg-slate-200 text-slate-600"} ${status === "saving" && !confirming ? "gl-saving cursor-wait" : ""}`}
                >
                  {status === "saving" && !confirming ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="gl-spinner size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                      กำลังบันทึก...
                    </span>
                  ) : "บันทึกค่าน้ำตาล"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirming && !closing} closing={closing} saving={status === "saving"}
        patientName={patient.fullName} hn={patient.hn} measuredDate={date} dateNote={dateNote}
        filled={summary.filled} criticalCount={summary.criticalCount} alertCount={alerts.length}
        levelAfter={preview.status === "ready" ? preview.levelAfter : null}
        onCancel={() => setStatus("idle")} onConfirm={() => void doSave()}
      />
    </form>
  );
}
