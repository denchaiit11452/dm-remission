// ตรวจผู้ใช้สำหรับ route ที่หน้าเว็บเรียกเป็นระยะ (polling)
// สำคัญ: ไม่อัปเดต lastActiveAt โดยตั้งใจ การเรียกเป็นระยะจึงไม่ทำให้เซสชันไม่หมดเวลา (ไม่ใช้งาน 30 นาทีต้องออกจากระบบ)
import { NextResponse } from "next/server";
import { IDLE_TIMEOUT_MS } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const NO_STORE = { "Cache-Control": "no-store" };

export type ApiUser = { id: string };

/** ผ่าน = คืนผู้ใช้, ไม่ผ่าน = คืน Response 401 พร้อมใช้งาน */
export async function requireApiUser(): Promise<{ user: ApiUser } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const unauthorized = (status: string) => ({ response: NextResponse.json({ status }, { status: 401, headers: NO_STORE }) });
  if (!user) return unauthorized("unauthorized");
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true, isActive: true, lastActiveAt: true } });
  if (!profile || !profile.isActive) return unauthorized("unauthorized");
  const last = profile.lastActiveAt?.getTime() ?? null;
  if (last !== null && Date.now() - last > IDLE_TIMEOUT_MS) return unauthorized("expired");
  return { user: { id: profile.id } };
}
