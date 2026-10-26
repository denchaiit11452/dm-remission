"use server";

// Server Action: เข้าสู่ระบบด้วย Supabase Auth (อีเมล + รหัสผ่าน)
// เพิ่มการจำกัดการพยายามเข้าสู่ระบบ: หากผิดครบ 3 ครั้งจะถูกระงับ 15 นาที
// และส่ง lockedUntil เพื่อให้นับเวลาถอยหลังแบบป้องกันการรีเฟรช
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  checkLoginLockout,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/auth/rateLimit";

export type LoginState = {
  error?: string;
  isLocked?: boolean;
  lockedUntil?: number; // timestamp in ms
  email?: string;
};

const loginSchema = z.object({
  email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

const INVALID_CREDENTIALS = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
const DB_UNAVAILABLE = "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ";

/**
 * Server Action สำหรับเช็คสถานะ Lockout ตั้งแต่โหลดหน้าเว็บ
 */
export async function getInitialLockoutStatus(): Promise<{ isLocked: boolean; lockedUntil?: number }> {
  const h = await headers();
  const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
  const status = checkLoginLockout(clientIp);
  if (status.isLocked && status.lockedUntil) {
    return { isLocked: true, lockedUntil: status.lockedUntil };
  }
  return { isLocked: false };
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

  const rawEmail = (formData.get("email") as string | null)?.trim() || "";

  // 1. ตรวจสอบว่า IP นี้โดนระงับอยู่หรือไม่
  const lockoutStatus = checkLoginLockout(clientIp);
  if (lockoutStatus.isLocked) {
    return {
      error: "ระบบถูกระงับการเข้าใช้งานชั่วคราวเนื่องจากกรอกรหัสผ่านผิดเกิน 3 ครั้ง",
      isLocked: true,
      lockedUntil: lockoutStatus.lockedUntil,
      email: rawEmail,
    };
  }

  const parsed = loginSchema.safeParse({
    email: rawEmail,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS,
      email: rawEmail,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // บันทึกการเข้าสู่ระบบผิดพลาด 1 ครั้งของ IP นี้
    const failStatus = recordFailedLogin(clientIp);
    if (failStatus.isLocked) {
      return {
        error: "คุณกรอกรหัสผ่านผิดครบ 3 ครั้ง ระบบได้ระงับการเข้าใช้งานชั่วคราว 15 นาที",
        isLocked: true,
        lockedUntil: failStatus.lockedUntil,
        email: rawEmail,
      };
    }
    return {
      error: `${INVALID_CREDENTIALS} (เหลือโอกาสลองอีก ${failStatus.remainingAttempts} ครั้ง)`,
      email: rawEmail,
    };
  }

  // ต้องมีโปรไฟล์และยังเปิดใช้งานอยู่ จึงจะเข้าระบบได้
  let profile;
  try {
    profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  } catch (e) {
    console.error("login: อ่านโปรไฟล์ไม่ได้ (ฐานข้อมูลเชื่อมไม่ได้)", e);
    await supabase.auth.signOut();
    return {
      error: DB_UNAVAILABLE,
      email: rawEmail,
    };
  }

  if (!profile || !profile.isActive) {
    await supabase.auth.signOut();
    return {
      error: "บัญชีนี้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
      email: rawEmail,
    };
  }

  // เข้าสู่ระบบสำเร็จ: ล้างประวัติการกรอกผิดของ IP นี้
  clearLoginAttempts(clientIp);

  // เริ่มนับเวลาไม่ใช้งานใหม่ตั้งแต่ตอนเข้าสู่ระบบ
  try {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { lastActiveAt: new Date() },
    });
  } catch (e) {
    console.error("login: อัปเดตเวลาใช้งานไม่ได้", e);
    await supabase.auth.signOut();
    return {
      error: DB_UNAVAILABLE,
      email: rawEmail,
    };
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: profile.id,
        action: "LOGIN",
        entity: "auth",
        ipAddress: clientIp !== "unknown-ip" ? clientIp : null,
        userAgent: h.get("user-agent"),
      },
    });
  } catch {
    // บันทึก audit ไม่สำเร็จ ต้องไม่ขวางการเข้าสู่ระบบ
  }

  // redirect() ต้องอยู่นอก try/catch เสมอ (มันทำงานด้วยการ throw)
  redirect("/dashboard");
}