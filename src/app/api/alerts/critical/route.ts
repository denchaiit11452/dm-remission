// หน้าเว็บถามรายการ Alert วิกฤตที่ยังไม่รับทราบทุก ~15 วินาที เพื่อเด้งเตือนรายใหม่ทันที
// สำคัญ: route นี้ "ไม่อัปเดต lastActiveAt" โดยตั้งใจ การถามเป็นระยะจึงไม่ทำให้เซสชันไม่หมดเวลา (ไม่ใช้งาน 30 นาทีต้องออกจากระบบ)
import { NextResponse } from "next/server";
import { IDLE_TIMEOUT_MS } from "@/lib/auth/constants";
import { listCriticalNewAlerts } from "@/lib/data/critical-alerts";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: "unauthorized" }, { status: 401, headers: noStore });

  try {
    const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { id: true, isActive: true, lastActiveAt: true } });
    if (!profile || !profile.isActive) return NextResponse.json({ status: "unauthorized" }, { status: 401, headers: noStore });
    const last = profile.lastActiveAt?.getTime() ?? null;
    if (last !== null && Date.now() - last > IDLE_TIMEOUT_MS) return NextResponse.json({ status: "expired" }, { status: 401, headers: noStore });

    const alerts = await listCriticalNewAlerts(profile.id);
    return NextResponse.json({ alerts }, { headers: noStore });
  } catch (e) {
    console.error("alerts/critical: อ่านรายการไม่สำเร็จ", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: noStore });
  }
}
