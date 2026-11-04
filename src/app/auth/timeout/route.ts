// ออกจากระบบเพราะเหตุผลของระบบ (ไม่ใช้งานเกิน 30 นาที / บัญชีถูกปิด / ไม่มีโปรไฟล์)
// ต้องเป็น Route Handler เพราะ Server Component ล้าง cookie ไม่ได้
import { NextResponse, type NextRequest } from "next/server";
import { parseLogoutReason } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const reason = parseLogoutReason(request.nextUrl.searchParams.get("reason"));

  const supabase = await createClient();
  await supabase.auth.signOut();

  // ใช้ path แบบ relative ห้ามสร้างจาก request.url
  // เพราะใน container ค่านั้นเป็น HOSTNAME (0.0.0.0) ไม่ใช่ที่อยู่ที่ผู้ใช้เปิดอยู่จริง
  const params = new URLSearchParams({ reason });
  return new NextResponse(null, {
    status: 307,
    headers: { Location: `/login?${params}`, "Cache-Control": "no-store" },
  });
}
