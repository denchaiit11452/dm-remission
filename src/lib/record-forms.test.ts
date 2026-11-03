import { describe, expect, it } from "vitest";
import { patientSchema, saveLabSchema, saveMedicationSchema, voidRecordSchema } from "./data/schemas";
import { medicationStatus, parseOptionalNumber, toLabPayload } from "./record-forms";

const PID = "3f2b8c1e-9d4a-4b7e-8c21-5a6d7e8f9a0b";
const EMPTY = { recordedDate: "2026-10-15", hba1c: "", weightKg: "", heightCm: "", sbp: "", dbp: "", note: "" };

describe("parseOptionalNumber", () => {
  it("ช่องว่าง = null และอ่านทศนิยมได้", () => {
    expect(parseOptionalNumber("  ")).toBeNull();
    expect(parseOptionalNumber(" 6.5 ")).toBe(6.5);
  });
  it("ข้อความที่ไม่ใช่ตัวเลขคืน NaN ไม่ทิ้งเงียบ ๆ", () => {
    expect(parseOptionalNumber("abc")).toBeNaN();
  });
});

describe("toLabPayload กับ saveLabSchema", () => {
  it("ข้อความที่ไม่ใช่ตัวเลขถูกปฏิเสธพร้อมข้อความภาษาไทย", () => {
    const r = saveLabSchema.safeParse(toLabPayload(PID, { ...EMPTY, hba1c: "abc" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("HbA1c");
  });
  it("ไม่กรอกผลตรวจเลย = ไม่ผ่าน", () => {
    expect(saveLabSchema.safeParse(toLabPayload(PID, EMPTY)).success).toBe(false);
  });
  it("ความดันต้องครบทั้งคู่ และเป็นจำนวนเต็ม", () => {
    expect(saveLabSchema.safeParse(toLabPayload(PID, { ...EMPTY, sbp: "120" })).success).toBe(false);
    expect(saveLabSchema.safeParse(toLabPayload(PID, { ...EMPTY, sbp: "120.5", dbp: "80" })).success).toBe(false);
    expect(saveLabSchema.safeParse(toLabPayload(PID, { ...EMPTY, sbp: "120", dbp: "80" })).success).toBe(true);
  });
});

describe("medicationStatus", () => {
  it("ไม่มีวันหยุดยา = ยังใช้อยู่", () => {
    expect(medicationStatus({ endDate: null }, "2026-10-15")).toBe("ACTIVE");
  });
  it("วันหยุดยาคือวันแรกที่ไม่ได้ใช้ยา (ตรงกับ assessRemission)", () => {
    expect(medicationStatus({ endDate: "2026-10-16" }, "2026-10-15")).toBe("ACTIVE");
    expect(medicationStatus({ endDate: "2026-10-15" }, "2026-10-15")).toBe("STOPPED");
  });
});

describe("patientSchema", () => {
  const ok = { hn: " 670001 ", firstName: "ทดสอบ", lastName: "ระบบ" };
  it("ต้องมี HN ชื่อ นามสกุล และตัดช่องว่างหัวท้าย", () => {
    const r = patientSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.hn).toBe("670001");
      expect(r.data.diabetesType).toBe("UNKNOWN");
    }
    expect(patientSchema.safeParse({ ...ok, hn: "   " }).success).toBe(false);
    expect(patientSchema.safeParse({ hn: "1", lastName: "ระบบ" }).success).toBe(false);
  });
  it("ไม่รับเลขบัตรประชาชนและสถานะโปรแกรมเข้าไปบันทึก", () => {
    const r = patientSchema.safeParse({ ...ok, nationalId: "1234567890123", programStatus: "REMISSION" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("nationalId");
      expect(r.data).not.toHaveProperty("programStatus");
    }
  });
  it("ปฏิเสธวันที่ที่ไม่มีจริง", () => {
    expect(patientSchema.safeParse({ ...ok, birthDate: "2026-02-31" }).success).toBe(false);
  });
});

describe("saveMedicationSchema", () => {
  const ok = { patientId: PID, drugName: "Metformin", isDiabetesDrug: true, startDate: "2026-01-01" };
  it("วันหยุดยาต้องไม่ก่อนวันเริ่มยา แต่เป็นวันเดียวกันได้", () => {
    expect(saveMedicationSchema.safeParse(ok).success).toBe(true);
    expect(saveMedicationSchema.safeParse({ ...ok, endDate: "2026-01-01" }).success).toBe(true);
    expect(saveMedicationSchema.safeParse({ ...ok, endDate: "2025-12-31" }).success).toBe(false);
  });
});

describe("voidRecordSchema", () => {
  it("ต้องระบุเหตุผล", () => {
    expect(voidRecordSchema.safeParse({ id: PID, reason: "   " }).success).toBe(false);
    expect(voidRecordSchema.safeParse({ id: PID, reason: "กรอกผิดคน" }).success).toBe(true);
  });
});
