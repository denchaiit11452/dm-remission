// ออกจากระบบเพราะเหตุผลของระบบ (ไม่ใช้งานเกิน 30 นาที / บัญชีถูกปิด / ไม่มีโปรไฟล์)
// ต้องเป็น Route Handler เพราะ Server Component ล้าง cookie ไม่ได้
import { NextResponse, type NextRequest } from "next/server";
import { parseLogoutReason } from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const reason = parseLogoutReason(request.nextUrl.searchParams.get("reason"));

  const supabase = await createClient();
  await supabase.auth.signOut();

  const target = new URL("/login", request.url);
  target.searchParams.set("reason", reason);

  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
