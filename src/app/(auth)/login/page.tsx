import LoginForm from "./LoginForm";
import { parseLogoutReason, type LogoutReason } from "@/lib/auth/constants";

// หน้า Login ชั่วคราวแบบเรียบง่าย รอแทนด้วยดีไซน์จาก Figma ภายหลัง
export const metadata = { title: "เข้าสู่ระบบ | DM Remission" };

const REASON_MESSAGES: Record<LogoutReason, string> = {
  timeout: "ออกจากระบบอัตโนมัติ เนื่องจากไม่มีการใช้งานเกิน 30 นาที กรุณาเข้าสู่ระบบอีกครั้ง",
  disabled: "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  noprofile: "ยังไม่พบโปรไฟล์ผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const notice = reason ? REASON_MESSAGES[parseLogoutReason(reason)] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-slate-900">ระบบติดตามผู้ป่วย DM Remission</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">เข้าสู่ระบบเพื่อบันทึกและติดตามผู้ป่วยเบาหวาน</p>

        {notice ? (
          <p role="status" className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {notice}
          </p>
        ) : null}

        <LoginForm />
      </div>
    </main>
  );
}
