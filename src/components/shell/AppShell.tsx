"use client";

// โครงหน้าหลักหลัง Login: เมนูซ้ายตามขนาดจอ
//   >= 1440 px      เมนูเต็ม 256 px
//   1024–1439 px    รางไอคอน 80 px
//   768–1023 px     แถบบนบาง + drawer (เมนูเลื่อนออกมาทับหน้า)
//   < 768 px        แถบเมนูล่าง (ปุ่ม "เพิ่มเติม" เปิด drawer)
// drawer ใช้ <dialog> ของเบราว์เซอร์: โฟกัสไม่หลุดออกนอกเมนู และ Esc ปิดเมนูได้
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { BRAND_NAME } from "./brand";
import { Icon } from "./icons";
import { formatCount, isActivePath } from "./nav-items";
import Sidebar, { type ShellUser } from "./Sidebar";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

function AlertDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} รายการที่ยังไม่รับทราบ`}
      className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
    >
      {formatCount(count)}
    </span>
  );
}

export default function AppShell({
  user,
  alertCount,
  children,
}: {
  user: ShellUser;
  alertCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const openDrawer = () => drawerRef.current?.showModal();
  const closeDrawer = () => drawerRef.current?.close();

  // เปลี่ยนหน้าแล้วปิด drawer เสมอ
  useEffect(() => {
    drawerRef.current?.close();
  }, [pathname]);

  const bottomItems = [
    { href: "/dashboard", label: "ภาพรวม", icon: "grid" as const },
    { href: "/patients", label: "ผู้ป่วย", icon: "users" as const },
    { href: "/alerts", label: "แจ้งเตือน", icon: "bell" as const },
  ];

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* รางไอคอน 80 px: 1024–1439 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 lg:block min-[1440px]:hidden">
        <Sidebar variant="rail" user={user} alertCount={alertCount} />
      </aside>
      {/* เมนูเต็ม 256 px: 1440 ขึ้นไป */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 min-[1440px]:block">
        <Sidebar variant="full" user={user} alertCount={alertCount} />
      </aside>

      <div className="lg:pl-20 min-[1440px]:pl-64">
        {/* แถบบนบางของแท็บเล็ต (768–1023) */}
        <header className="sticky top-0 z-20 hidden items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 md:flex lg:hidden">
          <button
            type="button"
            onClick={openDrawer}
            aria-label="เปิดเมนู"
            aria-haspopup="dialog"
            className={`grid size-12 place-items-center rounded-xl border border-slate-300 text-[#0B2F2D] ${FOCUS}`}
          >
            <Icon name="menu" size={22} />
          </button>
          <span className="grid size-[34px] place-items-center rounded-[10px] bg-[#14B8A6] text-white">
            <Icon name="drop" size={20} />
          </span>
          <span className="text-[17px] font-semibold text-[#0B2F2D]">{BRAND_NAME}</span>
          <Link
            href="/alerts"
            aria-label="การแจ้งเตือน"
            className={`relative ml-auto grid size-12 place-items-center rounded-xl text-slate-700 ${FOCUS}`}
          >
            <Icon name="bell" size={24} />
            <AlertDot count={alertCount} />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-5 md:px-6 md:pb-10 lg:px-8">{children}</main>
      </div>

      {/* แถบเมนูล่างของมือถือ (< 768) */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {bottomItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${FOCUS} ${
                active ? "font-semibold text-teal-800" : "text-slate-500"
              }`}
            >
              <span className="relative">
                <Icon name={item.icon} size={24} />
                {item.href === "/alerts" && <AlertDot count={alertCount} />}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={openDrawer}
          aria-haspopup="dialog"
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-slate-500 ${FOCUS}`}
        >
          <Icon name="menu" size={24} />
          เพิ่มเติม
        </button>
      </nav>

      {/* drawer: แท็บเล็ตแนวตั้งและมือถือ */}
      <dialog
        ref={drawerRef}
        aria-label="เมนูหลัก"
        onClick={(e) => {
          if (e.target === drawerRef.current) closeDrawer(); // แตะพื้นมืดเพื่อปิด
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-hidden border-0 bg-transparent p-0 shadow-2xl backdrop:bg-slate-950/55 lg:hidden"
      >
        <Sidebar variant="full" user={user} alertCount={alertCount} onNavigate={closeDrawer} />
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="ปิดเมนู"
          className="absolute right-3 top-4 grid size-11 place-items-center rounded-xl text-[#CFE6E3] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#5EEAD4]"
        >
          <Icon name="x" size={20} />
        </button>
      </dialog>
    </div>
  );
}
