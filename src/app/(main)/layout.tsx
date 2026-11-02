import AppShell from "@/components/shell/AppShell";
import IdleLogout from "@/components/IdleLogout";
import CriticalAlertWatcher from "@/components/alerts/CriticalAlertWatcher";
import { ROLE_LABELS, requireUser } from "@/lib/auth/session";
import ServiceUnavailableScreen from "@/components/system/ServiceUnavailableScreen";
import { countNewAlerts } from "@/lib/data/alerts";
import { isDbUnavailable } from "@/lib/data/db-errors";

// โครงหน้าหลังเข้าสู่ระบบ: เมนูซ้าย + ตัวจับเวลาไม่ใช้งาน 30 นาที
// หมายเหตุ: layout ไม่ render ใหม่ทุกครั้งที่เปลี่ยนหน้า ทุก page.tsx ต้องเรียก requireUser()/requireRole() เอง
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  let alertCount: number;
  try {
    user = await requireUser();
    alertCount = await countNewAlerts();
  } catch (e) {
    // ฐานข้อมูลล่ม: แจ้งเป็นภาษาคนแทนหน้า error ของ Next.js (redirect และข้อผิดพลาดอื่นต้องโยนต่อ)
    if (!isDbUnavailable(e)) throw e;
    console.error("MainLayout: ติดต่อฐานข้อมูลไม่ได้", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return <ServiceUnavailableScreen kind="db" />;
  }

  return (
    <>
      <AppShell
        user={{ fullName: user.fullName, role: user.role, roleLabel: ROLE_LABELS[user.role] }}
        alertCount={alertCount}
      >
        {children}
      </AppShell>
      <CriticalAlertWatcher />
      <IdleLogout />
    </>
  );
}
