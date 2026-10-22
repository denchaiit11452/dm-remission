import { describe, expect, it } from "vitest";
import { assessRemission, type Hba1cInput, type MedicationPeriodInput } from "./remission";

const RULES = { remissionHba1cMax: 6.5, remissionMedFreeDays: 90 };
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
  options = {},
) => assessRemission({ hba1cRecords, medications, asOf, rules: RULES }, options);

describe("assessRemission: เงื่อนไขหลัก (HbA1c <= 6.5% และหยุดยา >= 90 วัน)", () => {
  it("ผ่านทั้งสองเงื่อนไข -> REMISSION", () => {
    const r = run([lab("2026-10-01", 6.2)], [med("2020-01-01", "2026-05-01")]);
    expect(r.status).toBe("REMISSION");
    expect(r.medFreeDays).toBe(167);
  });

  it("HbA1c เท่ากับ 6.5 ผ่าน (<=)", () => {
    expect(run([lab("2026-10-01", 6.5)], [med("2020-01-01", "2026-05-01")]).status).toBe("REMISSION");
  });

  it("HbA1c 6.6 ไม่ผ่าน", () => {
    expect(run([lab("2026-10-01", 6.6)], [med("2020-01-01", "2026-05-01")]).status).toBe("NOT_IN_REMISSION");
  });

  it("หยุดยาครบ 90 วันพอดี ผ่าน", () => {
    // หยุดยา 2026-07-17 -> ณ 2026-10-15 ครบ 90 วัน
    const r = run([lab("2026-10-01", 6.0)], [med("2020-01-01", "2026-07-17")]);
    expect(r.medFreeDays).toBe(90);
    expect(r.status).toBe("REMISSION");
  });

  it("หยุดยาได้ 89 วัน ยังไม่ผ่าน", () => {
    const r = run([lab("2026-10-01", 6.0)], [med("2020-01-01", "2026-07-18")]);
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
      [lab("2026-10-01", 6.0)],
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
    expect(run([lab("2026-10-01", 6.0, true)], [med("2020-01-01", "2026-05-01")]).status).toBe("INSUFFICIENT_DATA");
  });

  it("ไม่มีประวัติยาให้นับวันที่หยุด -> INSUFFICIENT_DATA (ไม่เดา)", () => {
    expect(run([lab("2026-10-01", 6.0)], []).status).toBe("INSUFFICIENT_DATA");
  });

  it("HbA1c สูงเกินเกณฑ์ ตัดสินได้เลยแม้ไม่มีประวัติยา", () => {
    expect(run([lab("2026-10-01", 7.2)], []).status).toBe("NOT_IN_REMISSION");
  });
});

describe("assessRemission: การเลือก HbA1c", () => {
  it("ใช้ค่าล่าสุด: เคยดีแต่ล่าสุดสูง -> ไม่ผ่าน", () => {
    const r = run(
      [lab("2026-08-01", 6.0), lab("2026-10-01", 7.0)],
      [med("2020-01-01", "2026-01-01")],
    );
    expect(r.status).toBe("NOT_IN_REMISSION");
    expect(r.latestHba1c).toEqual({ value: 7.0, date: "2026-10-01" });
  });

  it("วันเดียวกันหลายค่า ใช้ค่าสูงสุดเพื่อความระมัดระวัง", () => {
    const r = run(
      [lab("2026-10-01", 6.0), lab("2026-10-01", 6.8)],
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

describe("assessRemission: ตัวเลือก HbA1c ต้องตรวจหลังหยุดยาครบ", () => {
  const meds = [med("2020-01-01", "2026-05-01")]; // หยุดยา 1 พ.ค. -> ครบ 90 วันวันที่ 30 ก.ค.

  it("ปิดตัวเลือก (ค่าเริ่มต้น): HbA1c ตรวจก่อนหยุดยาครบ ก็ยังผ่าน", () => {
    expect(run([lab("2026-06-01", 6.0)], meds).status).toBe("REMISSION");
  });

  it("เปิดตัวเลือก: HbA1c ตรวจก่อนหยุดยาครบ -> ต้องตรวจซ้ำ", () => {
    const r = run([lab("2026-06-01", 6.0)], meds, ASOF, { hba1cMustFollowMedFreePeriod: true });
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.reasons[0]).toContain("2026-07-30");
  });

  it("เปิดตัวเลือก: HbA1c ตรวจหลังหยุดยาครบ -> ผ่าน", () => {
    const r = run([lab("2026-08-15", 6.0)], meds, ASOF, { hba1cMustFollowMedFreePeriod: true });
    expect(r.status).toBe("REMISSION");
  });
});
