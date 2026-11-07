import { beforeEach, describe, expect, it, vi } from "vitest";
import { canEditLocation, canViewLocation } from "@/lib/auth/permissions";
import { savePatientLocationSchema } from "./schemas";

const { requireRole, transaction, tx } = vi.hoisted(() => {
  const tx = {
    patient: { findFirst: vi.fn() },
    patientLocation: { findUnique: vi.fn(), upsert: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    requireRole: vi.fn(),
    transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    tx,
  };
});

vi.mock("@/lib/auth/session", () => ({ requireRole, requireUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "user-agent": "vitest" }) }));
vi.mock("@/lib/date", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/date")>()),
  todayInBangkok: () => "2026-11-06",
}));

const { savePatientLocation } = await import("./locations");

const PATIENT = "11111111-1111-4111-8111-111111111111";
const VALID = {
  patientId: PATIENT,
  latitude: 13.756331,
  longitude: 100.501765,
  addressNote: "บ้านไม้สองชั้น",
  consentConfirmed: true,
  consentGivenAt: "2026-11-05",
};

describe("สิทธิ์พิกัดบ้าน", () => {
  it("ดูได้ทั้งผู้ดูแลระบบ แพทย์ และพยาบาล", () => {
    expect(canViewLocation("ADMIN")).toBe(true);
    expect(canViewLocation("DOCTOR")).toBe(true);
    expect(canViewLocation("STAFF")).toBe(true);
  });
  it("ปักหมุดได้เฉพาะผู้ดูแลระบบและพยาบาล", () => {
    expect(canEditLocation("ADMIN")).toBe(true);
    expect(canEditLocation("STAFF")).toBe(true);
    expect(canEditLocation("DOCTOR")).toBe(false);
  });
});

describe("savePatientLocationSchema", () => {
  it("รับพิกัดในประเทศไทยที่ยืนยันความยินยอมแล้ว", () => {
    expect(savePatientLocationSchema.safeParse(VALID).success).toBe(true);
  });
  it("ไม่รับถ้ายังไม่ยืนยันความยินยอม", () => {
    const r = savePatientLocationSchema.safeParse({ ...VALID, consentConfirmed: false });
    expect(r.success).toBe(false);
  });
  it("ไม่รับละติจูด/ลองจิจูดที่สลับกันหรืออยู่นอกประเทศ", () => {
    expect(savePatientLocationSchema.safeParse({ ...VALID, latitude: 100.5, longitude: 13.7 }).success).toBe(false);
    expect(savePatientLocationSchema.safeParse({ ...VALID, latitude: 35.68, longitude: 139.69 }).success).toBe(false);
  });
  it("ไม่รับเมื่อยังไม่ได้ปักหมุด", () => {
    expect(savePatientLocationSchema.safeParse({ ...VALID, latitude: null, longitude: null }).success).toBe(false);
  });
});

describe("savePatientLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({ id: "user-nurse", role: "STAFF" });
    tx.patient.findFirst.mockResolvedValue({ id: PATIENT });
    tx.patientLocation.findUnique.mockResolvedValue(null);
    tx.patientLocation.upsert.mockResolvedValue({ id: "loc-1" });
  });

  it("ตรวจสิทธิ์ด้วยบทบาทผู้ปักหมุด และไม่บันทึกอะไรเมื่อไม่มีสิทธิ์", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT:/forbidden"));
    await expect(savePatientLocation(VALID)).rejects.toThrow("NEXT_REDIRECT");
    expect(requireRole).toHaveBeenCalledWith("ADMIN", "STAFF");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ไม่รับวันที่ยินยอมในอนาคต", async () => {
    const r = await savePatientLocation({ ...VALID, consentGivenAt: "2026-11-07" });
    expect(r.ok).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ปักหมุดครั้งแรก: บันทึก MAP_PIN ผู้บันทึกความยินยอมคือผู้ใช้ และ audit เป็น CREATE", async () => {
    const r = await savePatientLocation(VALID);
    expect(r).toEqual({ ok: true, patientId: PATIENT });
    const args = tx.patientLocation.upsert.mock.calls[0][0];
    expect(args.create).toMatchObject({ method: "MAP_PIN", consentRecordedById: "user-nurse", updatedById: "user-nurse" });
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "CREATE", entity: "patient_location", entityId: "loc-1" });
  });

  it("แก้หมุดโดยวันที่ยินยอมเดิม: คงผู้บันทึกความยินยอมเดิม และ audit เป็น UPDATE พร้อมค่าก่อนแก้", async () => {
    tx.patientLocation.findUnique.mockResolvedValue({
      id: "loc-1", latitude: 13.7, longitude: 100.5, method: "MAP_PIN", addressNote: null,
      consentGivenAt: new Date("2026-11-05T00:00:00.000Z"), consentRecordedById: "user-admin",
    });
    await savePatientLocation(VALID);
    const args = tx.patientLocation.upsert.mock.calls[0][0];
    expect(args.update).toMatchObject({ consentRecordedById: "user-admin", updatedById: "user-nurse" });
    const audit = tx.auditLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe("UPDATE");
    expect(audit.before).toMatchObject({ latitude: 13.7, consentGivenAt: "2026-11-05" });
  });

  it("ไม่พบผู้ป่วย (หรือถูกลบแล้ว) ไม่บันทึกพิกัด", async () => {
    tx.patient.findFirst.mockResolvedValue(null);
    const r = await savePatientLocation(VALID);
    expect(r.ok).toBe(false);
    expect(tx.patientLocation.upsert).not.toHaveBeenCalled();
  });
});
