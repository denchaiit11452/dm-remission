"use client";

// ตัวจับเวลาไม่ใช้งาน 30 นาที ฝั่งหน้าเว็บ
// - ไม่มีการเคลื่อนไหวครบเวลา -> ไปที่ /auth/timeout (ล้าง session แล้วกลับหน้า Login)
// - มีการเคลื่อนไหว -> รีเซ็ตเวลา และส่ง heartbeat ไปบอก server เป็นระยะ
// - กลับมาจาก Back/Forward cache ของเบราว์เซอร์ -> โหลดหน้าใหม่ เพื่อให้ proxy ตรวจ session อีกรอบ
import { useEffect } from "react";
import { HEARTBEAT_INTERVAL_MS, IDLE_TIMEOUT_MS } from "@/lib/auth/constants";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
const ACTIVITY_THROTTLE_MS = 5_000;
const TIMEOUT_URL = "/auth/timeout?reason=timeout";

export default function IdleLogout() {
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    let lastActivityAt = Date.now();
    let lastHeartbeatAt = Date.now();
    let lastResetAt = 0;

    const expire = () => window.location.replace(TIMEOUT_URL);

    const armTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(expire, IDLE_TIMEOUT_MS);
    };

    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/auth/heartbeat", { method: "POST", cache: "no-store" });
        if (res.status === 401) expire();
      } catch {
        // เครือข่ายสะดุดชั่วคราว ปล่อยผ่าน ตัวจับเวลาและ server ยังคงตรวจอยู่
      }
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastResetAt < ACTIVITY_THROTTLE_MS) return;
      lastResetAt = now;
      lastActivityAt = now;
      armTimer();

      if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatAt = now;
        void sendHeartbeat();
      }
    };

    // เครื่องหลับ/สลับแท็บ ตัวจับเวลาของเบราว์เซอร์อาจเดินช้า จึงเช็กเวลาจริงตอนกลับมาที่หน้านี้
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && Date.now() - lastActivityAt > IDLE_TIMEOUT_MS) {
        expire();
      }
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);
    armTimer();

    return () => {
      clearTimeout(idleTimer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
