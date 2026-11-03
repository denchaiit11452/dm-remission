"use client";

import { useEffect } from "react";
import { LOGIN_PENDING_KEY } from "@/lib/critical-alerts";

/** วางในหน้า login เท่านั้น: ทุกการเข้าสู่ระบบผ่านหน้านี้ หน้าแรกหลังเข้าระบบจึงรู้ว่าต้องสรุปผู้ป่วยวิกฤต */
export default function LoginAlertMarker() {
  useEffect(() => {
    try { window.localStorage.setItem(LOGIN_PENDING_KEY, "1"); } catch { /* เบราว์เซอร์ไม่อนุญาต: ใช้กล่องเตือนรายใหม่ตามปกติ */ }
  }, []);
  return null;
}
