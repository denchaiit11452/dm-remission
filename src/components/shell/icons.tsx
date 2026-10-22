// ไอคอนเส้นแบบ inline SVG (ไม่ต้องติดตั้งไลบรารี) ใช้สีตาม currentColor
import type { ReactNode } from "react";

export type IconName =
  | "grid" | "users" | "bell" | "upload" | "pin" | "sliders"
  | "logout" | "menu" | "person" | "drop" | "x" | "clock";

const PATHS: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1.2" />
    </>
  ),
  users: (
    <>
      <circle cx="6" cy="5.5" r="2.3" />
      <path d="M1.8 13c0-2.3 1.9-3.8 4.2-3.8s4.2 1.5 4.2 3.8" />
      <circle cx="11.5" cy="6" r="1.8" />
      <path d="M11.5 9.4c1.7 0 2.9 1.1 2.9 2.9" />
    </>
  ),
  bell: (
    <>
      <path d="M4 11V7a4 4 0 0 1 8 0v4l1 1.5H3z" />
      <path d="M6.5 14a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  upload: <path d="M8 10.5V2.8M5 5.5l3-2.7 3 2.7M2.5 10v2.2c0 .7.6 1.3 1.3 1.3h8.4c.7 0 1.3-.6 1.3-1.3V10" />,
  pin: (
    <>
      <path d="M8 14s4.5-3.9 4.5-7.3A4.5 4.5 0 0 0 3.5 6.7C3.5 10.1 8 14 8 14z" />
      <circle cx="8" cy="6.7" r="1.6" />
    </>
  ),
  sliders: (
    <>
      <path d="M2.5 4.5h6M11.5 4.5h2M2.5 8h2M7.5 8h6M2.5 11.5h8M13.5 11.5h0" />
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="5.5" cy="8" r="1.5" />
      <circle cx="12" cy="11.5" r="1.5" />
    </>
  ),
  logout: <path d="M6.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h2.5M10 5.2 12.8 8 10 10.8M12.5 8H6" />,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  person: (
    <>
      <circle cx="8" cy="5.5" r="2.7" />
      <path d="M2.8 13.5c.7-2.4 2.8-3.7 5.2-3.7s4.5 1.3 5.2 3.7" />
    </>
  ),
  drop: <path d="M8 1.8s4.2 4.5 4.2 7.4A4.2 4.2 0 0 1 8 13.4a4.2 4.2 0 0 1-4.2-4.2C3.8 6.3 8 1.8 8 1.8z" fill="currentColor" stroke="none" />,
  x: <path d="m4 4 8 8M12 4l-8 8" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2l2 1.3" />
    </>
  ),
};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
