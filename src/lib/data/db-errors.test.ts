import { describe, expect, it } from "vitest";
import { isDbUnavailable } from "./db-errors";

describe("isDbUnavailable", () => {
  it("รหัส Prisma ที่แปลว่าเชื่อมต่อไม่ได้", () => {
    for (const code of ["P1001", "P1002", "P1008", "P1017", "P2024"]) {
      expect(isDbUnavailable({ name: "PrismaClientKnownRequestError", code })).toBe(true);
    }
  });
  it("PrismaClientInitializationError (ตั้งค่า/เชื่อมต่อเริ่มต้นไม่สำเร็จ)", () => {
    expect(isDbUnavailable({ name: "PrismaClientInitializationError", message: "x" })).toBe(true);
  });
  it("จับจากข้อความที่ผู้ใช้เจอจริง", () => {
    expect(isDbUnavailable(new Error("Can't reach database server at `aws-0-ap-southeast-1.pooler.supabase.com:6543`"))).toBe(true);
    expect(isDbUnavailable(new Error("Timed out fetching a new connection from the connection pool"))).toBe(true);
  });
  it("มองลง cause ที่ซ้อนอยู่", () => {
    expect(isDbUnavailable(new Error("wrapper", { cause: { code: "P1001" } }))).toBe(true);
  });
  it("ข้อผิดพลาดอื่นไม่ใช่: ข้อมูลซ้ำ ไม่พบแถว บั๊กทั่วไป และ redirect", () => {
    expect(isDbUnavailable({ code: "P2002" })).toBe(false);
    expect(isDbUnavailable({ code: "P2025" })).toBe(false);
    expect(isDbUnavailable(new TypeError("x is undefined"))).toBe(false);
    expect(isDbUnavailable(Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" }))).toBe(false);
    expect(isDbUnavailable(null)).toBe(false);
    expect(isDbUnavailable("P1001")).toBe(false);
  });
  it("cause วนกลับตัวเองไม่ทำให้ค้าง", () => {
    const a: { cause?: unknown } = {};
    a.cause = a;
    expect(isDbUnavailable(a)).toBe(false);
  });
});
