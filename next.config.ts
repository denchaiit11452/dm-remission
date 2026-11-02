import type { NextConfig } from "next";

// HSTS ตั้งที่ reverse proxy ที่ทำ TLS ส่วน CSP จะเพิ่มแยกต่างหากเมื่อทดสอบกับทุกหน้าแล้ว
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // URL มีรหัสผู้ป่วย จึงไม่ส่ง Referer ออกนอกระบบ
  { key: "Referrer-Policy", value: "same-origin" },
  // geolocation เปิดเฉพาะเว็บนี้ เผื่อการปักหมุดพิกัดบ้านผู้ป่วยจากอุปกรณ์
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // cacheComponents: true,
  // partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
