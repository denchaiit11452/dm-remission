// Supabase client ฝั่ง server (ใช้ใน Server Component, Server Action, Route Handler)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // ถูกเรียกจาก Server Component ซึ่งเขียน cookie ไม่ได้
          // ไม่เป็นไร เพราะ proxy.ts เป็นตัวรีเฟรช session ให้อยู่แล้ว
        }
      },
    },
  });
}
