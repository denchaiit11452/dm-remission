// ชั้นข้อมูลของ Alert (เรียกจากฝั่ง server เท่านั้น)
// ผู้เรียกต้องผ่าน requireUser() มาก่อนแล้ว (ดู src/lib/auth/session.ts)
import { prisma } from "@/lib/prisma";

/** จำนวน Alert ที่ยังไม่รับทราบ (สถานะ NEW) ใช้แสดงตัวเลขบนเมนู */
export async function countNewAlerts(): Promise<number> {
  return prisma.alert.count({ where: { status: "NEW" } });
}
