import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "ตั้งค่า | DM Remission" };

export default async function Page() {
  await requireRole("ADMIN", "DOCTOR");
  return <ComingSoon title="ตั้งค่า" note="เกณฑ์ความเสี่ยงและการจัดการผู้ใช้ เฉพาะแพทย์และผู้ดูแลระบบ" />;
}
