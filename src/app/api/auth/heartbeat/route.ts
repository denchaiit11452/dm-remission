// หน้าเว็บเรียกเป็นระยะ (เฉพาะตอนผู้ใช้ยังขยับเมาส์/พิมพ์อยู่) เพื่อบอก server ว่ายังใช้งาน
// ป้องกันกรณีกรอกฟอร์มยาวบนหน้าเดียวโดยไม่เปลี่ยนหน้า แล้วถูกมองว่า "ไม่ใช้งาน"
import { NextResponse } from "next/server";
import { IDLE_TIMEOUT_MS } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "no-store" };

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401, headers: noStore });
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile || !profile.isActive) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401, headers: noStore });
  }

  // ถ้าหมดเวลาไปแล้ว ห้ามต่ออายุด้วย heartbeat (ต้อง Login ใหม่)
  const last = profile.lastActiveAt?.getTime() ?? null;
  if (last !== null && Date.now() - last > IDLE_TIMEOUT_MS) {
    return NextResponse.json({ status: "expired" }, { status: 401, headers: noStore });
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ status: "ok" }, { headers: noStore });
}
