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

/** ยืนยันว่าผู้ป่วยไม่เคยใช้ยาเบาหวาน เป็นการตัดสินทางคลินิก จึงทำได้เฉพาะแพทย์ (โรงพยาบาลยืนยันแล้ว) */
export const NO_DRUG_CONFIRMER_ROLES = ["DOCTOR"] as const satisfies readonly Role[];

/** แก้เกณฑ์ความเสี่ยงและ Remission ได้เฉพาะผู้ดูแลระบบและแพทย์ */
export const RULE_MANAGER_ROLES = ["ADMIN", "DOCTOR"] as const satisfies readonly Role[];

/**
 * พิกัดบ้านผู้ป่วยเห็นได้: ผู้ดูแลระบบ แพทย์ และพยาบาล/เจ้าหน้าที่ (พยาบาลเป็นผู้ปักหมุดตอนออกเยี่ยมบ้าน)
 * ทุกการเปิดดูยังบันทึก VIEW_LOCATION ใน audit_logs
 */
export const LOCATION_VIEWER_ROLES = ["ADMIN", "DOCTOR", "STAFF"] as const satisfies readonly Role[];

/** ปักหมุดหรือแก้ไขพิกัดบ้านได้เฉพาะผู้ดูแลระบบและพยาบาล/เจ้าหน้าที่ (ผู้ใช้ยืนยันแล้ว) */
export const LOCATION_EDITOR_ROLES = ["ADMIN", "STAFF"] as const satisfies readonly Role[];

/** ใช้เลือกสิ่งที่แสดงเท่านั้น การตรวจสิทธิ์จริงอยู่ใน src/lib/data/locations.ts */
export function canViewLocation(role: Role): boolean {
  return (LOCATION_VIEWER_ROLES as readonly Role[]).includes(role);
}

/** ใช้ซ่อนปุ่มเท่านั้น การตรวจสิทธิ์จริงต้องทำที่ requireRole(...LOCATION_EDITOR_ROLES) */
export function canEditLocation(role: Role): boolean {
  return (LOCATION_EDITOR_ROLES as readonly Role[]).includes(role);
}

/** ใช้ซ่อนปุ่มเท่านั้น การตรวจสิทธิ์จริงต้องทำที่ requireRole(...NO_DRUG_CONFIRMER_ROLES) */
export function canConfirmNoDrug(role: Role): boolean {
  return (NO_DRUG_CONFIRMER_ROLES as readonly Role[]).includes(role);
}
