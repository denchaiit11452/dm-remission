// รายการ Alert วิกฤตที่ยังไม่รับทราบ สำหรับกล่องเด้งเตือนบนหน้าจอ (อ่านอย่างเดียว เรียกจาก server เท่านั้น)
import type { CriticalAlertDTO } from "@/lib/critical-alerts";
import { daysBetween, toBangkokDateKey, toDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { fullName } from "./view";

const LIMIT = 100;

export async function listCriticalNewAlerts(currentUserId: string): Promise<CriticalAlertDTO[]> {
  const rows = await prisma.alert.findMany({
    where: { status: "NEW", level: "CRITICAL" },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    select: {
      id: true, patientId: true, summary: true, eventDate: true, createdAt: true,
      patient: { select: { hn: true, prefix: true, firstName: true, lastName: true } },
      glucoseReading: { select: { createdById: true } },
      labRecord: { select: { createdById: true } },
    },
  });
  return rows.map((r) => {
    const measuredDate = toDateKey(r.eventDate);
    const enteredBy = r.glucoseReading?.createdById ?? r.labRecord?.createdById ?? null;
    return {
      id: r.id,
      patientId: r.patientId,
      patientName: fullName(r.patient),
      hn: r.patient.hn,
      summary: r.summary,
      measuredDate,
      createdAt: r.createdAt.toISOString(),
      backdatedDays: Math.max(0, daysBetween(measuredDate, toBangkokDateKey(r.createdAt))),
      enteredByMe: enteredBy === currentUserId,
    };
  });
}
