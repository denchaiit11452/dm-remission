import { describe, expect, it } from "vitest";
import { EMPTY_PATIENT_FORM, changedFields, toPatientPayload } from "./patient-form";

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
