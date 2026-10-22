import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "นำเข้า CSV | DM Remission" };

export default async function Page() {
  await requireRole("ADMIN", "STAFF");
  return <ComingSoon title="นำเข้า CSV" note="เฉพาะผู้ดูแลระบบและพยาบาล/เจ้าหน้าที่" />;
}
