// รายการเมนูหลัก และสิทธิ์ที่เห็นเมนูแต่ละรายการ
// หลักการ: เมนูที่ไม่มีสิทธิ์ "ไม่แสดง" (ไม่ใช่แสดงแต่กดไม่ได้)
// การซ่อนเมนูไม่ใช่การตรวจสิทธิ์จริง: ทุกหน้าต้องเรียก requireUser()/requireRole() เองเสมอ
import type { IconName } from "./icons";

export type RoleName = "ADMIN" | "DOCTOR" | "STAFF";
export type NavKey = "overview" | "patients" | "alerts" | "import" | "map" | "settings";
export type NavGroup = "main" | "restricted";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  icon: IconName;
  roles: readonly RoleName[];
  group: NavGroup;
};

const ALL: readonly RoleName[] = ["ADMIN", "DOCTOR", "STAFF"];

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "overview", href: "/dashboard", label: "ภาพรวม", icon: "grid", roles: ALL, group: "main" },
  { key: "patients", href: "/patients", label: "ผู้ป่วย", icon: "users", roles: ALL, group: "main" },
  { key: "alerts", href: "/alerts", label: "การแจ้งเตือน", icon: "bell", roles: ALL, group: "main" },
  // แพทย์นำเข้า CSV ไม่ได้ (ตามตารางสิทธิ์)
  { key: "import", href: "/import", label: "นำเข้า CSV", icon: "upload", roles: ["ADMIN", "STAFF"], group: "main" },
  // พิกัดผู้ป่วยเห็นได้เฉพาะแพทย์และ Admin
  { key: "map", href: "/map", label: "แผนที่ผู้ป่วย", icon: "pin", roles: ["ADMIN", "DOCTOR"], group: "restricted" },
  // แก้เกณฑ์ความเสี่ยง: Admin และแพทย์
  { key: "settings", href: "/settings", label: "ตั้งค่า", icon: "sliders", roles: ["ADMIN", "DOCTOR"], group: "restricted" },
];

export function visibleItems(role: RoleName) {
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));
  return {
    main: items.filter((i) => i.group === "main"),
    restricted: items.filter((i) => i.group === "restricted"),
  };
}

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function formatCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}
