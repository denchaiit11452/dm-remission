import Link from "next/link";
import type { GlucoseThresholdKey } from "@/lib/risk/rules";

type Props = {
  missingThresholds: GlucoseThresholdKey[];
  ruleSetMissing: boolean;
  /** แสดงลิงก์ไปหน้าตั้งค่าเฉพาะผู้ที่มีสิทธิ์ (บทบาทอื่นไม่เห็นเมนูนี้) */
  canOpenSettings: boolean;
};

/** แถบเตือนเมื่อแพทย์ยังกำหนดเกณฑ์น้ำตาลไม่ครบ (ห้ามดูเหมือนผู้ป่วยปกติ) */
export default function ThresholdBanner({ missingThresholds, ruleSetMissing, canOpenSettings }: Props) {
  if (!ruleSetMissing && missingThresholds.length === 0) return null;
  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
      {ruleSetMissing ? (
        <p>ยังไม่มีชุดเกณฑ์ความเสี่ยงที่ใช้งานอยู่ ระบบใช้ค่าเริ่มต้นชั่วคราวซึ่งยังไม่มีเกณฑ์น้ำตาลของแพทย์</p>
      ) : null}
      <p>
        ยังไม่ได้กำหนดเกณฑ์น้ำตาลระดับ เฝ้าระวัง / ความเสี่ยงสูง / วิกฤต: ระบบจะไม่จัดผู้ป่วยน้ำตาลสูงหรือต่ำมากเป็นวิกฤต{" "}
        กรุณาให้แพทย์กำหนดที่หน้าตั้งค่าก่อนใช้กับผู้ป่วยจริง
        {canOpenSettings ? (
          <>
            {" "}
            <Link href="/settings" className="font-medium underline underline-offset-2">
              ไปที่หน้าตั้งค่า
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
