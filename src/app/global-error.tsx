"use client";

// ข้อผิดพลาดที่ root layout เอง (ที่สุดท้าย) ต้องมี <html> และ <body> ของตัวเอง
import "./globals.css";
import { useEffect } from "react";
import RetryPanel from "@/components/system/RetryPanel";
import ServiceNotice from "@/components/system/ServiceNotice";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="th">
      <body>
        <div className="min-h-dvh bg-slate-50 px-4 py-10 sm:py-16">
          <p className="mx-auto mb-8 w-full max-w-xl text-sm font-semibold text-slate-700">DM Remission</p>
          <main className="mx-auto w-full max-w-xl">
            <ServiceNotice kind="generic" reference={error.digest ?? null} actions={<RetryPanel onRetry={reset} />} />
          </main>
        </div>
      </body>
    </html>
  );
}
