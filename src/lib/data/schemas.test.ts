import { describe, expect, it } from "vitest";
import { GLUCOSE_ENTRY_LIMITS, saveGlucoseSchema, saveLabSchema, toFieldErrors } from "./schemas";

const PID = "3f2b8c1e-9d4a-4b7e-8c21-5a6d7e8f9a0b";
const base = { patientId: PID, measuredDate: "2026-10-15", entries: [{ period: "BEFORE_BREAKFAST", valueMgDl: 132 }] };
const withEntry = (e: Record<string, unknown>) => ({ ...base, entries: [e] });

describe("saveGlucoseSchema", () => {
  it("รับข้อมูลที่ถูกต้อง และใส่ค่าเริ่มต้น meterFlag = NONE", () => {
    const r = saveGlucoseSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.entries[0].meterFlag).toBe("NONE");
  });

  it("รับค่าที่ขอบของช่วงที่กรอกได้ และปฏิเสธนอกช่วง", () => {
    const { min, max } = GLUCOSE_ENTRY_LIMITS;
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_DINNER", valueMgDl: min })).success).toBe(true);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_DINNER", valueMgDl: max })).success).toBe(true);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_DINNER", valueMgDl: min - 1 })).success).toBe(false);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_DINNER", valueMgDl: max + 1 })).success).toBe(false);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_DINNER", valueMgDl: 85000 })).success).toBe(false);
  });

  it("ปฏิเสธทศนิยมและข้อความที่ไม่ใช่ตัวเลข", () => {
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "BEFORE_DINNER", valueMgDl: 120.5 })).success).toBe(false);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "BEFORE_DINNER", valueMgDl: "120" })).success).toBe(false);
  });

  it("ไม่มีค่าและเครื่องไม่ได้ขึ้น LO/HI -> ไม่ผ่าน", () => {
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "BEFORE_DINNER" })).success).toBe(false);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "BEFORE_DINNER", valueMgDl: null })).success).toBe(false);
  });

  it("เครื่องขึ้น LO/HI: ไม่ต้องมีตัวเลข และห้ามมีตัวเลขพร้อมกัน", () => {
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "BEFORE_DINNER", meterFlag: "METER_LOW" })).success).toBe(true);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "BEFORE_DINNER", meterFlag: "METER_HIGH", valueMgDl: null })).success).toBe(true);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "BEFORE_DINNER", meterFlag: "METER_HIGH", valueMgDl: 600 })).success).toBe(false);
  });

  it("เวลาที่วัดต้องเป็น HH:mm", () => {
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_BREAKFAST", valueMgDl: 100, measuredTime: "07:30" })).success).toBe(true);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_BREAKFAST", valueMgDl: 100, measuredTime: "25:00" })).success).toBe(false);
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "AFTER_BREAKFAST", valueMgDl: 100, measuredTime: "7:30" })).success).toBe(false);
  });

  it("ปฏิเสธช่วงเวลาที่ไม่รู้จัก วันที่ที่ไม่มีจริง และรหัสผู้ป่วยที่ไม่ใช่ uuid", () => {
    expect(saveGlucoseSchema.safeParse(withEntry({ period: "LUNCH", valueMgDl: 100 })).success).toBe(false);
    expect(saveGlucoseSchema.safeParse({ ...base, measuredDate: "2026-02-31" }).success).toBe(false);
    expect(saveGlucoseSchema.safeParse({ ...base, measuredDate: "15/10/2026" }).success).toBe(false);
    expect(saveGlucoseSchema.safeParse({ ...base, patientId: "6700123" }).success).toBe(false);
  });

  it("ต้องมีอย่างน้อย 1 ค่า และไม่เกิน 12 ค่า (วัดซ้ำช่วงเดียวกันได้)", () => {
    expect(saveGlucoseSchema.safeParse({ ...base, entries: [] }).success).toBe(false);
    const same = Array.from({ length: 3 }, () => ({ period: "AFTER_DINNER", valueMgDl: 140 }));
    expect(saveGlucoseSchema.safeParse({ ...base, entries: same }).success).toBe(true);
    const many = Array.from({ length: 13 }, () => ({ period: "AFTER_DINNER", valueMgDl: 140 }));
    expect(saveGlucoseSchema.safeParse({ ...base, entries: many }).success).toBe(false);
  });

  it("toFieldErrors ระบุช่องที่ผิดตามตำแหน่ง", () => {
    const r = saveGlucoseSchema.safeParse({
      ...base,
      entries: [{ period: "BEFORE_BREAKFAST", valueMgDl: 100 }, { period: "AFTER_BREAKFAST", valueMgDl: 5 }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = toFieldErrors(r.error);
      expect(Object.keys(f.fieldErrors)).toContain("entries.1.valueMgDl");
      expect(f.message.length).toBeGreaterThan(0);
    }
  });
});

describe("saveLabSchema", () => {
  const lab = { patientId: PID, recordedDate: "2026-10-15" };
  it("ต้องมีผลตรวจอย่างน้อย 1 อย่าง", () => {
    expect(saveLabSchema.safeParse(lab).success).toBe(false);
    expect(saveLabSchema.safeParse({ ...lab, hba1c: 6.4 }).success).toBe(true);
  });
  it("ความดันต้องกรอกครบตัวบนและตัวล่าง", () => {
    expect(saveLabSchema.safeParse({ ...lab, sbp: 180 }).success).toBe(false);
    expect(saveLabSchema.safeParse({ ...lab, dbp: 100 }).success).toBe(false);
    expect(saveLabSchema.safeParse({ ...lab, sbp: 180, dbp: 119 }).success).toBe(true);
  });
  it("ปฏิเสธค่านอกช่วง (กันพิมพ์ผิด)", () => {
    expect(saveLabSchema.safeParse({ ...lab, hba1c: 2 }).success).toBe(false);
    expect(saveLabSchema.safeParse({ ...lab, hba1c: 64 }).success).toBe(false);
    expect(saveLabSchema.safeParse({ ...lab, sbp: 1800, dbp: 100 }).success).toBe(false);
  });
});
