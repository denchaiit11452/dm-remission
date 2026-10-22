import { ROLE_LABELS, requireUser } from "@/lib/auth/session";

export const metadata = { title: "ภาพรวม | DM Remission" };

// หน้าชั่วคราว ใช้ยืนยันว่า Login / Role / session ทำงานถูกต้อง
export default async function DashboardPage() {
  const user = await requireUser(); // ทุกหน้าต้องเรียกเอง ไม่พึ่งการตรวจใน layout

  return (
    <section>
      <h1 className="text-xl font-semibold">สวัสดี {user.fullName}</h1>
      <p className="mt-2 text-slate-700">
        เข้าสู่ระบบในฐานะ {ROLE_LABELS[user.role]} ระบบยืนยันตัวตนทำงานเรียบร้อย
      </p>
      <p className="mt-1 text-sm text-slate-600">หน้านี้เป็นหน้าชั่วคราว ภาพรวมผู้ป่วยจะเพิ่มในขั้นถัดไป</p>
    </section>
  );
}
