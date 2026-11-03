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
  /** มีรายการยาเบาหวานในประวัติหรือไม่ (ถ้ามี แพทย์ยืนยันว่า "ไม่เคยใช้ยา" ไม่ได้) */
  hasDiabetesDrugHistory: boolean;
  reasons: string[];
};

export type RemissionInput = {
  hba1cRecords: Hba1cInput[];
  medications: MedicationPeriodInput[];
  /** วันที่ประเมิน (วันนี้ตามเวลาไทย) */
  asOf: string;
  rules: Pick<RiskRules, "remissionHba1cMax" | "remissionMedFreeDays" | "remissionHba1cMinDaysAfterStop">;
  /** แพทย์ยืนยันว่าไม่เคยใช้ยาเบาหวาน มีผลเฉพาะเมื่อไม่มีรายการยาเบาหวานในประวัติ */
  neverMedicatedConfirmed?: boolean;
};

/** แสดงทศนิยมอย่างน้อย 1 ตำแหน่ง เพื่อไม่ให้ 6.0 แสดงเป็น 6 */
function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(1) : value}%`;
}

/**
 * เกณฑ์ Remission (โรงพยาบาลยืนยันแล้ว):
 * HbA1c ล่าสุดต่ำกว่า remissionHba1cMax และหยุดยาเบาหวานครบ remissionMedFreeDays วัน
 * โดยผล HbA1c ต้องตรวจหลังวันหยุดยาอย่างน้อย remissionHba1cMinDaysAfterStop วัน
 * ผู้ป่วยที่ไม่เคยใช้ยา: แพทย์ยืนยันรายคนแทนเงื่อนไขเรื่องยา แต่ยังต้องมี HbA1c ผ่านเกณฑ์
 * ถ้าข้อมูลไม่พอจะยืนยัน คืน INSUFFICIENT_DATA แทนการเดา
 */
export function assessRemission(input: RemissionInput): RemissionAssessment {
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
  const hasDiabetesDrugHistory = input.medications.some((m) => m.isDiabetesDrug);
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
    hasDiabetesDrugHistory,
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
  const threshold = formatPercent(rules.remissionHba1cMax);
  const hba1cText = formatPercent(latestHba1c.value);
  if (latestHba1c.value >= rules.remissionHba1cMax) {
    reasons.push(`HbA1c ${hba1cText} ไม่ต่ำกว่าเกณฑ์ ${threshold}`);
    return result("NOT_IN_REMISSION");
  }
  if (lastStopDate === null || medFreeDays === null) {
    if (!hasDiabetesDrugHistory && input.neverMedicatedConfirmed) {
      reasons.push(`HbA1c ${hba1cText} (ต่ำกว่า ${threshold}) และแพทย์ยืนยันว่าไม่เคยใช้ยาเบาหวาน`);
      return result("REMISSION");
    }
    reasons.push(
      hasDiabetesDrugHistory
        ? "ไม่มีประวัติการหยุดยาเบาหวาน จึงยืนยันไม่ได้ว่าหยุดยาครบกำหนด"
        : "ไม่มีประวัติการใช้ยาเบาหวาน รอแพทย์ยืนยันว่าผู้ป่วยไม่เคยใช้ยา",
    );
    return result("INSUFFICIENT_DATA");
  }
  if (medFreeDays < rules.remissionMedFreeDays) {
    reasons.push(`หยุดยาได้ ${medFreeDays} วัน ยังไม่ครบ ${rules.remissionMedFreeDays} วัน`);
    return result("NOT_IN_REMISSION");
  }

  const earliestValidDate = addDays(lastStopDate, rules.remissionHba1cMinDaysAfterStop);
  if (latestHba1c.date < earliestValidDate) {
    reasons.push(`HbA1c ล่าสุดตรวจก่อนหยุดยาครบ ${rules.remissionHba1cMinDaysAfterStop} วัน ต้องตรวจซ้ำตั้งแต่วันที่ ${earliestValidDate}`);
    return result("INSUFFICIENT_DATA");
  }

  reasons.push(`HbA1c ${hba1cText} (ต่ำกว่า ${threshold}) และหยุดยาเบาหวานแล้ว ${medFreeDays} วัน`);
  return result("REMISSION");
}
