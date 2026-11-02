// ชั้นข้อมูลของ Alert (เรียกจากฝั่ง server เท่านั้น)
// ผู้เรียกต้องผ่าน requireUser() มาก่อนแล้ว (ดู src/lib/auth/session.ts)
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  ALERT_PAGE_SIZE, ALERT_WINDOW_DAYS, NEW_TAB_LIMIT, sortNewAlerts, valueTextOf,
  type AlertRowDTO, type AlertStatusName, type AlertTab,
} from "@/lib/alert-center";
import { requireUser } from "@/lib/auth/session";
import { daysBetween, toBangkokDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import type { MeterFlag, RiskLevel } from "@/lib/risk/types";
import { acknowledgeCore, type AckTx } from "./alert-ack";
import { fullName } from "./view";

/** จำนวน Alert ที่ยังไม่รับทราบ (สถานะ NEW) ใช้แสดงตัวเลขบนเมนู */
export async function countNewAlerts(): Promise<number> {
  return prisma.alert.count({ where: { status: "NEW" } });
}

// ---------------------------------------------------------------- รายการ
export type AlertCenterData = {
  tab: AlertTab;
  rows: AlertRowDTO[];
  /** จำนวนทั้งหมดของแท็บนี้ (ใช้ทำเลขหน้า) */
  total: number;
  page: number;
  pageSize: number;
  newCount: number;
  /** เวลาที่โหลดข้อมูลชุดนี้ (ISO) */
  loadedAt: string;
};

const SELECT = {
  id: true, patientId: true, level: true, status: true, summary: true, eventDate: true, createdAt: true, ackAt: true,
  patient: { select: { hn: true, prefix: true, firstName: true, lastName: true } },
  glucoseReading: { select: { valueMgDl: true, meterFlag: true } },
  labRecord: { select: { sbp: true, dbp: true } },
  ackBy: { select: { fullName: true } },
} satisfies Prisma.AlertSelect;

type Row = Prisma.AlertGetPayload<{ select: typeof SELECT }>;

function toDTO(r: Row): AlertRowDTO {
  const measuredDate = toDateKey(r.eventDate);
  return {
    id: r.id,
    patientId: r.patientId,
    patientName: fullName(r.patient),
    hn: r.patient.hn,
    level: r.level as RiskLevel,
    status: r.status as AlertStatusName,
    summary: r.summary,
    valueText: valueTextOf({
      glucose: r.glucoseReading ? { valueMgDl: r.glucoseReading.valueMgDl, meterFlag: r.glucoseReading.meterFlag as MeterFlag } : null,
      lab: r.labRecord ? { sbp: r.labRecord.sbp, dbp: r.labRecord.dbp } : null,
    }),
    measuredDate,
    createdAt: r.createdAt.toISOString(),
    backdatedDays: Math.max(0, daysBetween(measuredDate, toBangkokDateKey(r.createdAt))),
    ackByName: r.ackBy?.fullName ?? null,
    ackAt: r.ackAt ? r.ackAt.toISOString() : null,
  };
}

export async function listAlertCenter(q: { tab: AlertTab; page: number }, now: Date = new Date()): Promise<AlertCenterData> {
  const since = new Date(now.getTime() - ALERT_WINDOW_DAYS * 24 * 3600_000);
  const newCount = await prisma.alert.count({ where: { status: "NEW" } });
  const loadedAt = now.toISOString();

  if (q.tab === "new") {
    const rows = await prisma.alert.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: NEW_TAB_LIMIT, select: SELECT });
    const dtos = sortNewAlerts<AlertRowDTO>(rows.map(toDTO));
    return { tab: "new", rows: dtos, total: newCount, page: 1, pageSize: NEW_TAB_LIMIT, newCount, loadedAt };
  }

  const where: Prisma.AlertWhereInput =
    q.tab === "ack"
      ? { status: { in: ["ACKNOWLEDGED", "DONE"] }, ackAt: { gte: since } }
      : { status: "CANCELLED", createdAt: { gte: since } };
  const [total, rows] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({
      where,
      orderBy: q.tab === "ack" ? { ackAt: "desc" } : { createdAt: "desc" },
      skip: (q.page - 1) * ALERT_PAGE_SIZE,
      take: ALERT_PAGE_SIZE,
      select: SELECT,
    }),
  ]);
  return { tab: q.tab, rows: rows.map(toDTO), total, page: q.page, pageSize: ALERT_PAGE_SIZE, newCount, loadedAt };
}

// ---------------------------------------------------------------- รับทราบ
export type AckResult =
  | { ok: true; newAlertTotal: number }
  | { ok: false; code: "INVALID" | "NOT_FOUND" | "ALREADY_HANDLED" | "FAILED"; error: string; by?: string | null; at?: string | null; status?: AlertStatusName };

const ackSchema = z.object({ alertId: z.string().uuid() });

export async function acknowledgeAlert(raw: unknown): Promise<AckResult> {
  const user = await requireUser();
  const parsed = ackSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "INVALID", error: "ข้อมูลไม่ถูกต้อง" };
  try {
    const r = await prisma.$transaction((tx) => acknowledgeCore(tx as unknown as AckTx, { userId: user.id, alertId: parsed.data.alertId, now: new Date() }));
    if (r.kind === "not_found") return { ok: false, code: "NOT_FOUND", error: "ไม่พบ Alert นี้" };
    if (r.kind === "already") {
      const cancelled = r.status === "CANCELLED";
      return {
        ok: false, code: "ALREADY_HANDLED", status: r.status as AlertStatusName, by: r.by, at: r.at ? r.at.toISOString() : null,
        error: cancelled ? "Alert นี้ถูกยกเลิกแล้ว" : `${r.by ?? "ผู้ใช้อื่น"} รับทราบรายการนี้ไปแล้ว`,
      };
    }
    return { ok: true, newAlertTotal: await prisma.alert.count({ where: { status: "NEW" } }) };
  } catch (e) {
    console.error("acknowledgeAlert failed", { name: (e as { name?: string }).name, code: (e as { code?: string }).code });
    return { ok: false, code: "FAILED", error: "บันทึกการรับทราบไม่สำเร็จ รายการยังอยู่ในแท็บ ใหม่ กรุณาลองใหม่อีกครั้ง" };
  }
}
