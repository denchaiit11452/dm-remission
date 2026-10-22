// proxy.ts (ใน Next.js 16 ชื่อเดิมคือ middleware.ts)
// ทำงานก่อนทุก request: รีเฟรช session ของ Supabase, บังคับ Login, และกัน cache ของหน้าที่ล็อกอินแล้ว
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

// เส้นทางที่เข้าได้โดยไม่ต้อง Login
const PUBLIC_PATHS = ["/login", "/auth/timeout"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // อย่าใส่โค้ดอื่นคั่นระหว่างสร้าง client กับ getUser() (ตามคำแนะนำของ Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // redirect พร้อมคัดลอก cookie ที่ Supabase เพิ่งรีเฟรช/ล้างไปด้วย
  const redirectTo = (path: string) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = "";
    const redirectResponse = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    redirectResponse.headers.set("Cache-Control", "no-store");
    return redirectResponse;
  };

  if (!user && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    return redirectTo("/login");
  }

  if (user && pathname === "/login") {
    return redirectTo("/dashboard");
  }

  // กัน browser/CDN เก็บหน้าไว้ เพื่อให้ logout แล้วกด Back เห็นข้อมูลเดิมไม่ได้
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: [
    // ยกเว้นไฟล์ static และรูปภาพ
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
