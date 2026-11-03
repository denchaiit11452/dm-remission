import { describe, expect, it } from "vitest";
import { assessRemission, type Hba1cInput, type MedicationPeriodInput } from "./remission";

const RULES = { remissionHba1cMax: 6.0, remissionMedFreeDays: 90, remissionHba1cMinDaysAfterStop: 7 };
const ASOF = "2026-10-15";

let n = 0;
const lab = (recordedDate: string, hba1c: number | null, isVoided = false): Hba1cInput => ({
  id: `lab-${++n}`,
  recordedDate,
  hba1c,
  isVoided,
});
const med = (
  startDate: string,
  endDate: string | null,
  isDiabetesDrug = true,
): MedicationPeriodInput => ({ startDate, endDate, isDiabetesDrug });

const run = (
  hba1cRecords: Hba1cInput[],
  medications: MedicationPeriodInput[],
  asOf = ASOF,
  neverMedicatedConfirmed = false,
) => assessRemission({ hba1cRecords, medications, asOf, rules: RULES, neverMedicatedConfirmed });

describe("assessRemission: เงื่อนไขหลัก (HbA1c < 6.0% และหยุดยา >= 90 วัน)", () => {
  it("ผ่านทั้งสองเงื่อนไข -> REMISSION", () => {
    const r = run([lab("2026-10-01", 5.8)], [med("2020-01-01", "2026-05-01")]);
    expect(r.status).toBe("REMISSION");
    expect(r.medFreeDays).toBe(167);
  });

  it("HbA1c เท่ากับ 6.0 ไม่ผ่าน (ต้องต่ำกว่าเกณฑ์)", () => {
    const r = run([lab("2026-10-01", 6.0)], [med("2020-01-01", "2026-05-01")]);
    expect(r.status).toBe("NOT_IN_REMISSION");
    expect(r.reasons[0]).toContain("6.0%");
  });

  it("HbA1c 5.9 ผ่าน", () => {
    expect(run([lab("2026-10-01", 5.9)], [med("2020-01-01", "2026-05-01")]).status).toBe("REMISSION");
  });

  it("หยุดยาครบ 90 วันพอดี ผ่าน", () => {
    // หยุดยา 2026-07-17 -> ณ 2026-10-15 ครบ 90 วัน
    const r = run([lab("2026-10-01", 5.8)], [med("2020-01-01", "2026-07-17")]);
    expect(r.medFreeDays).toBe(90);
    expect(r.status).toBe("REMISSION");
  });

  it("หยุดยาได้ 89 วัน ยังไม่ผ่าน", () => {
    const r = run([lab("2026-10-01", 5.8)], [med("2020-01-01", "2026-07-18")]);
    expect(r.medFreeDays).toBe(89);
    expect(r.status).toBe("NOT_IN_REMISSION");
  });

  it("ยังใช้ยาเบาหวานอยู่ -> ไม่ผ่านทันที แม้ HbA1c ดี", () => {
    const r = run([lab("2026-10-01", 5.5)], [med("2020-01-01", null)]);
    expect(r.status).toBe("NOT_IN_REMISSION");
    expect(r.onDiabetesMedication).toBe(true);
    expect(r.medFreeDays).toBeNull();
  });

  it("กลับมาใช้ยาใหม่หลังเคยหยุด -> ไม่ผ่าน", () => {
    const r = run(
      [lab("2026-10-01", 5.5)],
      [med("2020-01-01", "2026-01-01"), med("2026-08-01", null)],
    );
    expect(r.status).toBe("NOT_IN_REMISSION");
  });

  it("ยาที่ไม่ใช่ยาเบาหวานไม่นับ", () => {
    const r = run(
      [lab("2026-10-01", 5.8)],
      [med("2020-01-01", "2026-05-01"), med("2019-01-01", null, false)],
    );
    expect(r.status).toBe("REMISSION");
  });
});

describe("assessRemission: ข้อมูลไม่พอ", () => {
  it("ไม่มีผล HbA1c -> INSUFFICIENT_DATA", () => {
    expect(run([], [med("2020-01-01", "2026-05-01")]).status).toBe("INSUFFICIENT_DATA");
  });

  it("HbA1c ที่ยกเลิกแล้วไม่นับ", () => {
    expect(run([lab("2026-10-01", 5.8, true)], [med("2020-01-01", "2026-05-01")]).status).toBe("INSUFFICIENT_DATA");
  });

  it("ไม่มีประวัติยาให้นับวันที่หยุด -> INSUFFICIENT_DATA (ไม่เดา)", () => {
    expect(run([lab("2026-10-01", 5.8)], []).status).toBe("INSUFFICIENT_DATA");
  });

  it("HbA1c สูงเกินเกณฑ์ ตัดสินได้เลยแม้ไม่มีประวัติยา", () => {
    expect(run([lab("2026-10-01", 7.2)], []).status).toBe("NOT_IN_REMISSION");
  });
});

describe("assessRemission: การเลือก HbA1c", () => {
  it("ใช้ค่าล่าสุด: เคยดีแต่ล่าสุดสูง -> ไม่ผ่าน", () => {
    const r = run(
      [lab("2026-08-01", 5.8), lab("2026-10-01", 7.0)],
      [med("2020-01-01", "2026-01-01")],
    );
    expect(r.status).toBe("NOT_IN_REMISSION");
    expect(r.latestHba1c).toEqual({ value: 7.0, date: "2026-10-01" });
  });

  it("วันเดียวกันหลายค่า ใช้ค่าสูงสุดเพื่อความระมัดระวัง", () => {
    const r = run(
      [lab("2026-10-01", 5.8), lab("2026-10-01", 6.8)],
      [med("2020-01-01", "2026-01-01")],
    );
    expect(r.latestHba1c?.value).toBe(6.8);
    expect(r.status).toBe("NOT_IN_REMISSION");
  });

  it("ไม่นับผลที่ลงวันที่ในอนาคต", () => {
    const r = run([lab("2027-01-01", 5.0)], [med("2020-01-01", "2026-01-01")]);
    expect(r.latestHba1c).toBeNull();
  });
});

describe("assessRemission: ผล HbA1c ต้องตรวจหลังหยุดยาอย่างน้อย 7 วัน", () => {
  const meds = [med("2020-01-01", "2026-05-01")]; // หยุดยา 1 พ.ค. -> นับผลได้ตั้งแต่ 8 พ.ค.

  it("ตรวจก่อนหยุดยา -> ต้องตรวจซ้ำ แม้หยุดยาครบ 90 วันแล้ว", () => {
    const r = run([lab("2026-04-20", 5.8)], meds);
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.reasons[0]).toContain("2026-05-08");
  });

  it("ตรวจหลังหยุดยา 6 วัน -> ต้องตรวจซ้ำ", () => {
    expect(run([lab("2026-05-07", 5.8)], meds).status).toBe("INSUFFICIENT_DATA");
  });

  it("ตรวจหลังหยุดยา 7 วันพอดี -> ผ่าน", () => {
    expect(run([lab("2026-05-08", 5.8)], meds).status).toBe("REMISSION");
  });

  it("ตรวจครบ 7 วันแต่หยุดยายังไม่ครบ 90 วัน -> ไม่ผ่าน", () => {
    const r = run([lab("2026-10-10", 5.8)], [med("2020-01-01", "2026-10-01")]);
    expect(r.status).toBe("NOT_IN_REMISSION");
  });
});

describe("assessRemission: ผู้ป่วยที่ไม่เคยใช้ยา", () => {
  it("ไม่มีประวัติยาและแพทย์ยังไม่ยืนยัน -> ข้อมูลไม่พอ", () => {
    const r = run([lab("2026-10-01", 5.8)], []);
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.reasons[0]).toContain("รอแพทย์ยืนยัน");
  });

  it("แพทย์ยืนยันแล้วและ HbA1c ผ่าน -> REMISSION", () => {
    expect(run([lab("2026-10-01", 5.8)], [], ASOF, true).status).toBe("REMISSION");
  });

  it("แพทย์ยืนยันแล้วแต่ HbA1c ไม่ผ่านหรือยังไม่มีผล -> ไม่นับ", () => {
    expect(run([lab("2026-10-01", 6.0)], [], ASOF, true).status).toBe("NOT_IN_REMISSION");
    expect(run([], [], ASOF, true).status).toBe("INSUFFICIENT_DATA");
  });

  it("คำยืนยันใช้ไม่ได้เมื่อมีรายการยาเบาหวานในประวัติ", () => {
    expect(run([lab("2026-10-01", 5.8)], [med("2020-01-01", null)], ASOF, true).status).toBe("NOT_IN_REMISSION");
    const later = run([lab("2026-10-01", 5.8)], [med("2026-12-01", null)], ASOF, true);
    expect(later.status).toBe("INSUFFICIENT_DATA");
    expect(later.hasDiabetesDrugHistory).toBe(true);
  });

  it("ยาที่ไม่ใช่ยาเบาหวานไม่ทำให้คำยืนยันเสีย", () => {
    expect(run([lab("2026-10-01", 5.8)], [med("2020-01-01", null, false)], ASOF, true).status).toBe("REMISSION");
  });
});
