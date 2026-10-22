"use client";

// เมนูหลักด้านซ้าย 2 แบบ
//  - full: เมนูเต็ม 256 px (ใช้ที่ 1440 px ขึ้นไป และใน drawer ของแท็บเล็ต/มือถือ)
//  - rail: รางไอคอน 80 px (1024–1439 px) ชี้หรือโฟกัสเพื่อดูชื่อเมนู
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { IDLE_TIMEOUT_MS } from "@/lib/auth/constants";
import { BRAND_NAME, BRAND_TAGLINE } from "./brand";
import { Icon } from "./icons";
import { formatCount, isActivePath, visibleItems, type NavItem, type RoleName } from "./nav-items";

export type ShellUser = { fullName: string; role: RoleName; roleLabel: string };

type Props = {
  variant: "full" | "rail";
  user: ShellUser;
  alertCount: number;
  onNavigate?: () => void;
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5EEAD4]";

function CountBadge({ count, small }: { count: number; small?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} รายการที่ยังไม่รับทราบ`}
      className={`rounded-full bg-red-600 font-semibold leading-none text-white ${small ? "px-1.5 py-1 text-[11px]" : "px-2 py-1 text-xs"}`}
    >
      {formatCount(count)}
    </span>
  );
}

function FullItem({ item, active, alertCount, onNavigate }: { item: NavItem; active: boolean; alertCount: number; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] ${FOCUS} ${
        active ? "bg-white/12 font-semibold text-white" : "text-[#CFE6E3] hover:bg-white/8"
      }`}
    >
      <Icon name={item.icon} className={active ? "text-[#5EEAD4]" : "text-[#9CC5C0]"} />
      <span>{item.label}</span>
      {item.key === "alerts" && (
        <span className="ml-auto">
          <CountBadge count={alertCount} />
        </span>
      )}
    </Link>
  );
}

function RailItem({ item, active, alertCount, onNavigate }: { item: NavItem; active: boolean; alertCount: number; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
      className={`relative grid size-12 place-items-center rounded-xl ${FOCUS} ${
        active ? "bg-white/12 text-[#5EEAD4]" : "text-[#9CC5C0] hover:bg-white/8"
      }`}
    >
      <Icon name={item.icon} size={22} />
      {item.key === "alerts" && alertCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5">
          <CountBadge count={alertCount} small />
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({ variant, user, alertCount, onNavigate }: Props) {
  const pathname = usePathname();
  const { main, restricted } = visibleItems(user.role);

  if (variant === "rail") {
    const Item = (item: NavItem) => (
      <RailItem key={item.key} item={item} active={isActivePath(pathname, item.href)} alertCount={alertCount} onNavigate={onNavigate} />
    );
    return (
      <div className="flex h-full flex-col items-center bg-[#0B2F2D] px-4 pb-5 pt-[22px]">
        <span className="grid size-11 place-items-center rounded-xl bg-[#14B8A6] text-white" title={BRAND_NAME}>
          <Icon name="drop" size={24} />
        </span>
        <nav aria-label="เมนูหลัก" className="mt-5 flex flex-col items-center gap-1.5">
          {main.map(Item)}
          {restricted.length > 0 && <hr className="my-1.5 w-8 border-white/15" />}
          {restricted.map(Item)}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-3">
          <span
            className="grid size-11 place-items-center rounded-full bg-[#14B8A6] text-white"
            title={`${user.fullName} · ${user.roleLabel}`}
          >
            <Icon name="person" size={22} />
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
              className={`grid size-12 place-items-center rounded-xl border border-white/20 text-[#CFE6E3] hover:bg-white/8 ${FOCUS}`}
            >
              <Icon name="logout" size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  const Group = ({ label, items }: { label: string; items: NavItem[] }) =>
    items.length === 0 ? null : (
      <div className="mt-2">
        <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold text-[#8FB8B3]">{label}</p>
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <FullItem key={item.key} item={item} active={isActivePath(pathname, item.href)} alertCount={alertCount} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col bg-[#0B2F2D] px-4 pb-5 pt-[22px] text-[#CFE6E3]">
      <div className="flex items-center gap-3 px-1 pb-4">
        <span className="grid size-10 place-items-center rounded-xl bg-[#14B8A6] text-white">
          <Icon name="drop" size={22} />
        </span>
        <div className="leading-tight">
          <p className="text-[17px] font-semibold text-white">{BRAND_NAME}</p>
          <p className="text-xs text-[#8FB8B3]">{BRAND_TAGLINE}</p>
        </div>
      </div>

      <nav aria-label="เมนูหลัก">
        <Group label="เมนูหลัก" items={main} />
        <Group label="สำหรับแพทย์และผู้ดูแลระบบ" items={restricted} />
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <p className="flex items-start gap-2 px-3 text-[11px] leading-snug text-[#8FB8B3]">
          <Icon name="clock" size={14} className="mt-px shrink-0" />
          ออกจากระบบอัตโนมัติเมื่อไม่ใช้งาน {Math.round(IDLE_TIMEOUT_MS / 60000)} นาที
        </p>
        <div className="flex items-center gap-3 rounded-[14px] bg-white/8 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#14B8A6] text-white">
            <Icon name="person" size={22} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
            <p className="truncate text-xs text-[#8FB8B3]">{user.roleLabel}</p>
          </div>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className={`flex min-h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-white/20 px-3 text-sm font-medium text-[#CFE6E3] hover:bg-white/8 ${FOCUS}`}
          >
            <Icon name="logout" size={18} />
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
