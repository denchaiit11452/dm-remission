import { addDays, daysBetween, maxDateKey } from "../date";
import type { RiskRules } from "../risk/types";

export type Hba1cInput = {
  id: string;
  recordedDate: string;
  hba1c: number | null;
  isVoided: boolean;
};

/**
 * ช่วงเวลาที่ใช้ยา (ตรงกับ medication_periods)
 * endDate = "วันที่หยุดยา" คือวันแรกที่ไม่ได้ใช้ยาแล้ว (ว่าง = ยังใช้อยู่)
 * เช่น หยุดยาวันที่ 2026-01-01 -> ณ วันที่ 2026-04-01 หยุดยาได้ 90 วันพอดี
 */
export type MedicationPeriodInput = {
  startDate: string;
  endDate: string | null;
  isDiabetesDrug: boolean;
};

export type RemissionStatus = "REMISSION" | "NOT_IN_REMISSION" | "INSUFFICIENT_DATA";

export type RemissionAssessment = {
  status: RemissionStatus;
  latestHba1c: { value: number; date: string } | null;
  onDiabetesMedication: boolean;
  /** จำนวนวันที่หยุดยาเบาหวานแล้ว (null = ไม่มีประวัติการหยุดยาให้นับ) */
  medFreeDays: number | null;
  reasons: string[];
};

export type RemissionOptions = {
  /**
   * false (ค่าเริ่มต้น): ใช้ HbA1c ล่าสุดค่าเดียว ตรวจเมื่อไรก็ได้
   * true: HbA1c ต้องตรวจ "หลังหยุดยาครบ" แล้วเท่านั้น ถึงจะยืนยัน Remission
   * (รอแพทย์ตัดสินว่าใช้แบบไหน)
   */
  hba1cMustFollowMedFreePeriod?: boolean;
};

export type RemissionInput = {
  hba1cRecords: Hba1cInput[];
  medications: MedicationPeriodInput[];
  /** วันที่ประเมิน (วันนี้ตามเวลาไทย) */
  asOf: string;
  rules: Pick<RiskRules, "remissionHba1cMax" | "remissionMedFreeDays">;
};

/**
 * เกณฑ์ Remission: HbA1c <= remissionHba1cMax และไม่ใช้ยาเบาหวานอย่างน้อย remissionMedFreeDays วัน
 * ถ้าข้อมูลไม่พอจะยืนยัน คืน INSUFFICIENT_DATA แทนการเดา
 */
export function assessRemission(
  input: RemissionInput,
  options: RemissionOptions = {},
): RemissionAssessment {
  const { asOf, rules } = input;
  const reasons: string[] = [];

  // HbA1c ล่าสุด (ไม่นับรายการที่ยกเลิก/วันที่ในอนาคต) ถ้าวันเดียวกันหลายค่า ใช้ค่าสูงสุดเพื่อความระมัดระวัง
  const usable = input.hba1cRecords.filter(
    (r): r is Hba1cInput & { hba1c: number } =>
      !r.isVoided && r.hba1c !== null && r.recordedDate <= asOf,
  );
  const latestDate = maxDateKey(usable.map((r) => r.recordedDate));
  const latestHba1c =
    latestDate === null
      ? null
      : {
          value: Math.max(...usable.filter((r) => r.recordedDate === latestDate).map((r) => r.hba1c)),
          date: latestDate,
        };

  // สถานะการใช้ยาเบาหวาน
  const drugPeriods = input.medications.filter((m) => m.isDiabetesDrug && m.startDate <= asOf);
  const onDiabetesMedication = drugPeriods.some((m) => m.endDate === null || asOf < m.endDate);
  const lastStopDate = maxDateKey(
    drugPeriods.flatMap((m) => (m.endDate !== null && m.endDate <= asOf ? [m.endDate] : [])),
  );
  const medFreeDays =
    onDiabetesMedication || lastStopDate === null ? null : daysBetween(lastStopDate, asOf);

  const result = (status: RemissionStatus): RemissionAssessment => ({
    status,
    latestHba1c,
    onDiabetesMedication,
    medFreeDays,
    reasons,
  });

  if (onDiabetesMedication) {
    reasons.push("ยังใช้ยาเบาหวานอยู่");
    return result("NOT_IN_REMISSION");
  }
  if (latestHba1c === null) {
    reasons.push("ยังไม่มีผล HbA1c");
    return result("INSUFFICIENT_DATA");
  }
  if (latestHba1c.value > rules.remissionHba1cMax) {
    reasons.push(`HbA1c ${latestHba1c.value}% สูงกว่า ${rules.remissionHba1cMax}%`);
    return result("NOT_IN_REMISSION");
  }
  if (medFreeDays === null) {
    reasons.push("ไม่มีประวัติการหยุดยาเบาหวาน จึงยืนยันไม่ได้ว่าหยุดยาครบกำหนด");
    return result("INSUFFICIENT_DATA");
  }
  if (medFreeDays < rules.remissionMedFreeDays) {
    reasons.push(`หยุดยาได้ ${medFreeDays} วัน ยังไม่ครบ ${rules.remissionMedFreeDays} วัน`);
    return result("NOT_IN_REMISSION");
  }

  if (options.hba1cMustFollowMedFreePeriod && lastStopDate !== null) {
    const earliestValidDate = addDays(lastStopDate, rules.remissionMedFreeDays);
    if (latestHba1c.date < earliestValidDate) {
      reasons.push(`HbA1c ล่าสุดตรวจก่อนหยุดยาครบ ${rules.remissionMedFreeDays} วัน ต้องตรวจซ้ำตั้งแต่วันที่ ${earliestValidDate}`);
      return result("INSUFFICIENT_DATA");
    }
  }

  reasons.push(
    `HbA1c ${latestHba1c.value}% (ไม่เกิน ${rules.remissionHba1cMax}%) และหยุดยาเบาหวานแล้ว ${medFreeDays} วัน`,
  );
  return result("REMISSION");
}
