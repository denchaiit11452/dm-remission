import { describe, expect, it } from "vitest";
import { classifyLoginError } from "./login-error";

describe("classifyLoginError", () => {
  it("รหัสผ่านผิดจริง: นับเป็นการกรอกผิด", () => {
    const r = classifyLoginError({ code: "invalid_credentials", status: 400, name: "AuthApiError" });
    expect(r).toMatchObject({ kind: "invalid_credentials", countsAsFailedAttempt: true });
  });
  it("ไลบรารีรุ่นเก่าที่ไม่มี code แต่ข้อความตรง", () => {
    expect(classifyLoginError({ status: 400, message: "Invalid login credentials" }).kind).toBe("invalid_credentials");
  });
  it("อีเมลยังไม่ยืนยัน/ถูกแบน: บอกสาเหตุจริง ไม่นับ", () => {
    expect(classifyLoginError({ code: "email_not_confirmed", status: 400 })).toMatchObject({ kind: "email_not_confirmed", countsAsFailedAttempt: false });
    expect(classifyLoginError({ code: "user_banned", status: 400 })).toMatchObject({ kind: "banned", countsAsFailedAttempt: false });
  });
  it("ถูกจำกัดความถี่: ไม่นับ", () => {
    expect(classifyLoginError({ code: "over_request_rate_limit", status: 429 })).toMatchObject({ kind: "rate_limited", countsAsFailedAttempt: false });
    expect(classifyLoginError({ status: 429 }).kind).toBe("rate_limited");
  });
  it("เน็ตสะดุด/ฝั่ง Supabase ขัดข้อง: ไม่ใช่รหัสผ่านผิด ไม่นับ", () => {
    for (const e of [{ name: "AuthRetryableFetchError", status: 0 }, { status: 502 }, { status: 504 }, { code: "request_timeout" }]) {
      const r = classifyLoginError(e);
      expect(r.kind).toBe("unavailable");
      expect(r.countsAsFailedAttempt).toBe(false);
      expect(r.message).not.toMatch(/รหัสผ่านไม่ถูกต้อง/);
    }
  });
  it("ไม่รู้สาเหตุ/ไม่มี error: ปลอดภัยไว้ก่อน ไม่ฟันธงว่ารหัสผ่านผิด", () => {
    expect(classifyLoginError({ status: 418 })).toMatchObject({ kind: "unavailable", countsAsFailedAttempt: false });
    expect(classifyLoginError(null).countsAsFailedAttempt).toBe(false);
  });
});
