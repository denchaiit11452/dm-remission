"use server";

// Server Action: เข้าสู่ระบบด้วย Supabase Auth (อีเมล + รหัสผ่าน)
// ฉบับนี้เพิ่มการจับข้อผิดพลาดตอนฐานข้อมูลเชื่อมไม่ได้ เพื่อแสดงข้อความที่หน้า Login
// แทนหน้า error ของ Next.js (ส่วนที่เหลือเหมือนฉบับเดิม)
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

// ข้อความเดียวกันทุกกรณีที่ล็อกอินไม่ผ่าน เพื่อไม่บอกใบ้ว่าอีเมลนี้มีอยู่ในระบบหรือไม่
const INVALID_CREDENTIALS = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
const DB_UNAVAILABLE = "เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { error: INVALID_CREDENTIALS };
  }

  // ต้องมีโปรไฟล์และยังเปิดใช้งานอยู่ จึงจะเข้าระบบได้
  let profile;
  try {
    profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  } catch (e) {
    console.error("login: อ่านโปรไฟล์ไม่ได้ (ฐานข้อมูลเชื่อมไม่ได้)", e);
    await supabase.auth.signOut();
    return { error: DB_UNAVAILABLE };
  }

  if (!profile || !profile.isActive) {
    await supabase.auth.signOut();
    return { error: "บัญชีนี้ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  // เริ่มนับเวลาไม่ใช้งานใหม่ตั้งแต่ตอนเข้าสู่ระบบ
  try {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { lastActiveAt: new Date() },
    });
  } catch (e) {
    console.error("login: อัปเดตเวลาใช้งานไม่ได้", e);
    await supabase.auth.signOut();
    return { error: DB_UNAVAILABLE };
  }

  const h = await headers();
  try {
    await prisma.auditLog.create({
      data: {
        userId: profile.id,
        action: "LOGIN",
        entity: "auth",
        ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent"),
      },
    });
  } catch {
    // บันทึก audit ไม่สำเร็จ ต้องไม่ขวางการเข้าสู่ระบบ
  }

  // redirect() ต้องอยู่นอก try/catch เสมอ (มันทำงานด้วยการ throw)
  redirect("/dashboard");
}