// กติกาสิทธิ์ของการแก้ไขข้อมูลผู้ป่วย แยกจาก session.ts เพื่อให้ทดสอบได้โดยไม่ต่อ Supabase/ฐานข้อมูล
import type { Role } from "@prisma/client";

/**
 * บทบาทที่เพิ่ม/แก้ไขผู้ป่วย แก้ประวัติยา และยกเลิกรายการได้ (โรงพยาบาลยืนยันแล้ว)
 * พยาบาล/เจ้าหน้าที่ยังบันทึกค่าน้ำตาลและผลตรวจใหม่ได้ แต่ยกเลิกรายการไม่ได้
 */
export const RECORD_MANAGER_ROLES = ["ADMIN", "DOCTOR"] as const satisfies readonly Role[];

/** ใช้ซ่อนปุ่มเท่านั้น การตรวจสิทธิ์จริงต้องทำที่ requireRole(...RECORD_MANAGER_ROLES) */
export function canManageRecords(role: Role): boolean {
  return (RECORD_MANAGER_ROLES as readonly Role[]).includes(role);
}
