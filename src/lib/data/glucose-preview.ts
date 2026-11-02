// อ่านข้อมูลเดิมของผู้ป่วยเพื่อทำ "ตัวอย่างก่อนบันทึก" (อ่านอย่างเดียว ไม่เขียนอะไรลงฐานข้อมูล)
import { requireUser } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { previewSave, type SavePreview } from "@/lib/glucose-preview";
import { prisma } from "@/lib/prisma";
import { dateFromKey, toBloodPressureInput, toGlucoseInput } from "./mappers";
import { loadRules } from "./patients";
import { saveGlucoseSchema } from "./schemas";

export type PreviewResult = { ok: true; preview: SavePreview } | { ok: false; error: string };

export async function previewGlucose(raw: unknown): Promise<PreviewResult> {
  await requireUser();
  const parsed = saveGlucoseSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { patientId, measuredDate, entries } = parsed.data;

  const today = todayInBangkok();
  if (measuredDate > today) return { ok: false, error: "วันที่ผู้ป่วยวัดต้องไม่เป็นวันในอนาคต" };

  try {
    const { rules } = await loadRules();
    const hasValue = { OR: [{ valueMgDl: { not: null } }, { meterFlag: { not: "NONE" as const } }] };

    const latest = await prisma.glucoseReading.findFirst({
      where: { patientId, voidedAt: null, measuredDate: { lte: dateFromKey(today) }, ...hasValue },
      orderBy: { measuredDate: "desc" },
      select: { measuredDate: true },
    });
    const dates = [dateFromKey(measuredDate), ...(latest ? [latest.measuredDate] : [])];
    const glucoseRows = await prisma.glucoseReading.findMany({
      where: { patientId, voidedAt: null, measuredDate: { in: dates } },
      select: { id: true, measuredDate: true, period: true, valueMgDl: true, meterFlag: true, voidedAt: true },
    });

    const latestLab = await prisma.labRecord.findFirst({
      where: { patientId, voidedAt: null, recordedDate: { lte: dateFromKey(today) }, OR: [{ sbp: { not: null } }, { dbp: { not: null } }] },
      orderBy: { recordedDate: "desc" },
      select: { recordedDate: true },
    });
    const labRows = latestLab
      ? await prisma.labRecord.findMany({
          where: { patientId, voidedAt: null, recordedDate: latestLab.recordedDate, OR: [{ sbp: { not: null } }, { dbp: { not: null } }] },
          select: { id: true, recordedDate: true, sbp: true, dbp: true, voidedAt: true },
        })
      : [];

    const preview = previewSave({
      existing: glucoseRows.map(toGlucoseInput),
      bloodPressures: labRows.map(toBloodPressureInput),
      proposed: entries.map((e) => ({ period: e.period, valueMgDl: e.valueMgDl ?? null, meterFlag: e.meterFlag })),
      measuredDate,
      rules,
      today,
    });
    return { ok: true, preview };
  } catch (e) {
    console.error("previewGlucose failed", e);
    return { ok: false, error: "ประเมินตัวอย่างไม่ได้ในขณะนี้" };
  }
}

