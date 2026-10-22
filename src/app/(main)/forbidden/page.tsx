import Link from "next/link";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "ไม่มีสิทธิ์เข้าถึง | DM Remission" };

export default async function ForbiddenPage() {
  await requireUser();

  return (
    <section>
      <h1 className="text-xl font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
      <p className="mt-2 text-slate-700">บัญชีของคุณไม่ได้รับอนุญาตให้ใช้งานส่วนนี้ หากคิดว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบ</p>
      <Link href="/dashboard" className="mt-4 inline-block text-teal-800 underline underline-offset-2">
        กลับหน้าภาพรวม
      </Link>
    </section>
  );
}
