// ข้อมูลผู้ป่วยสมมติสำหรับพัฒนาและทดสอบหน้าจอ (ชื่อ HN ค่าทั้งหมดเป็นของสมมติ)
// สร้างผ่านโค้ดบันทึกจริง (saveGlucoseCore / saveLabCore) เพื่อให้ระดับความเสี่ยงและ Alert
// ถูกคำนวณด้วยตรรกะเดียวกับที่ฟอร์มใช้ และใช้ทดสอบชั้นข้อมูลไปพร้อมกัน
// เรียกจาก src/app/api/dev/seed/route.ts เฉพาะโหมดพัฒนาเท่านั้น
import type { DiabetesType, Gender, ProgramStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, todayInBangkok } from "@/lib/date";
import { saveGlucoseCore } from "./glucose";
import { saveLabCore } from "./labs";
import { dateFromKey } from "./mappers";
import { getActiveRuleSet } from "./risk-service";

export const DEMO_MARK = "DEMO_SEED";          // ใส่ใน patients.notes เพื่อระบุว่าเป็นข้อมูลสาธิต
export const DEMO_RULES_MARK = "DEMO_RULES";    // ใส่ต้น risk_rule_sets.changeReason ของเกณฑ์สมมติ

/**
 * เกณฑ์สมมติสำหรับทดสอบหน้าจอเท่านั้น (ตัวเลขแต่งขึ้น ไม่ใช่เกณฑ์ทางคลินิก ห้ามใช้กับผู้ป่วยจริง)
 * ใช้เฉพาะเมื่อสั่ง seed ด้วย demoRules และถูกลบเมื่อ reset
 */
const DEMO_TEST_RULES = {
  watchBelow: 70, watchAbove: 200, highBelow: 60, highAbove: 300,
  criticalGlucoseBelow: 50, criticalGlucoseAbove: 400,
} as const;

type P = "BEFORE_BREAKFAST" | "AFTER_BREAKFAST" | "BEFORE_DINNER" | "AFTER_DINNER";
const BB: P = "BEFORE_BREAKFAST", AB: P = "AFTER_BREAKFAST", BD: P = "BEFORE_DINNER", AD: P = "AFTER_DINNER";

type DemoPatient = {
  hn: string; firstName: string; lastName: string; gender: Gender; birth: string;
  status: ProgramStatus; type: DiabetesType;
  programStartOffset: number; remissionStartOffset?: number;
  meds: { startOffset: number; endOffset: number | null }[];
  /** วัน (นับย้อนหลังจากวันนี้) -> ค่าน้ำตาลของวันนั้น */
  glucose: Record<number, [P, number][]>;
  labs: { offset: number; hba1c?: number; sbp?: number; dbp?: number; weightKg?: number; heightCm?: number }[];
};

const DEMO: DemoPatient[] = [
  { hn: "6700123", firstName: "สมชาย", lastName: "ตัวอย่างหนึ่ง", gender: "MALE", birth: "1968-03-12", status: "IN_PROGRAM", type: "TYPE2",
    programStartOffset: 250, meds: [{ startOffset: 1500, endOffset: null }],
    glucose: {
      1: [[BB, 132], [AB, 168], [BD, 236], [AD, 452]],
      2: [[BB, 118], [AB, 150], [BD, 128], [AD, 305]],
      3: [[BB, 104], [AB, 138], [AD, 142], [AD, 118]],
      4: [[BB, 92], [AB, 121], [BD, 96], [AD, 133]],
      5: [[BB, 76], [AB, 118], [BD, 110]],
      7: [[BB, 98], [AB, 125], [BD, 118], [AD, 140]],
    },
    labs: [{ offset: 30, hba1c: 8.1 }, { offset: 3, sbp: 186, dbp: 102, weightKg: 82, heightCm: 170 }] },
  { hn: "6700456", firstName: "สมหญิง", lastName: "ตัวอย่างสอง", gender: "FEMALE", birth: "1971-07-04", status: "IN_PROGRAM", type: "TYPE2",
    programStartOffset: 200, meds: [{ startOffset: 900, endOffset: null }],
    glucose: { 1: [[BB, 130], [AB, 318]], 2: [[BB, 126], [AB, 150], [BD, 118], [AD, 140]], 4: [[BB, 110], [AB, 135]] },
    labs: [{ offset: 25, hba1c: 7.6 }] },
  { hn: "6700789", firstName: "วิชัย", lastName: "ตัวอย่างสาม", gender: "MALE", birth: "1960-11-23", status: "LOST_REMISSION", type: "TYPE2",
    programStartOffset: 400, meds: [{ startOffset: 1200, endOffset: 300 }, { startOffset: 40, endOffset: null }],
    glucose: { 2: [[BB, 150], [BD, 236]], 3: [[BB, 118], [AB, 140]] },
    labs: [{ offset: 20, hba1c: 7.2 }] },
  { hn: "6701012", firstName: "มาลี", lastName: "ตัวอย่างสี่", gender: "FEMALE", birth: "1979-05-30", status: "IN_PROGRAM", type: "TYPE2",
    programStartOffset: 120, meds: [{ startOffset: 700, endOffset: null }],
    glucose: { 0: [[BB, 130], [AB, 152]], 1: [[BB, 120], [AB, 140], [BD, 118], [AD, 126]] },
    labs: [] },
  { hn: "6701345", firstName: "ประเสริฐ", lastName: "ตัวอย่างห้า", gender: "MALE", birth: "1964-09-09", status: "REMISSION", type: "TYPE2",
    programStartOffset: 365, remissionStartOffset: 40, meds: [{ startOffset: 900, endOffset: 130 }],
    glucose: { 0: [[BB, 112]], 1: [[BB, 108], [AB, 121], [BD, 99], [AD, 118]], 2: [[BB, 115], [AB, 128]] },
    labs: [{ offset: 10, hba1c: 6.2 }] },
  { hn: "6701678", firstName: "สุดา", lastName: "ตัวอย่างหก", gender: "FEMALE", birth: "1975-01-17", status: "IN_PROGRAM", type: "TYPE2",
    programStartOffset: 60, meds: [],
    glucose: { 9: [[BB, 105], [BD, 98]] }, labs: [] },
  { hn: "6701999", firstName: "อนันต์", lastName: "ตัวอย่างเจ็ด", gender: "MALE", birth: "1982-08-02", status: "IN_PROGRAM", type: "TYPE2",
    programStartOffset: 5, meds: [], glucose: {}, labs: [] },
];

export class DemoExistsError extends Error {
  constructor() { super("มีข้อมูลสาธิตอยู่แล้ว ให้ reset ก่อนสร้างใหม่"); this.name = "DemoExistsError"; }
}

export type SeedSummary = {
  patients: number; glucoseReadings: number; labRecords: number; alerts: number;
  ruleSetVersion: number; demoRules: boolean;
};

export async function seedDemo(userId: string, opts: { demoRules: boolean }): Promise<SeedSummary> {
  if ((await prisma.patient.count({ where: { notes: DEMO_MARK } })) > 0) throw new DemoExistsError();
  const today = todayInBangkok();

  // เกณฑ์ชุดที่ 1 (เกณฑ์น้ำตาลของแพทย์เป็นค่าว่าง) ถ้ายังไม่มี
  if ((await prisma.riskRuleSet.count()) === 0) {
    await prisma.riskRuleSet.create({
      data: { version: 1, isActive: true, changeReason: "ชุดเริ่มต้น: เกณฑ์น้ำตาลของแพทย์ยังไม่ได้กำหนด", createdById: userId },
    });
  }
  if (opts.demoRules) {
    const max = await prisma.riskRuleSet.aggregate({ _max: { version: true } });
    await prisma.$transaction([
      prisma.riskRuleSet.updateMany({ data: { isActive: false } }),
      prisma.riskRuleSet.create({
        data: {
          version: (max._max.version ?? 0) + 1, isActive: true, createdById: userId,
          changeReason: `${DEMO_RULES_MARK}: เกณฑ์สมมติสำหรับทดสอบเท่านั้น ห้ามใช้กับผู้ป่วยจริง`,
          ...DEMO_TEST_RULES,
        },
      }),
    ]);
  }
  const active = await getActiveRuleSet(prisma);

  for (const d of DEMO) {
    const patient = await prisma.patient.create({
      data: {
        hn: d.hn, firstName: d.firstName, lastName: d.lastName, gender: d.gender,
        birthDate: dateFromKey(d.birth), diabetesType: d.type, programStatus: d.status,
        diagnosedAt: dateFromKey(addDays(today, -d.programStartOffset - 1500)),
        programStartDate: dateFromKey(addDays(today, -d.programStartOffset)),
        remissionStartedAt: d.remissionStartOffset !== undefined ? dateFromKey(addDays(today, -d.remissionStartOffset)) : null,
        notes: DEMO_MARK, createdById: userId,
      },
      select: { id: true },
    });
    for (const m of d.meds) {
      await prisma.medicationPeriod.create({
        data: {
          patientId: patient.id, drugName: "ยาเบาหวานตัวอย่าง", isDiabetesDrug: true,
          startDate: dateFromKey(addDays(today, -m.startOffset)),
          endDate: m.endOffset === null ? null : dateFromKey(addDays(today, -m.endOffset)),
        },
      });
    }

    // เรียงตามวันจากเก่าไปใหม่ เพื่อให้ประวัติการประเมินเรียงเหมือนใช้งานจริง
    type Ev = { date: string } & ({ kind: "g"; entries: [P, number][] } | { kind: "l"; lab: DemoPatient["labs"][number] });
    const events: Ev[] = [
      ...Object.entries(d.glucose).map(([off, entries]) => ({ date: addDays(today, -Number(off)), kind: "g" as const, entries })),
      ...d.labs.map((lab) => ({ date: addDays(today, -lab.offset), kind: "l" as const, lab })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    for (const ev of events) {
      await prisma.$transaction(
        async (tx) => {
          if (ev.kind === "g") {
            await saveGlucoseCore(tx, {
              userId, today, active, recordedOn: ev.date,
              input: {
                patientId: patient.id, measuredDate: ev.date,
                entries: ev.entries.map(([period, v]) => ({ period, valueMgDl: v, meterFlag: "NONE" as const, measuredTime: null, note: null })),
              },
            });
          } else {
            await saveLabCore(tx, {
              userId, today, active, recordedOn: ev.date,
              input: { patientId: patient.id, recordedDate: ev.date, hba1c: ev.lab.hba1c ?? null, weightKg: ev.lab.weightKg ?? null, heightCm: ev.lab.heightCm ?? null, sbp: ev.lab.sbp ?? null, dbp: ev.lab.dbp ?? null, note: null },
            });
          }
        },
        { timeout: 15_000 },
      );
    }
  }

  const ids = (await prisma.patient.findMany({ where: { notes: DEMO_MARK }, select: { id: true } })).map((p) => p.id);
  return {
    patients: ids.length,
    glucoseReadings: await prisma.glucoseReading.count({ where: { patientId: { in: ids } } }),
    labRecords: await prisma.labRecord.count({ where: { patientId: { in: ids } } }),
    alerts: await prisma.alert.count({ where: { patientId: { in: ids } } }),
    ruleSetVersion: active.version,
    demoRules: opts.demoRules,
  };
}

/** ลบเฉพาะข้อมูลสาธิต (patients.notes = DEMO_SEED) และเกณฑ์สมมติ แล้วคืนเกณฑ์ที่ใช้งานให้เป็นชุดจริง */
export async function resetDemo(): Promise<{ patientsDeleted: number; demoRuleSetsDeleted: number; demoRuleSetsKept: number }> {
  const ids = (await prisma.patient.findMany({ where: { notes: DEMO_MARK }, select: { id: true } })).map((p) => p.id);
  await prisma.$transaction(async (tx) => {
    await tx.alert.deleteMany({ where: { patientId: { in: ids } } });
    await tx.riskAssessment.deleteMany({ where: { patientId: { in: ids } } });
    await tx.glucoseReading.deleteMany({ where: { patientId: { in: ids } } });
    await tx.labRecord.deleteMany({ where: { patientId: { in: ids } } });
    await tx.medicationPeriod.deleteMany({ where: { patientId: { in: ids } } });
    await tx.patientLocation.deleteMany({ where: { patientId: { in: ids } } });
    await tx.auditLog.deleteMany({ where: { patientId: { in: ids } } });
    await tx.patient.deleteMany({ where: { id: { in: ids } } });
  });

  const sets = await prisma.riskRuleSet.findMany({ where: { changeReason: { startsWith: DEMO_RULES_MARK } }, select: { id: true } });
  let deleted = 0;
  for (const s of sets) {
    try { await prisma.riskRuleSet.delete({ where: { id: s.id } }); deleted += 1; } catch { /* ถูกอ้างอิงโดยข้อมูลอื่น เก็บไว้ */ }
  }
  if ((await prisma.riskRuleSet.count({ where: { isActive: true } })) === 0) {
    const top = await prisma.riskRuleSet.findFirst({ orderBy: { version: "desc" }, select: { id: true } });
    if (top) await prisma.riskRuleSet.update({ where: { id: top.id }, data: { isActive: true } });
  }
  return { patientsDeleted: ids.length, demoRuleSetsDeleted: deleted, demoRuleSetsKept: sets.length - deleted };
}
