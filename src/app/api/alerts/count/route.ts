// หน้า Alert Center ถามทุก ~30 วินาทีว่ามี Alert ใหม่กว่าที่แสดงอยู่หรือไม่ เพื่อขึ้นแถบ "มี Alert ใหม่"
// ?since=<ISO> = เวลาสร้างของรายการล่าสุดที่หน้าจอแสดงอยู่ (นับเฉพาะรายที่ใหม่กว่านั้น จึงไม่หลงเมื่อมีคนรับทราบไปพร้อมกับมีรายใหม่เข้า)
// ไม่ต่ออายุเซสชัน (ดู api-session.ts)
import { NextResponse } from "next/server";
import { NO_STORE, requireApiUser } from "@/lib/auth/api-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if ("response" in auth) return auth.response;
    const sinceRaw = new URL(request.url).searchParams.get("since");
    const sinceMs = sinceRaw ? Date.parse(sinceRaw) : NaN;
    const [newCount, newerCount] = await Promise.all([
      prisma.alert.count({ where: { status: "NEW" } }),
      Number.isNaN(sinceMs) ? Promise.resolve(0) : prisma.alert.count({ where: { status: "NEW", createdAt: { gt: new Date(sinceMs) } } }),
    ]);
    return NextResponse.json({ newCount, newerCount }, { headers: NO_STORE });
  } catch (e) {
    console.error("alerts/count: อ่านจำนวนไม่สำเร็จ", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
