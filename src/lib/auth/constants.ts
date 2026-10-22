// ค่าคงที่เกี่ยวกับ session (ใช้ได้ทั้งฝั่ง server และ client)

/** ไม่มีการใช้งานเกินเวลานี้ให้ออกจากระบบ: 30 นาที (ตามกฎของโปรเจกต์) */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** ฝั่ง server อัปเดต lastActiveAt อย่างน้อยทุก 1 นาที เพื่อไม่ให้เขียนฐานข้อมูลทุก request */
export const SERVER_TOUCH_INTERVAL_MS = 60 * 1000;

/** ฝั่งหน้าเว็บส่งสัญญาณว่ายังใช้งานอยู่ทุก 5 นาที (เฉพาะตอนที่มีการเคลื่อนไหวจริง) */
export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/** เหตุผลที่ถูกส่งกลับหน้า Login (รับเฉพาะค่าเหล่านี้) */
export const LOGOUT_REASONS = ["timeout", "disabled", "noprofile"] as const;
export type LogoutReason = (typeof LOGOUT_REASONS)[number];

export function parseLogoutReason(value: string | null | undefined): LogoutReason {
  return (LOGOUT_REASONS as readonly string[]).includes(value ?? "")
    ? (value as LogoutReason)
    : "timeout";
}
