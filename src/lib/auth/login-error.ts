// แยกสาเหตุที่ Supabase ตอบกลับเมื่อล็อกอินไม่ผ่าน (ฟังก์ชันล้วน ทดสอบได้)
// เดิมทุก error ถูกแสดงเป็น "อีเมลหรือรหัสผ่านไม่ถูกต้อง" และนับเป็นการกรอกผิด ทำให้
// เน็ตสะดุด/ถูกจำกัดความถี่/อีเมลยังไม่ยืนยัน ดูเหมือนใส่รหัสผ่านผิด และกินโอกาสก่อนถูกระงับ 15 นาที

export type LoginErrorKind = "invalid_credentials" | "email_not_confirmed" | "rate_limited" | "banned" | "unavailable";

export type LoginErrorInfo = {
  kind: LoginErrorKind;
  message: string;
  /** นับเป็นการกรอกรหัสผ่านผิดเพื่อระงับ 15 นาทีหรือไม่ (เฉพาะรหัสผ่านผิดจริง) */
  countsAsFailedAttempt: boolean;
};

type AuthErrorLike = { code?: string | null; status?: number | null; name?: string | null; message?: string | null };

export function classifyLoginError(error: AuthErrorLike | null | undefined): LoginErrorInfo {
  const code = error?.code ?? "";
  const status = error?.status ?? null;
  const name = error?.name ?? "";

  if (code === "invalid_credentials") {
    return { kind: "invalid_credentials", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", countsAsFailedAttempt: true };
  }
  if (code === "email_not_confirmed") {
    return { kind: "email_not_confirmed", message: "บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาติดต่อผู้ดูแลระบบ", countsAsFailedAttempt: false };
  }
  if (code === "user_banned") {
    return { kind: "banned", message: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ", countsAsFailedAttempt: false };
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429) {
    return { kind: "rate_limited", message: "มีการพยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่", countsAsFailedAttempt: false };
  }
  // เน็ตสะดุด/หมดเวลา/ฝั่ง Supabase ขัดข้อง (status 0, 5xx, หรือ AuthRetryableFetchError)
  if (name === "AuthRetryableFetchError" || code === "request_timeout" || code === "unexpected_failure" || status === 0 || (status !== null && status >= 500)) {
    return { kind: "unavailable", message: "เชื่อมต่อระบบยืนยันตัวตนไม่ได้ชั่วคราว ไม่ใช่รหัสผ่านผิด กรุณาลองใหม่อีกครั้ง", countsAsFailedAttempt: false };
  }
  // 400 ที่ไม่มีรหัสชัดเจน (ไลบรารีรุ่นเก่า): ข้อความ "Invalid login credentials"
  if ((status === 400 || status === 401) && /invalid login credentials/i.test(error?.message ?? "")) {
    return { kind: "invalid_credentials", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", countsAsFailedAttempt: true };
  }
  // ไม่รู้สาเหตุ: อย่าบอกว่ารหัสผ่านผิด และไม่นับเป็นการกรอกผิด
  return { kind: "unavailable", message: "เข้าสู่ระบบไม่สำเร็จด้วยสาเหตุที่ไม่ทราบ กรุณาลองใหม่ หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ", countsAsFailedAttempt: false };
}
