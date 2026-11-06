"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { buildConfetti } from "@/lib/confetti";
import { SECONDARY_BUTTON, PRIMARY_BUTTON } from "./fields";
import "./save-celebration.css";

export const CELEBRATION_VISIBLE_MS = 6000;
const CONFETTI_COUNT = 80;
/** กระดาษสีเริ่มแตกตรงจังหวะที่ตราปั๊มลงแฟ้ม (ตรงกับ save-celebration.css) */
const IMPACT_MS = 300;

type Props = {
  /** ใช้เป็น seed ของกระดาษสี */
  id: number;
  title: string;
  detail?: string;
  name: string;
  nextHref: string;
  nextLabel: string;
  onDismiss: () => void;
};

function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => buildConfetti(CONFETTI_COUNT, seed), [seed]);
  return (
    <div aria-hidden="true" className="save-cel-confetti">
      {pieces.map((piece, index) => (
        <span
          key={index}
          data-shape={piece.shape}
          className="save-cel-piece"
          style={{
            "--x": `${piece.xVw}vw`,
            "--y": `${piece.yVh}vh`,
            "--drift": `${piece.driftVw}vw`,
            "--spin": `${piece.spinDeg}deg`,
            width: piece.size,
            height: piece.shape === "paper" ? piece.size * 0.6 : piece.size,
            backgroundColor: piece.color,
            animationDelay: `${IMPACT_MS + piece.delayMs}ms`,
            animationDuration: `${piece.durationMs}ms`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function SuccessMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-12 shrink-0 overflow-visible text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle className="save-cel-ripple" cx="12" cy="12" r="10" strokeWidth="1.2" />
      <circle className="save-cel-ripple save-cel-ripple-late" cx="12" cy="12" r="10" strokeWidth="1.2" />
      <g className="save-cel-mark">
        <circle className="save-cel-ring" cx="12" cy="12" r="10" pathLength={1} />
        <path className="save-cel-check" d="M7.5 12.5l3 3 6-6.5" strokeWidth="2.6" pathLength={1} />
      </g>
    </svg>
  );
}

/**
 * ฉลองการเพิ่มผู้ป่วยใหม่: ตราเขียวปั๊มลงแฟ้ม กล่องกระโดด แล้วกระดาษสีแตกกระจาย (คู่ตรงข้ามกับตราแดงตอนกรอกผิด)
 * ไม่ยึดโฟกัสและไม่บังการคลิกหน้าหลัง ผู้ใช้จึงทำงานต่อได้ทันที ข้อความอ่านผ่าน role="status" ของ SaveToastProvider
 */
/**
 * นับเวลาปิดเอง โดยหยุดนับเมื่อผู้ใช้กำลังใช้กล่อง (ชี้เมาส์ หรือโฟกัสอยู่ข้างใน) และเมื่อสลับแท็บ
 * กลับมานับต่อจากเวลาที่เหลือ ไม่เริ่มใหม่ (WCAG 2.2.1)
 */
function useAutoClose(onExpire: () => void) {
  const [engaged, setEngaged] = useState(false);
  const [hidden, setHidden] = useState(false);
  const remainingRef = useRef(CELEBRATION_VISIBLE_MS);
  const paused = engaged || hidden;

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const timer = setTimeout(onExpire, remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startedAt));
    };
  }, [paused, onExpire]);

  return { paused, setEngaged };
}

export default function SaveCelebration({ id, title, detail, name, nextHref, nextLabel, onDismiss }: Props) {
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => setClosing(true), []);
  const { paused, setEngaged } = useAutoClose(close);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const syncEngaged = () => setEngaged(hoverRef.current || focusRef.current);

  useEffect(() => {
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [close]);

  return (
    <div
      data-closing={closing ? "" : undefined}
      onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) onDismiss(); }}
      className="save-cel fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
    >
      <div aria-hidden="true" className="save-cel-wash absolute inset-0" />
      <Confetti seed={id} />

      <div
        // จอสัมผัส: pointerleave เกิดทันทีหลังยกนิ้ว จึงนับเฉพาะเมาส์และปากกา ส่วนการแตะปุ่มทำงานทันทีอยู่แล้ว
        onPointerEnter={(e) => { if (e.pointerType !== "touch") { hoverRef.current = true; syncEngaged(); } }}
        onPointerLeave={() => { hoverRef.current = false; syncEngaged(); }}
        onFocus={() => { focusRef.current = true; syncEngaged(); }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { focusRef.current = false; syncEngaged(); } }}
        className="save-cel-card pointer-events-auto relative w-[min(28rem,100%)] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl"
      >
        <div className="save-cel-band relative flex items-center gap-4 overflow-hidden bg-primary px-5 py-4 text-white">
          <SuccessMark />
          <div className="min-w-0">
            <p className="save-cel-stamp inline-block rounded-md border-[3px] border-sidebar-accent px-3 py-0.5 text-2xl font-semibold leading-tight tracking-wide text-sidebar-accent">เยี่ยมมาก!</p>
            <p className="mt-2 text-[17px] font-semibold leading-6">{title}</p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="break-words text-xl font-semibold leading-snug">{name}</p>
            {detail ? <p className="mt-0.5 text-sm tabular-nums text-slate-700">{detail}</p> : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setClosing(true)} className={SECONDARY_BUTTON}>ปิด</button>
            <Link href={nextHref} onClick={() => setClosing(true)} className={PRIMARY_BUTTON}>{nextLabel}</Link>
          </div>
        </div>

        {/* บอกเวลาที่เหลือก่อนปิดเอง ความยาวตรงกับ CELEBRATION_VISIBLE_MS */}
        <span
          aria-hidden="true"
          className="save-cel-timer absolute inset-x-0 bottom-0 h-1 bg-brand-tile"
          // แถบหยุดพร้อมตัวจับเวลา จึงบอกเวลาที่เหลือตรงกันเสมอ
          style={{ animationDuration: `${CELEBRATION_VISIBLE_MS}ms`, animationPlayState: paused || closing ? "paused" : "running" }}
        />
      </div>
    </div>
  );
}
