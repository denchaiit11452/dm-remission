"use client";

import "./alert-center.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { acknowledgeAlertAction } from "@/app/(main)/alerts/actions";
import RiskBadge from "@/components/patients/RiskBadge";
import {
  ALERT_WINDOW_DAYS, alertHref, formatThaiDateTime, formatThaiTime, type AlertRowDTO, type AlertTab,
} from "@/lib/alert-center";
import type { AlertCenterData, AckResult } from "@/lib/data/alerts";
import { formatThaiDate } from "@/lib/format";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import AckDialog from "./AckDialog";

type Props = { data: AlertCenterData; thresholdMissing: boolean; canOpenSettings: boolean };
type RowUi = "saving" | "leaving" | "conflict";
type Toast = { name: string; levelLabel: string; remaining: number };

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
const GRID = "md:grid-cols-[104px_minmax(0,1fr)_auto] xl:grid-cols-[130px_250px_minmax(0,1fr)_270px_140px]";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAB_LABELS: Record<AlertTab, string> = { new: "ใหม่", ack: "รับทราบแล้ว", cancel: "ยกเลิก" };
const COUNT_POLL_MS = 30_000;

function Spinner() {
  return (
    <svg className="ac-spinner size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function AlertCenter({ data, thresholdMissing, canOpenSettings }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [rows, setRows] = useState(data.rows);
  const [seenLoadedAt, setSeenLoadedAt] = useState(data.loadedAt);
  const [ui, setUi] = useState<Record<string, RowUi>>({});
  const [conflicts, setConflicts] = useState<Record<string, { by: string | null; at: string | null }>>({});
  const [ackedHere, setAckedHere] = useState(0);
  const [newer, setNewer] = useState(0);
  const [dialogRow, setDialogRow] = useState<AlertRowDTO | null>(null);
  const [dialogClosing, setDialogClosing] = useState(false);
  const [error, setError] = useState<{ message: string; row: AlertRowDTO } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [announce, setAnnounce] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // ข้อมูลจากเซิร์ฟเวอร์ชุดใหม่มาถึง (โหลดใหม่/เปลี่ยนหน้า): รีเซ็ตสถานะที่ผูกกับรายการเดิม แต่คง Toast ไว้
  if (seenLoadedAt !== data.loadedAt) {
    setSeenLoadedAt(data.loadedAt);
    setRows(data.rows);
    setUi({});
    setConflicts({});
    setAckedHere(0);
    setNewer(0);
  }

  const tab = data.tab;
  // รายการที่ใหม่ที่สุดที่แสดงอยู่ ใช้ถามเซิร์ฟเวอร์ว่ามีรายใหม่กว่านี้ไหม
  const newestShown = useMemo(() => data.rows.reduce((m, r) => (r.createdAt > m ? r.createdAt : m), data.loadedAt && data.rows.length === 0 ? data.loadedAt : ""), [data.rows, data.loadedAt]);

  useEffect(() => {
    if (tab !== "new") return;
    let stopped = false;
    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/alerts/count?since=${encodeURIComponent(newestShown)}`, { cache: "no-store" });
        if (res.status === 401) { stopped = true; return; }
        if (!res.ok) return;
        const body = (await res.json()) as { newerCount?: number };
        if (typeof body.newerCount === "number") setNewer(body.newerCount);
      } catch { /* ถามไม่สำเร็จรอบนี้ ไม่เป็นไร ลองใหม่รอบหน้า */ }
    };
    const t = setInterval(() => void check(), COUNT_POLL_MS);
    const wake = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", wake);
    return () => { stopped = true; clearInterval(t); document.removeEventListener("visibilitychange", wake); };
  }, [tab, newestShown]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const tabCount = Math.max(0, data.newCount - ackedHere);

  const focusAfter = useCallback((nextId: string | null) => {
    requestAnimationFrame(() => {
      const target = nextId ? Array.from(document.querySelectorAll<HTMLElement>(`[data-ack-for="${nextId}"]`)).find((el) => el.offsetParent !== null) : null;
      (target ?? headingRef.current)?.focus();
    });
  }, []);

  async function closeDialog() {
    setDialogClosing(true);
    await sleep(prefersReduced() ? 100 : 150);
    setDialogClosing(false);
    setDialogRow(null);
  }

  async function ack(row: AlertRowDTO) {
    setError(null);
    setUi((u) => ({ ...u, [row.id]: "saving" }));
    const fail: AckResult = { ok: false, code: "FAILED", error: "บันทึกการรับทราบไม่สำเร็จ รายการยังอยู่ในแท็บ ใหม่ กรุณาลองใหม่อีกครั้ง" };
    // แสดง "กำลังบันทึก..." อย่างน้อย 300 ms กันภาพกะพริบ
    const [res] = await Promise.all([acknowledgeAlertAction({ alertId: row.id }).catch(() => fail), sleep(300)]);
    if (dialogRow) await closeDialog();

    if (res.ok) {
      const idx = rows.findIndex((r) => r.id === row.id);
      const next = rows.slice(idx + 1).find((r) => !ui[r.id] || ui[r.id] === "saving") ?? rows.slice(0, idx).reverse().find((r) => !ui[r.id]) ?? null;
      setUi((u) => ({ ...u, [row.id]: "leaving" }));
      await sleep(prefersReduced() ? 0 : 200);
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      setUi((u) => { const { [row.id]: _gone, ...rest } = u; return rest; }); // eslint-disable-line @typescript-eslint/no-unused-vars
      setAckedHere((n) => n + 1);
      setToast({ name: row.patientName, levelLabel: RISK_LEVEL_LABELS[row.level], remaining: res.newAlertTotal });
      setAnnounce(`รับทราบแล้ว ${row.patientName} เหลือ ${res.newAlertTotal} รายการในแท็บ ใหม่`);
      focusAfter(next?.id ?? null);
      startRefresh(() => router.refresh()); // ปรับตัวเลขบนเมนูและรายการจากเซิร์ฟเวอร์
      return;
    }
    if (res.code === "ALREADY_HANDLED") {
      // ไม่ใช่ข้อผิดพลาด: มีผู้อื่นรับทราบไปก่อน แสดงชื่อและเวลาในแถวเดิม
      setUi((u) => ({ ...u, [row.id]: "conflict" }));
      setConflicts((c) => ({ ...c, [row.id]: { by: res.by ?? null, at: res.at ?? null } }));
      setAnnounce(res.error);
      return;
    }
    setUi((u) => { const { [row.id]: _gone, ...rest } = u; return rest; }); // eslint-disable-line @typescript-eslint/no-unused-vars
    setError({ message: res.error, row });
    setAnnounce(res.error);
  }

  function requestAck(row: AlertRowDTO) {
    if (row.level === "CRITICAL") setDialogRow(row); // วิกฤตต้องยืนยันก่อน ความเสี่ยงสูงรับทราบทันที
    else void ack(row);
  }

  const critSaving = dialogRow ? ui[dialogRow.id] === "saving" : false;
  const from = (data.page - 1) * data.pageSize + 1;
  const to = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="space-y-5">
      <p role="status" aria-live="polite" className="sr-only">{announce}</p>

      {toast ? (
        <div className="ac-toast fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-green-200 bg-green-50 p-4 text-green-950 shadow-lg">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 24 24" className="mt-0.5 size-6 shrink-0" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#15803d" /><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">รับทราบแล้ว</p>
              <p className="mt-0.5">{toast.name} ({toast.levelLabel}) · เหลือ {toast.remaining} รายการในแท็บ ใหม่</p>
              <Link href={alertHref("ack")} className={`mt-1 inline-flex min-h-11 items-center font-medium text-teal-900 underline underline-offset-2 ${FOCUS}`}>ดูในแท็บ รับทราบแล้ว →</Link>
            </div>
            <button type="button" onClick={() => setToast(null)} aria-label="ปิดข้อความ" className={`-mr-2 -mt-2 ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-green-900 ${FOCUS}`}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-slate-900 outline-none">การแจ้งเตือน</h1>
          <p className="mt-1 text-sm text-slate-700">รายการที่ต้องมีผู้รับทราบ เรียงจากเร่งด่วนที่สุดก่อน</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-slate-700">อัปเดตล่าสุด {formatThaiTime(data.loadedAt)}</p>
          <button type="button" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing} aria-busy={refreshing} className={`ac-btn inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-wait ${FOCUS}`}>
            {refreshing ? <><Spinner />กำลังโหลด...</> : "โหลดใหม่"}
          </button>
        </div>
      </header>

      {tab === "new" && newer > 0 ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm text-teal-950">
          <p className="font-medium">มี Alert ใหม่ {newer} รายการ (ยังไม่แทรกในรายการ เพื่อไม่ให้แถวเลื่อนขณะกำลังกด)</p>
          <button type="button" onClick={() => startRefresh(() => router.refresh())} className={`ac-btn min-h-10 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 ${FOCUS}`}>โหลดรายการใหม่</button>
        </div>
      ) : null}

      {tab === "new" && thresholdMissing ? (
        <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
          ยังไม่ได้กำหนดเกณฑ์น้ำตาลระดับ เฝ้าระวัง / ความเสี่ยงสูง / วิกฤต: ระบบอาจยังไม่สร้าง Alert ให้ผู้ป่วยบางราย คิวที่ว่างจึงยังยืนยันความปลอดภัยไม่ได้ กรุณาให้แพทย์กำหนดที่หน้าตั้งค่า
          {canOpenSettings ? <> <Link href="/settings" className="font-medium underline underline-offset-2">ไปที่หน้าตั้งค่า</Link></> : null}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p>{error.message}</p>
          <button type="button" onClick={() => requestAck(error.row)} className={`ac-btn min-h-11 rounded-lg border border-red-400 bg-white px-4 font-medium ${FOCUS}`}>ลองใหม่</button>
        </div>
      ) : null}

      <nav aria-label="สถานะ Alert" className="border-b border-slate-200">
        <ul className="flex gap-1">
          {(["new", "ack", "cancel"] as const).map((t) => (
            <li key={t}>
              <Link href={alertHref(t)} aria-current={t === tab ? "page" : undefined} className={`flex min-h-11 items-center gap-2 border-b-2 px-3.5 text-[15px] md:px-4 ${FOCUS} ${t === tab ? "border-teal-700 font-semibold text-slate-900" : "border-transparent text-slate-700 hover:text-slate-900"}`}>
                {TAB_LABELS[t]}
                {t === "new" && tabCount > 0 ? <span className="inline-flex min-w-5.5 items-center justify-center rounded-full bg-[#991b1b] px-1.5 text-xs font-semibold text-white">{tabCount}<span className="sr-only"> รายการที่ยังไม่รับทราบ</span></span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <svg viewBox="0 0 24 24" className="mx-auto size-8 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          <p className="mt-3 text-xl font-semibold text-slate-900">
            {tab === "new" ? "ไม่มี Alert ใหม่ในขณะนี้" : tab === "ack" ? "ยังไม่มีรายการที่รับทราบ" : "ยังไม่มีรายการที่ยกเลิก"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-700">
            {tab === "new" ? "ระบบจะแสดงรายการที่นี่เมื่อพบค่าน้ำตาลหรือความดันวิกฤตของผู้ป่วย" : `แสดงเฉพาะ ${ALERT_WINDOW_DAYS} วันล่าสุด`}
          </p>
          {tab === "new" ? <Link href={alertHref("ack")} className={`ac-btn mt-5 inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50 ${FOCUS}`}>ดูแท็บ รับทราบแล้ว</Link> : null}
        </div>
      ) : (
        <>
          <div aria-hidden="true" className={`hidden h-11 items-center gap-x-4 rounded-t-xl border border-b-0 border-slate-200 bg-slate-100 px-5 text-[13px] font-semibold text-slate-700 xl:grid ${GRID.replace("md:grid-cols-[104px_minmax(0,1fr)_auto] ", "")}`}>
            <span>ระดับ</span><span>ผู้ป่วย</span><span>เรื่อง</span><span>วัดเมื่อ / กรอกเมื่อ</span>
            <span className="text-right">{tab === "new" ? "การดำเนินการ" : tab === "ack" ? "รับทราบโดย" : "สถานะ"}</span>
          </div>
          <ul aria-label={`รายการ Alert แท็บ ${TAB_LABELS[tab]}`} className="max-md:space-y-3 md:divide-y md:divide-slate-200 md:overflow-hidden md:rounded-xl md:border md:border-slate-200 md:bg-white xl:rounded-t-none">
            {rows.map((r) => {
              const st = ui[r.id];
              const conflict = conflicts[r.id];
              const hot = tab === "new" && r.level === "CRITICAL" && st !== "conflict";
              return (
                <li key={r.id} className="ac-li" data-leaving={st === "leaving" ? "true" : undefined}>
                  <div className="ac-inner">
                    <div className={`grid items-center gap-x-4 gap-y-3 p-4 md:px-5 ${GRID} max-md:rounded-xl max-md:border ${st === "conflict" ? "bg-slate-100 max-md:border-slate-200" : hot ? "bg-red-50 max-md:border-2 max-md:border-red-300" : "bg-white max-md:border-slate-200"}`}>
                      <div><RiskBadge level={r.level} /></div>
                      <div className="min-w-0 space-y-2 xl:contents">
                        <div>
                          <Link href={`/patients/${r.patientId}`} className={`text-[15px] font-semibold text-slate-900 underline-offset-2 hover:underline ${FOCUS}`}>{r.patientName}</Link>
                          <p className="text-[13px] text-slate-700">HN {r.hn}</p>
                        </div>
                        <div>
                          <p className="text-[15px] text-slate-900">{r.summary}</p>
                          {r.valueText ? <p className={`text-lg font-semibold ${r.level === "CRITICAL" ? "text-[#991b1b]" : "text-slate-900"}`}>{r.valueText}</p> : null}
                        </div>
                        <div className="space-y-1 text-[13px] text-slate-700">
                          <p className="flex flex-wrap items-center gap-2">
                            <span>{r.valueText?.endsWith("mmHg") ? "ตรวจ" : "วัด"} {formatThaiDate(r.measuredDate)}</span>
                            {r.backdatedDays > 0 ? <span className="rounded-md border border-slate-500 bg-white px-2 py-0.5 text-xs font-medium text-slate-800">ย้อนหลัง {r.backdatedDays} วัน</span> : null}
                          </p>
                          <p>กรอก {formatThaiDateTime(r.createdAt)}</p>
                        </div>
                      </div>
                      <div className="md:justify-self-end xl:justify-self-stretch xl:text-right">
                        {tab === "new" && st === "conflict" ? (
                          <div className="text-[13px] md:text-right">
                            <p className="text-sm font-semibold text-slate-900">{conflict?.by ?? "ผู้ใช้อื่น"} รับทราบไปแล้ว</p>
                            <p className="text-slate-700">{conflict?.at ? `${formatThaiDateTime(conflict.at)} · ` : ""}รายการนี้จะหายจากแท็บ ใหม่เมื่อโหลดใหม่</p>
                          </div>
                        ) : tab === "new" ? (
                          <button
                            type="button" data-ack-for={r.id} disabled={st === "saving"} aria-busy={st === "saving"} onClick={() => requestAck(r)}
                            aria-label={`รับทราบ Alert ของ ${r.patientName}`}
                            className={`ac-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-teal-800 bg-white px-5 text-sm font-semibold text-teal-900 hover:bg-teal-50 disabled:cursor-wait disabled:opacity-70 max-md:min-h-12 max-md:w-full ${FOCUS}`}
                          >
                            {st === "saving" ? <><Spinner />กำลังบันทึก...</> : "รับทราบ"}
                          </button>
                        ) : tab === "ack" ? (
                          <div className="text-[13px] md:text-right">
                            <p className="text-sm font-semibold text-slate-900">{r.ackByName ?? "-"}</p>
                            <p className="text-slate-700">{formatThaiDateTime(r.ackAt)}</p>
                          </div>
                        ) : (
                          <div className="text-[13px] md:text-right">
                            <p className="text-sm font-semibold text-slate-900">ยกเลิกอัตโนมัติ</p>
                            <p className="text-slate-700">ค่าต้นเหตุถูกยกเลิกหรือแก้ไขจนไม่เข้าเกณฑ์</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              {tab === "new"
                ? data.total > rows.length + ackedHere ? `แสดง ${rows.length} จาก ${Math.max(0, data.total - ackedHere)} รายการ (เรียงจากเร่งด่วนที่สุด)` : `แสดง ${rows.length} รายการ`
                : `แสดง ${from}–${to} จาก ${data.total} รายการ · เฉพาะ ${ALERT_WINDOW_DAYS} วันล่าสุด`}
            </p>
            {tab !== "new" && data.total > data.pageSize ? (
              <div className="flex gap-2">
                {data.page > 1 ? <Link href={alertHref(tab, data.page - 1)} className={`ac-btn inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 ${FOCUS}`}>ก่อนหน้า</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">ก่อนหน้า</span>}
                {to < data.total ? <Link href={alertHref(tab, data.page + 1)} className={`ac-btn inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 ${FOCUS}`}>ถัดไป</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">ถัดไป</span>}
              </div>
            ) : null}
          </div>
        </>
      )}

      <AckDialog row={dialogRow} closing={dialogClosing} saving={critSaving} onCancel={() => void closeDialog()} onConfirm={() => dialogRow && void ack(dialogRow)} />
    </div>
  );
}
