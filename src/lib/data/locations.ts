// พิกัดบ้านผู้ป่วย: ตรวจสิทธิ์ที่นี่ทุกครั้ง (Prisma ไม่มี Row Level Security)
// ดูได้ตาม LOCATION_VIEWER_ROLES ปักหมุด/แก้ไขได้ตาม LOCATION_EDITOR_ROLES
// ทุกการเปิดดู การกดนำทาง และการบันทึกพิกัด บันทึกลง audit_logs
import { headers } from "next/headers";
import type { AuditAction, LocationMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LOCATION_EDITOR_ROLES, LOCATION_VIEWER_ROLES } from "@/lib/auth/permissions";
import { requireRole, type CurrentUser } from "@/lib/auth/session";
import { toDateKey, todayInBangkok } from "@/lib/date";
import type { SaveFailure } from "./glucose";
import { dateFromKey } from "./mappers";
import { savePatientLocationSchema, toFieldErrors } from "./schemas";

export type PatientLocationView = {
  latitude: number;
  longitude: number;
  method: LocationMethod;
  addressNote: string | null;
  /** วันที่ผู้ป่วยให้ความยินยอม รูปแบบ YYYY-MM-DD (บันทึกเป็นวัน ไม่มีเวลา) */
  consentGivenAt: string;
  consentRecordedByName: string;
  updatedAt: string;
  updatedByName: string;
};

export const LOCATION_METHOD_LABELS: Record<LocationMethod, string> = {
  MAP_PIN: "ปักหมุดบนแผนที่",
  DEVICE_GPS: "ตำแหน่ง GPS ของอุปกรณ์",
  GEOCODE: "ค้นหาจากที่อยู่",
};

async function writeLocationAudit(user: CurrentUser, patientId: string, action: Extract<AuditAction, "VIEW_LOCATION" | "OPEN_NAVIGATION">) {
  const h = await headers();
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action,
      entity: "patient_location",
      patientId,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  });
}

async function readLocation(patientId: string): Promise<PatientLocationView | null> {
  const row = await prisma.patientLocation.findFirst({
    where: { patientId, patient: { deletedAt: null } },
    select: {
      latitude: true, longitude: true, method: true, addressNote: true, consentGivenAt: true, updatedAt: true,
      consentRecordedBy: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
    },
  });
  if (!row) return null;
  return {
    latitude: row.latitude,
    longitude: row.longitude,
    method: row.method,
    addressNote: row.addressNote,
    consentGivenAt: toDateKey(row.consentGivenAt),
    consentRecordedByName: row.consentRecordedBy.fullName,
    updatedAt: row.updatedAt.toISOString(),
    updatedByName: row.updatedBy.fullName,
  };
}

/** เปิดดูพิกัด: ผู้ไม่มีสิทธิ์ถูกส่งไปหน้า "ไม่มีสิทธิ์" และบันทึก VIEW_LOCATION เฉพาะเมื่อมีพิกัดให้ดู */
export async function viewPatientLocation(patientId: string): Promise<PatientLocationView | null> {
  const user = await requireRole(...LOCATION_VIEWER_ROLES);
  const location = await readLocation(patientId);
  if (location) await writeLocationAudit(user, patientId, "VIEW_LOCATION");
  return location;
}

/** กดนำทาง: คืนพิกัดเพื่อส่งต่อไปแผนที่ภายนอก และบันทึก OPEN_NAVIGATION ก่อนออกจากระบบไป */
export async function locationForNavigation(patientId: string): Promise<{ latitude: number; longitude: number } | null> {
  const user = await requireRole(...LOCATION_VIEWER_ROLES);
  const location = await readLocation(patientId);
  if (!location) return null;
  await writeLocationAudit(user, patientId, "OPEN_NAVIGATION");
  return { latitude: location.latitude, longitude: location.longitude };
}

export type SaveLocationResult = { ok: true; patientId: string } | SaveFailure;

/**
 * ปักหมุดบ้านผู้ป่วย (สร้างใหม่หรือแก้ไข) ต้องยืนยันความยินยอมทุกครั้ง
 * ผู้บันทึกความยินยอมเปลี่ยนเป็นผู้ใช้คนนี้เมื่อสร้างใหม่หรือเมื่อวันที่ยินยอมเปลี่ยน ไม่อย่างนั้นคงชื่อเดิมไว้
 */
export async function savePatientLocation(raw: unknown): Promise<SaveLocationResult> {
  const user = await requireRole(...LOCATION_EDITOR_ROLES);
  const parsed = savePatientLocationSchema.safeParse(raw);
  if (!parsed.success) {
    const f = toFieldErrors(parsed.error);
    return { ok: false, error: f.message, fieldErrors: f.fieldErrors };
  }
  const input = parsed.data;
  if (input.consentGivenAt > todayInBangkok()) {
    const message = "วันที่ผู้ป่วยให้ความยินยอมต้องไม่เป็นวันในอนาคต";
    return { ok: false, error: message, fieldErrors: { consentGivenAt: message } };
  }

  const values = {
    latitude: input.latitude,
    longitude: input.longitude,
    method: "MAP_PIN" as const,
    addressNote: input.addressNote || null,
  };

  try {
    return await prisma.$transaction(async (tx): Promise<SaveLocationResult> => {
      const patient = await tx.patient.findFirst({ where: { id: input.patientId, deletedAt: null }, select: { id: true } });
      if (!patient) return { ok: false, error: "ไม่พบผู้ป่วยรายนี้" };

      const before = await tx.patientLocation.findUnique({
        where: { patientId: input.patientId },
        select: { id: true, latitude: true, longitude: true, method: true, addressNote: true, consentGivenAt: true, consentRecordedById: true },
      });
      const consentChanged = !before || toDateKey(before.consentGivenAt) !== input.consentGivenAt;
      const consent = {
        consentGivenAt: dateFromKey(input.consentGivenAt),
        consentRecordedById: consentChanged ? user.id : before.consentRecordedById,
      };

      const row = await tx.patientLocation.upsert({
        where: { patientId: input.patientId },
        create: { patientId: input.patientId, ...values, ...consent, updatedById: user.id },
        update: { ...values, ...consent, updatedById: user.id },
        select: { id: true },
      });

      const h = await headers();
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: before ? "UPDATE" : "CREATE",
          entity: "patient_location",
          entityId: row.id,
          patientId: input.patientId,
          before: before
            ? ({
                latitude: before.latitude, longitude: before.longitude, method: before.method,
                addressNote: before.addressNote, consentGivenAt: toDateKey(before.consentGivenAt),
              } as Prisma.InputJsonValue)
            : undefined,
          after: { ...values, consentGivenAt: input.consentGivenAt } as Prisma.InputJsonValue,
          ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: h.get("user-agent"),
        },
      });
      return { ok: true, patientId: input.patientId };
    });
  } catch (e) {
    console.error("savePatientLocation failed", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return { ok: false, error: "บันทึกพิกัดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }
}
