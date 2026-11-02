// แกนของการรับทราบ Alert (ไม่ import ฐานข้อมูล จึงทดสอบด้วยธุรกรรมปลอมได้)
import type { Prisma } from "@prisma/client";

/** ส่วนที่ต้องการจากธุรกรรม (แยกไว้เพื่อทดสอบด้วยของปลอมได้ ไม่ต้องต่อฐานข้อมูล) */
export type AckTx = {
  alert: {
    updateMany(args: { where: { id: string; status: "NEW" }; data: { status: "ACKNOWLEDGED"; ackById: string; ackAt: Date } }): Promise<{ count: number }>;
    findUnique(args: { where: { id: string }; select: { patientId: true; level: true; status: true; ackAt: true; ackBy: { select: { fullName: true } } } }): Promise<
      { patientId: string; level: string; status: string; ackAt: Date | null; ackBy: { fullName: string } | null } | null
    >;
  };
  auditLog: { create(args: { data: { userId: string; action: "UPDATE"; entity: string; entityId: string; patientId: string; before: Prisma.InputJsonValue; after: Prisma.InputJsonValue } }): Promise<unknown> };
};

export type AckCoreResult =
  | { kind: "acked" }
  | { kind: "not_found" }
  | { kind: "already"; status: string; by: string | null; at: Date | null };

/**
 * รับทราบ Alert หนึ่งรายการ: เปลี่ยน NEW -> ACKNOWLEDGED เฉพาะเมื่อยังเป็น NEW (ครั้งเดียวต่อรายการ)
 * ถ้ามีผู้อื่นกดไปก่อน (หรือกดพร้อมกัน) จะไม่เขียนทับชื่อผู้รับทราบคนแรก และคืนข้อมูลผู้รับทราบคนนั้น
 */
export async function acknowledgeCore(tx: AckTx, p: { userId: string; alertId: string; now: Date }): Promise<AckCoreResult> {
  const { userId, alertId, now } = p;
  const updated = await tx.alert.updateMany({ where: { id: alertId, status: "NEW" }, data: { status: "ACKNOWLEDGED", ackById: userId, ackAt: now } });
  const row = await tx.alert.findUnique({ where: { id: alertId }, select: { patientId: true, level: true, status: true, ackAt: true, ackBy: { select: { fullName: true } } } });
  if (!row) return { kind: "not_found" };
  if (updated.count === 1) {
    await tx.auditLog.create({
      data: {
        userId, action: "UPDATE", entity: "alert", entityId: alertId, patientId: row.patientId,
        before: { status: "NEW" } as Prisma.InputJsonValue,
        after: { status: "ACKNOWLEDGED", ackById: userId, ackAt: now.toISOString(), level: row.level } as Prisma.InputJsonValue,
      },
    });
    return { kind: "acked" };
  }
  return { kind: "already", status: row.status, by: row.ackBy?.fullName ?? null, at: row.ackAt };
}
