"use client";

// เฝ้าดู Alert วิกฤตรายใหม่ทั่วทั้งระบบ (ติดตั้งใน layout หลัง Login ครั้งเดียว ไม่หายเมื่อเปลี่ยนหน้า)
// ถามเซิร์ฟเวอร์ทุก 15 วินาที -> ถ้ามีรายใหม่ เด้งกล่องทับหน้าจอทันที + เสียงสั้น ๆ (ถ้าเบราว์เซอร์อนุญาต)
import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMPTY_STATE, FAILURES_BEFORE_WARNING, POLL_INTERVAL_MS, applyPoll, mergeQueue, parseAlerts, parseState, reconcileQueue,
  type CriticalAlertDTO, type WatcherState,
} from "@/lib/critical-alerts";
import CriticalAlertDialog from "./CriticalAlertDialog";

const STATE_KEY = "dm.critical.watch";
const MUTE_KEY = "dm.critical.mute";

function readMute(): boolean {
  try { return window.localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export default function CriticalAlertWatcher() {
  const [queue, setQueue] = useState<CriticalAlertDTO[]>([]);
  const [offline, setOffline] = useState(false);
  const [muted, setMuted] = useState(false);
  const state = useRef<WatcherState>(EMPTY_STATE);
  const failures = useRef(0);
  const inFlight = useRef(false);
  const stopped = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const baseTitle = useRef<string | null>(null);

  // เสียง: เบราว์เซอร์อนุญาตเมื่อผู้ใช้เคยกด/แตะ/พิมพ์บนหน้าเว็บอย่างน้อยหนึ่งครั้ง
  useEffect(() => {
    const unlock = () => {
      if (!audio.current) {
        const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (C) audio.current = new C();
      }
      void audio.current?.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  const beep = useCallback(() => {
    const ctx = audio.current;
    if (mutedRef.current || !ctx || ctx.state !== "running") return;
    const t0 = ctx.currentTime;
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      const s = t0 + i * 0.22;
      gain.gain.setValueAtTime(0.0001, s); gain.gain.exponentialRampToValueAtTime(0.25, s + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
      osc.connect(gain).connect(ctx.destination); osc.start(s); osc.stop(s + 0.2);
    });
  }, []);

  const poll = useCallback(async () => {
    if (stopped.current || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/alerts/critical", { cache: "no-store" });
      if (res.status === 401) { stopped.current = true; return; } // หมดเวลา/ออกจากระบบ: หยุดถาม (การเปลี่ยนหน้าครั้งถัดไปจะพาไป Login)
      const alerts = res.ok ? parseAlerts(await res.json().catch(() => null)) : null;
      if (!alerts) throw new Error("bad response");
      failures.current = 0; setOffline(false);
      const { state: next, toShow } = applyPoll(state.current, alerts);
      state.current = next;
      try { window.sessionStorage.setItem(STATE_KEY, JSON.stringify(next)); } catch { /* ไม่เป็นไร */ }
      setQueue((q) => mergeQueue(reconcileQueue(q, alerts), toShow));
      if (toShow.length > 0) beep();
    } catch {
      failures.current += 1;
      if (failures.current >= FAILURES_BEFORE_WARNING) setOffline(true); // ระบบแจ้งเตือนเงียบไปเองไม่ได้ ต้องบอกผู้ใช้
    } finally {
      inFlight.current = false;
    }
  }, [beep]);

  useEffect(() => {
    try { state.current = parseState(window.sessionStorage.getItem(STATE_KEY)); } catch { state.current = EMPTY_STATE; }
    const m = readMute(); mutedRef.current = m; setMuted(m); // eslint-disable-line react-hooks/set-state-in-effect
    void poll();
    const t = setInterval(() => void poll(), POLL_INTERVAL_MS);
    const wake = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", wake); window.removeEventListener("online", wake); };
  }, [poll]);

  // แท็บที่ถูกพับอยู่: ให้ชื่อแท็บบอกว่ามีผู้ป่วยวิกฤต
  useEffect(() => {
    if (queue.length > 0) {
      if (baseTitle.current === null) baseTitle.current = document.title;
      document.title = `(วิกฤต) ${baseTitle.current}`;
    } else if (baseTitle.current !== null) {
      document.title = baseTitle.current; baseTitle.current = null;
    }
  }, [queue.length]);

  const close = useCallback(() => setQueue((q) => q.slice(1)), []);
  const toggleMute = useCallback(() => {
    const next = !mutedRef.current; mutedRef.current = next; setMuted(next);
    try { window.localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch { /* ไม่เป็นไร */ }
  }, []);

  return (
    <>
      <CriticalAlertDialog queue={queue} muted={muted} onClose={close} onToggleMute={toggleMute} />
      {offline ? (
        <p role="status" className="fixed bottom-20 left-4 z-40 max-w-sm rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-md md:bottom-4">
          ระบบเด้งเตือนผู้ป่วยวิกฤตใช้ไม่ได้ชั่วคราว กรุณาตรวจหน้าการแจ้งเตือนด้วยตนเองเป็นระยะ
        </p>
      ) : null}
    </>
  );
}
