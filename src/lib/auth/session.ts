// ชั้นตรวจสิทธิ์กลาง: ทุกหน้า/Server Action/Route Handler ที่ต้อง Login ต้องเรียกผ่านที่นี่
//
// สำคัญ: Layout ใน Next.js ไม่ render ใหม่ทุกครั้งที่เปลี่ยนหน้า
// ดังนั้น "ทุกหน้า (page.tsx) และทุก Server Action" ต้องเรียก requireUser() หรือ requireRole() เอง
// ห้ามพึ่งการตรวจใน layout อย่างเดียว
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { IDLE_TIMEOUT_MS, SERVER_TOUCH_INTERVAL_MS } from "./constants";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

/**
 * ตรวจว่าผู้ใช้ Login อยู่ มีโปรไฟล์ ยังเปิดใช้งาน และไม่หมดเวลาเพราะไม่ใช้งาน
 * ถ้าไม่ผ่าน จะ redirect ออกไปเลย (ไม่คืนค่า)
 * ใช้ cache() เพื่อให้ request เดียวกันตรวจครั้งเดียว ไม่ query ซ้ำ
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  // ใช้ getUser() (ตรวจกับ Supabase Auth จริง) ไม่ใช้ getSession() ที่เชื่อค่าใน cookie
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });

  if (!profile) {
    redirect("/auth/timeout?reason=noprofile");
  }
  if (!profile.isActive) {
    redirect("/auth/timeout?reason=disabled");
  }

  // ตรวจเวลาไม่ใช้งานฝั่ง server (ชั้นที่ 2 ต่อจากตัวจับเวลาในหน้าเว็บ)
  // ผู้ใช้ปิดตัวจับเวลาในเบราว์เซอร์เองก็ข้ามข้อนี้ไม่ได้
  const now = Date.now();
  const last = profile.lastActiveAt?.getTime() ?? null;

  if (last !== null && now - last > IDLE_TIMEOUT_MS) {
    redirect("/auth/timeout?reason=timeout");
  }

  if (last === null || now - last > SERVER_TOUCH_INTERVAL_MS) {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { lastActiveAt: new Date(now) },
    });
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
  };
});

/**
 * ตรวจว่ามี Role ที่อนุญาต ถ้าไม่มีให้ไปหน้า "ไม่มีสิทธิ์"
 * ตัวอย่าง: const user = await requireRole("ADMIN", "DOCTOR");
 */
export async function requireRole(...allowed: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    redirect("/forbidden");
  }
  return user;
}

/** ใช้ตัดสินใจแสดง/ซ่อนส่วนของหน้า (ไม่ใช่การตรวจสิทธิ์จริง การตรวจจริงต้องทำที่ requireRole) */
export function hasRole(user: CurrentUser, ...roles: Role[]): boolean {
  return roles.includes(user.role);
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  DOCTOR: "แพทย์",
  STAFF: "พยาบาล/เจ้าหน้าที่",
};
