import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "แผนที่ผู้ป่วย | DM Remission" };

export default async function Page() {
  await requireRole("ADMIN", "DOCTOR");
  return <ComingSoon title="แผนที่ผู้ป่วย" note="เฉพาะแพทย์และผู้ดูแลระบบ" />;
}
