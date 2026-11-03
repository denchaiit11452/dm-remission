import { beforeEach, describe, expect, it, vi } from "vitest";
import { canManageRecords, RECORD_MANAGER_ROLES } from "@/lib/auth/permissions";

const { requireRole, requireUser, transaction, findFirst } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  requireUser: vi.fn(),
  transaction: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireRole, requireUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction, patient: { findFirst } } }));

const { saveMedication, stopMedication, voidMedication } = await import("./medications");
const { createPatient, getPatientFormValues, updatePatient } = await import("./patient-store");
const { voidGlucoseReading, voidLabRecord } = await import("./void-record");

const FORBIDDEN = new Error("NEXT_REDIRECT:/forbidden");

describe("canManageRecords", () => {
  it("อนุญาตแพทย์และผู้ดูแลระบบ", () => {
    expect(canManageRecords("DOCTOR")).toBe(true);
    expect(canManageRecords("ADMIN")).toBe(true);
  });
  it("ไม่อนุญาตพยาบาล/เจ้าหน้าที่", () => {
    expect(canManageRecords("STAFF")).toBe(false);
  });
});

describe("การแก้ไขข้อมูลที่จำกัดสิทธิ์", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockRejectedValue(FORBIDDEN);
  });

  const guarded: [string, () => Promise<unknown>][] = [
    ["เพิ่มผู้ป่วย", () => createPatient({})],
    ["แก้ไขผู้ป่วย", () => updatePatient({})],
    ["โหลดฟอร์มแก้ไขผู้ป่วย", () => getPatientFormValues("p1")],
    ["เพิ่มยา", () => saveMedication({})],
    ["บันทึกการหยุดยา", () => stopMedication({})],
    ["ยกเลิกยา", () => voidMedication({})],
    ["ยกเลิกค่าน้ำตาล", () => voidGlucoseReading({})],
    ["ยกเลิกผลตรวจ", () => voidLabRecord({})],
  ];

  it.each(guarded)("%s: ไม่มีสิทธิ์แล้วไม่แตะฐานข้อมูล", async (_name, run) => {
    await expect(run()).rejects.toBe(FORBIDDEN);
    expect(requireRole).toHaveBeenCalledWith(...RECORD_MANAGER_ROLES);
    expect(transaction).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
