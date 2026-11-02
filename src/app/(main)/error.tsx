"use client";

// ข้อผิดพลาดระดับหน้า (เมนูซ้ายยังใช้ได้): แสดงแจ้งในพื้นที่เนื้อหา ปุ่มลองใหม่จะ render หน้านี้ซ้ำ
import { useEffect } from "react";
import RetryPanel from "@/components/system/RetryPanel";
import ServiceNotice from "@/components/system/ServiceNotice";
import { isDbUnavailable } from "@/lib/data/db-errors";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // ตอน production ข้อความ error ฝั่งเซิร์ฟเวอร์ถูกซ่อน จึงยืนยันสาเหตุไม่ได้เสมอไป (ตอน dev จะเห็นข้อความจริง)
  const kind = isDbUnavailable(error) ? "db" : "generic";
  return (
    <div className="px-1 py-8">
      <ServiceNotice kind={kind} reference={error.digest ?? null} actions={<RetryPanel onRetry={reset} />} />
    </div>
  );
}
