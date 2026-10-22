import ComingSoon from "@/components/ComingSoon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "ผู้ป่วย | DM Remission" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="ผู้ป่วย" note="รายชื่อผู้ป่วย โปรไฟล์ และการบันทึกน้ำตาล DTX จะเพิ่มในขั้นถัดไป" />;
}
