// แบบจำลองของแถบติดตาม Remission ในแท็บภาพรวม (ฟังก์ชันล้วน ทดสอบได้)
// ไม่คำนวณสถานะ Remission เอง สถานะยังมาจาก assessRemission เท่านั้น ไฟล์นี้แค่จัดตัวเลขให้วาดได้
import { addDays, daysBetween } from "./date";
import type { RemissionAssessment } from "./remission/remission";
import type { RiskRules } from "./risk/types";

type Rules = Pick<RiskRules, "remissionHba1cMax" | "remissionMedFreeDays" | "remissionHba1cMinDaysAfterStop">;

/** เงื่อนไขเรื่องยา แยกกรณีให้ข้อความตรงกับสิ่งที่ระบบรู้จริง */
export type MedicationTrack =
  | { kind: "ON_DRUG" }
  | { kind: "NEVER_MEDICATED"; confirmed: boolean }
  | { kind: "NO_STOP_RECORD" }
  | {
      kind: "COUNTING";
      stopDate: string;
      days: number;
      required: number;
      /** 0 ถึง 1 ไม่เกิน 1 แม้หยุดยานานกว่ากำหนด */
      progress: number;
      /** วันที่จะหยุดยาครบกำหนด */
      completeOn: string;
      met: boolean;
    };

export type Hba1cTrack = {
  value: number;
  date: string;
  threshold: number;
  met: boolean;
  scale: { min: number; max: number };
};

/** ผล HbA1c ต้องตรวจหลังหยุดยาอย่างน้อย N วัน ใช้เฉพาะเมื่อมีวันหยุดยาและมีผล HbA1c */
export type TimingTrack = { earliestValidDate: string; minDays: number; met: boolean };

export type RemissionTrack = { medication: MedicationTrack; hba1c: Hba1cTrack | null; timing: TimingTrack | null };

/** ไม้บรรทัด HbA1c เริ่มที่ 4% ถึง 10% และขยายเมื่อค่าเกินช่วง เพื่อให้จุดอยู่บนไม้บรรทัดเสมอ */
export function hba1cScale(value: number, threshold: number): { min: number; max: number } {
  const low = Math.min(4, Math.floor(Math.min(value, threshold) - 0.5));
  const high = Math.max(10, Math.ceil(Math.max(value, threshold) + 0.5));
  return { min: low, max: high };
}

export function buildRemissionTrack(remission: RemissionAssessment, rules: Rules, today: string, neverMedicatedConfirmed: boolean): RemissionTrack {
  let medication: MedicationTrack;
  if (remission.onDiabetesMedication) medication = { kind: "ON_DRUG" };
  else if (remission.lastStopDate !== null) {
    const days = Math.max(0, daysBetween(remission.lastStopDate, today));
    const required = rules.remissionMedFreeDays;
    medication = {
      kind: "COUNTING",
      stopDate: remission.lastStopDate,
      days,
      required,
      progress: required <= 0 ? 1 : Math.min(1, days / required),
      completeOn: addDays(remission.lastStopDate, required),
      met: days >= required,
    };
  } else if (remission.hasDiabetesDrugHistory) medication = { kind: "NO_STOP_RECORD" };
  else medication = { kind: "NEVER_MEDICATED", confirmed: neverMedicatedConfirmed };

  const latest = remission.latestHba1c;
  const hba1c: Hba1cTrack | null = latest
    ? {
        value: latest.value,
        date: latest.date,
        threshold: rules.remissionHba1cMax,
        met: latest.value < rules.remissionHba1cMax,
        scale: hba1cScale(latest.value, rules.remissionHba1cMax),
      }
    : null;

  const timing: TimingTrack | null =
    medication.kind === "COUNTING" && latest
      ? (() => {
          const earliestValidDate = addDays(medication.stopDate, rules.remissionHba1cMinDaysAfterStop);
          return { earliestValidDate, minDays: rules.remissionHba1cMinDaysAfterStop, met: latest.date >= earliestValidDate };
        })()
      : null;

  return { medication, hba1c, timing };
}

/** ตำแหน่งบนไม้บรรทัดเป็นร้อยละ */
export function percentOn(value: number, scale: { min: number; max: number }): number {
  if (scale.max === scale.min) return 50;
  return Math.min(100, Math.max(0, ((value - scale.min) / (scale.max - scale.min)) * 100));
}

// ---------------------------------------------------------------- พิกัด
/** 13.756331 -> 13°45'22.8"N */
export function toDms(value: number, axis: "lat" | "lng"): string {
  const hemisphere = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = Math.floor((abs - degrees) * 60);
  let seconds = Math.round(((abs - degrees) * 60 - minutes) * 600) / 10;
  if (seconds >= 60) { seconds = 0; minutes += 1; }
  if (minutes >= 60) { minutes = 0; degrees += 1; }
  return `${degrees}°${String(minutes).padStart(2, "0")}'${seconds.toFixed(1).padStart(4, "0")}"${hemisphere}`;
}

/**
 * เส้นกริดพิกัดจริงรอบจุด ระยะห่างเส้น 0.001 องศา (ราว 110 เมตร) ครึ่งความกว้างกรอบ 0.0035 องศา
 * คืนเฉพาะเส้นที่อยู่ในกรอบ พร้อมตำแหน่งเป็นร้อยละของกรอบ
 */
export function graticule(center: number, halfSpan = 0.0035, step = 0.001): { value: number; percent: number }[] {
  const from = Math.ceil((center - halfSpan) / step);
  const to = Math.floor((center + halfSpan) / step);
  const lines: { value: number; percent: number }[] = [];
  for (let i = from; i <= to; i += 1) {
    const value = Number((i * step).toFixed(6));
    lines.push({ value, percent: ((value - (center - halfSpan)) / (halfSpan * 2)) * 100 });
  }
  return lines;
}

export function googleMapsDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
