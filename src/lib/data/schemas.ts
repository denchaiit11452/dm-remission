// สคีมาตรวจข้อมูลที่รับเข้ามาก่อนบันทึก (ไม่ต่อฐานข้อมูล ทดสอบได้)
import { z } from "zod";

/**
 * ช่วงค่า DTX ที่รับได้ตอนกรอก: กันพิมพ์ผิดอย่างหยาบ (เช่น 85000) เท่านั้น ไม่ใช่เกณฑ์ทางคลินิก
 * ควรให้ผู้ดูแลเครื่อง DTX ของโรงพยาบาลยืนยันช่วงที่เครื่องอ่านได้จริง
 */
export const GLUCOSE_ENTRY_LIMITS = { min: 10, max: 1000 } as const;

/** ช่วงค่าผลตรวจอื่นที่รับได้ (กันพิมพ์ผิดเช่นกัน) */
export const LAB_LIMITS = {
  hba1c: { min: 3, max: 20 },
  weightKg: { min: 10, max: 400 },
  heightCm: { min: 50, max: 260 },
  sbp: { min: 50, max: 300 },
  dbp: { min: 30, max: 200 },
} as const;

export const GLUCOSE_PERIODS = ["BEFORE_BREAKFAST", "AFTER_BREAKFAST", "BEFORE_DINNER", "AFTER_DINNER"] as const;

function isRealDate(key: string): boolean {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง")
  .refine(isRealDate, "วันที่ไม่มีอยู่จริง");

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "เวลาต้องเป็นรูปแบบ HH:mm");

const glucoseEntrySchema = z
  .object({
    period: z.enum(GLUCOSE_PERIODS, { message: "เลือกช่วงเวลาที่วัด" }),
    valueMgDl: z
      .number({ message: "ค่าน้ำตาลต้องเป็นตัวเลข" })
      .int("ค่าน้ำตาลต้องเป็นจำนวนเต็ม")
      .min(GLUCOSE_ENTRY_LIMITS.min, `ค่าน้ำตาลต้องไม่ต่ำกว่า ${GLUCOSE_ENTRY_LIMITS.min}`)
      .max(GLUCOSE_ENTRY_LIMITS.max, `ค่าน้ำตาลต้องไม่เกิน ${GLUCOSE_ENTRY_LIMITS.max}`)
      .nullish(),
    meterFlag: z.enum(["NONE", "METER_LOW", "METER_HIGH"]).default("NONE"),
    measuredTime: hhmm.nullish(),
    note: z.string().trim().max(500, "หมายเหตุยาวเกิน 500 ตัวอักษร").nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.meterFlag === "NONE" && (v.valueMgDl === null || v.valueMgDl === undefined)) {
      ctx.addIssue({ code: "custom", path: ["valueMgDl"], message: "กรุณากรอกค่า DTX หรือเลือก LO/HI" });
    }
    if (v.meterFlag !== "NONE" && v.valueMgDl !== null && v.valueMgDl !== undefined) {
      ctx.addIssue({ code: "custom", path: ["valueMgDl"], message: "ถ้าเครื่องขึ้น LO/HI ไม่ต้องกรอกตัวเลข" });
    }
  });

export const saveGlucoseSchema = z.object({
  patientId: z.string().uuid("รหัสผู้ป่วยไม่ถูกต้อง"),
  measuredDate: dateKey,
  entries: z.array(glucoseEntrySchema).min(1, "กรอกค่าอย่างน้อย 1 ช่วง").max(12, "กรอกได้ไม่เกิน 12 ค่าต่อครั้ง"),
});

const optionalNumber = (min: number, max: number, label: string) =>
  z.number({ message: `${label}ต้องเป็นตัวเลข` }).min(min, `${label}ต้องไม่ต่ำกว่า ${min}`).max(max, `${label}ต้องไม่เกิน ${max}`).nullish();

export const saveLabSchema = z
  .object({
    patientId: z.string().uuid("รหัสผู้ป่วยไม่ถูกต้อง"),
    recordedDate: dateKey,
    hba1c: optionalNumber(LAB_LIMITS.hba1c.min, LAB_LIMITS.hba1c.max, "HbA1c"),
    weightKg: optionalNumber(LAB_LIMITS.weightKg.min, LAB_LIMITS.weightKg.max, "น้ำหนัก"),
    heightCm: optionalNumber(LAB_LIMITS.heightCm.min, LAB_LIMITS.heightCm.max, "ส่วนสูง"),
    sbp: z.number().int("ความดันต้องเป็นจำนวนเต็ม").min(LAB_LIMITS.sbp.min).max(LAB_LIMITS.sbp.max).nullish(),
    dbp: z.number().int("ความดันต้องเป็นจำนวนเต็ม").min(LAB_LIMITS.dbp.min).max(LAB_LIMITS.dbp.max).nullish(),
    note: z.string().trim().max(500, "หมายเหตุยาวเกิน 500 ตัวอักษร").nullish(),
  })
  .superRefine((v, ctx) => {
    const has = [v.hba1c, v.weightKg, v.heightCm, v.sbp, v.dbp].some((x) => x !== null && x !== undefined);
    if (!has) ctx.addIssue({ code: "custom", path: ["hba1c"], message: "กรอกผลตรวจอย่างน้อย 1 อย่าง" });
    if ((v.sbp == null) !== (v.dbp == null)) {
      ctx.addIssue({ code: "custom", path: [v.sbp == null ? "sbp" : "dbp"], message: "กรอกความดันให้ครบทั้งตัวบนและตัวล่าง" });
    }
  });

export type SaveGlucoseInput = z.output<typeof saveGlucoseSchema>;
export type SaveLabInput = z.output<typeof saveLabSchema>;

/** แปลง error ของ zod เป็นข้อความรายช่อง (key = path เช่น "entries.1.valueMgDl") */
export function toFieldErrors(error: z.ZodError): { message: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  const first = error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
  return { message: first, fieldErrors };
}
