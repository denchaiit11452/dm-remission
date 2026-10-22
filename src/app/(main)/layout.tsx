import AppShell from "@/components/shell/AppShell";
import IdleLogout from "@/components/IdleLogout";
import { ROLE_LABELS, requireUser } from "@/lib/auth/session";
import { countNewAlerts } from "@/lib/data/alerts";

// โครงหน้าหลังเข้าสู่ระบบ: เมนูซ้าย + ตัวจับเวลาไม่ใช้งาน 30 นาที
// หมายเหตุ: layout ไม่ render ใหม่ทุกครั้งที่เปลี่ยนหน้า ทุก page.tsx ต้องเรียก requireUser()/requireRole() เอง
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const alertCount = await countNewAlerts();

  return (
    <>
      <AppShell
        user={{ fullName: user.fullName, role: user.role, roleLabel: ROLE_LABELS[user.role] }}
        alertCount={alertCount}
      >
        {children}
      </AppShell>
      <IdleLogout />
    </>
  );
}
