"use server";

// Server Action สำหรับออกจากระบบ
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const h = await headers();
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGOUT",
          entity: "auth",
          ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: h.get("user-agent"),
        },
      });
    } catch {
      // บันทึก audit ไม่สำเร็จ ต้องไม่ขวางการออกจากระบบ
    }
  }

  await supabase.auth.signOut();
  redirect("/login");
}
