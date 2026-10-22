import ComingSoon from "@/components/ComingSoon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "การแจ้งเตือน | DM Remission" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="การแจ้งเตือน" note="ศูนย์รวม Alert จะเพิ่มในขั้นถัดไป" />;
}
