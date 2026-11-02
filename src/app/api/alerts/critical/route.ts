// หน้าเว็บถามรายการ Alert วิกฤตที่ยังไม่รับทราบทุก ~15 วินาที เพื่อเด้งเตือนรายใหม่ทันที (ไม่ต่ออายุเซสชัน ดู api-session.ts)
import { NextResponse } from "next/server";
import { NO_STORE, requireApiUser } from "@/lib/auth/api-session";
import { listCriticalNewAlerts } from "@/lib/data/critical-alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) return auth.response;
    return NextResponse.json({ alerts: await listCriticalNewAlerts(auth.user.id) }, { headers: NO_STORE });
  } catch (e) {
    console.error("alerts/critical: อ่านรายการไม่สำเร็จ", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
