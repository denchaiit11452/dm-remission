import { describe, expect, it } from "vitest";
import {
  EMPTY_PATIENT_FORM, changedFields, issuesFromFieldErrors, requiredFieldStatus, sanitizeHnInput, sanitizePhoneInput, toPatientPayload, validatePatientForm,
} from "./patient-form";
import { patientChangedValuesSchema, patientSchema, updatePatientSchema } from "./data/schemas";

describe("sanitizePhoneInput", () => {
  it("เหลือเฉพาะตัวเลข และวางเบอร์ที่มีขีดแล้วเลขไม่หาย", () => {
    expect(sanitizePhoneInput("081-234-5678")).toBe("0812345678");
    expect(sanitizePhoneInput("08a1 ๑๒")).toBe("081");
  });

  it("ไม่เกิน 10 หลัก", () => {
    expect(sanitizePhoneInput("08123456789")).toBe("0812345678");
  });
});

describe("sanitizeHnInput", () => {
  it("ไม่เกิน 7 ตัว และช่องว่างที่ติดมาไม่ทำให้เลขท้ายหาย", () => {
    expect(sanitizeHnInput("67001234")).toBe("6700123");
    expect(sanitizeHnInput(" 6700123 ")).toBe("6700123");
  });

  it("เหลือเฉพาะตัวเลข", () => {
    expect(sanitizeHnInput("AB-12")).toBe("12");
    expect(sanitizeHnInput("๑๒3")).toBe("3");
  });
});

describe("ขอบเขต HN และเบอร์โทร", () => {
  const ok = { hn: "6700123", firstName: "ทดสอบ", lastName: "สมมติ" };
  const id = "11111111-1111-4111-8111-111111111111";

  it("เพิ่มผู้ป่วย: HN ต้องเป็นตัวเลขไม่เกิน 7 หลัก", () => {
    expect(patientSchema.safeParse(ok).success).toBe(true);
    expect(patientSchema.safeParse({ ...ok, hn: "670012" }).success).toBe(true);
    for (const hn of ["67001234", "AB12", "67-0012"]) {
      expect(patientSchema.safeParse({ ...ok, hn }).success).toBe(false);
    }
  });

  it("เพิ่มผู้ป่วย: เบอร์ทั้งสองช่องเว้นว่างได้ แต่ถ้ากรอกต้องเป็นตัวเลข 10 หลักพอดี", () => {
    expect(patientSchema.safeParse({ ...ok, phone: null, emergencyContactPhone: null }).success).toBe(true);
    expect(patientSchema.safeParse({ ...ok, phone: "0812345678", emergencyContactPhone: "0212345678" }).success).toBe(true);
    for (const phone of ["081", "021234567", "08123456789", "081-234-5678", "081234567a"]) {
      expect(patientSchema.safeParse({ ...ok, phone }).success).toBe(false);
      expect(patientSchema.safeParse({ ...ok, emergencyContactPhone: phone }).success).toBe(false);
    }
  });

  it("แก้ไขผู้ป่วยเก่า: HN และเบอร์เดิมที่ไม่ตรงกฎใหม่ยังผ่าน จึงแก้ช่องอื่นได้", () => {
    expect(updatePatientSchema.safeParse({ ...ok, id, hn: "HN-2020-000123", phone: "081-234-5678" }).success).toBe(true);
  });

  it("แก้ไขผู้ป่วย: ค่าที่เปลี่ยนต้องตรงกฎใหม่ ส่วนการล้างเบอร์ออกทำได้", () => {
    expect(patientChangedValuesSchema.safeParse({ hn: "67001234" }).success).toBe(false);
    expect(patientChangedValuesSchema.safeParse({ hn: "AB12" }).success).toBe(false);
    expect(patientChangedValuesSchema.safeParse({ phone: "081-234-5678" }).success).toBe(false);
    expect(patientChangedValuesSchema.safeParse({ phone: "081234567" }).success).toBe(false);
    expect(patientChangedValuesSchema.safeParse({ phone: "" }).success).toBe(true);
    expect(patientChangedValuesSchema.safeParse({ address: "ไม่เกี่ยวกับกฎนี้" }).success).toBe(true);
  });
});

describe("validatePatientForm", () => {
  const today = "2026-11-05";
  const complete = { ...EMPTY_PATIENT_FORM, hn: "6700123", firstName: "ทดสอบ", lastName: "สมมติ" };

  it("ฟอร์มว่างบอกช่องจำเป็นครบทั้งสามช่องตามลำดับบนหน้าจอ", () => {
    const issues = validatePatientForm(EMPTY_PATIENT_FORM, { today });
    expect(issues.map((i) => [i.name, i.kind])).toEqual([["hn", "missing"], ["firstName", "missing"], ["lastName", "missing"]]);
  });

  it("แยกช่องที่ไม่ได้กรอกกับช่องที่กรอกผิด และเรียงตามหน้าจอ", () => {
    const issues = validatePatientForm({ ...EMPTY_PATIENT_FORM, hn: "AB12", lastName: "สมมติ", phone: "08123", birthDate: "2027-01-01" }, { today });
    expect(issues.map((i) => [i.name, i.kind])).toEqual([["hn", "invalid"], ["firstName", "missing"], ["birthDate", "invalid"], ["phone", "invalid"]]);
    expect(issues.find((i) => i.name === "phone")?.message).toBe("ต้องครบ 10 หลัก ตอนนี้มี 5 หลัก");
    expect(issues.find((i) => i.name === "hn")?.message).toBe("HN ต้องเป็นตัวเลขเท่านั้น");
  });

  it("ตัดสินตรงกับ patientSchema ของ server ทุกกรณี", () => {
    const cases = [
      complete,
      EMPTY_PATIENT_FORM,
      { ...complete, hn: "   " },
      { ...complete, hn: "67001234" },
      { ...complete, hn: "AB12" },
      { ...complete, phone: "0812345678", emergencyContactPhone: "0212345678" },
      { ...complete, phone: "081234567" },
      { ...complete, emergencyContactPhone: "08123456789" },
      { ...complete, phone: "081-234-5678" },
    ];
    for (const values of cases) {
      expect(validatePatientForm(values, { today }).length === 0).toBe(patientSchema.safeParse(toPatientPayload(values)).success);
    }
  });

  it("แก้ไขผู้ป่วยเก่า: HN และเบอร์เดิมไม่ถูกตรวจ แต่ค่าที่เปลี่ยนต้องตรงกฎ", () => {
    const initial = { ...complete, hn: "HN-2020-000123", phone: "081-234-5678" };
    expect(validatePatientForm(initial, { today, initial })).toEqual([]);
    expect(validatePatientForm({ ...initial, phone: "081" }, { today, initial }).map((i) => i.name)).toEqual(["phone"]);
    expect(validatePatientForm({ ...initial, phone: "" }, { today, initial })).toEqual([]);
  });
});

describe("issuesFromFieldErrors", () => {
  it("แปลงข้อผิดพลาดจาก server เรียงตามหน้าจอ และข้ามช่องที่ฟอร์มไม่รู้จัก", () => {
    const issues = issuesFromFieldErrors({ phone: "ผิด", hn: "HN นี้มีอยู่ในระบบแล้ว", id: "รหัสผิด" });
    expect(issues.map((i) => [i.name, i.label, i.kind])).toEqual([["hn", "HN", "invalid"], ["phone", "เบอร์โทรศัพท์", "invalid"]]);
  });
});

describe("requiredFieldStatus", () => {
  it("ฟอร์มว่างยังขาดครบทั้งสามช่อง", () => {
    expect(requiredFieldStatus(EMPTY_PATIENT_FORM).map((f) => f.filled)).toEqual([false, false, false]);
  });

  it("ช่องที่มีแต่ช่องว่างถือว่ายังไม่กรอก", () => {
    const status = requiredFieldStatus({ ...EMPTY_PATIENT_FORM, hn: "670001", firstName: "   " });
    expect(status.filter((f) => !f.filled).map((f) => f.label)).toEqual(["ชื่อ", "นามสกุล"]);
  });

  it("กรอกครบตามนี้แล้ว server ต้องรับได้ คำว่า 'ครบแล้ว' บนหน้าจอจึงไม่หลอกผู้ใช้", () => {
    const values = { ...EMPTY_PATIENT_FORM, hn: "670001", firstName: "ทดสอบ", lastName: "สมมติ" };
    expect(requiredFieldStatus(values).every((f) => f.filled)).toBe(true);
    expect(patientSchema.safeParse(toPatientPayload(values)).success).toBe(true);
  });
});

describe("toPatientPayload", () => {
  it("ช่องว่างและช่องที่มีแต่ช่องว่างกลายเป็น null", () => {
    const payload = toPatientPayload({ ...EMPTY_PATIENT_FORM, hn: "670001", phone: "   " });
    expect(payload.hn).toBe("670001");
    expect(payload.phone).toBeNull();
    expect(payload.birthDate).toBeNull();
  });
});

describe("changedFields", () => {
  it("เก็บเฉพาะช่องที่เปลี่ยน", () => {
    const before = { ...EMPTY_PATIENT_FORM, hn: "1", phone: "081", address: "เดิม" };
    const after = { ...before, phone: "082" };
    expect(changedFields(before, after)).toEqual({ before: { phone: "081" }, after: { phone: "082" } });
  });

  it("ไม่มีอะไรเปลี่ยน = ว่าง", () => {
    expect(changedFields(EMPTY_PATIENT_FORM, EMPTY_PATIENT_FORM)).toEqual({ before: {}, after: {} });
  });
});
