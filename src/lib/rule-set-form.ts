// แปลงค่าเกณฑ์ระหว่างฟอร์มหน้าตั้งค่ากับข้อมูลส่งเข้า server (ฟังก์ชันล้วน ทดสอบได้)
import { parseOptionalNumber } from "./record-forms";
import type { RiskRules } from "./risk/types";

export type RuleFieldName = Exclude<keyof RiskRules, "alertOnHighRisk">;
export type RuleFormValues = Record<RuleFieldName, string> & { changeReason: string };

export type RuleField = { name: RuleFieldName; label: string; hint?: string; required?: boolean };
export type RuleFieldGroup = { title: string; description: string; fields: RuleField[] };

const BLANK_HINT = "เว้นว่าง = ยังไม่กำหนด ระบบจะข้ามระดับนี้";

export const RULE_FIELD_GROUPS: RuleFieldGroup[] = [
  {
    title: "ควบคุมได้ดี (mg/dL)",
    description: "ค่าน้ำตาลในช่วงนี้รวมค่าขอบ ถือว่าควบคุมได้ดี",
    fields: [
      { name: "goodMin", label: "ค่าต่ำสุด", required: true },
      { name: "goodMax", label: "ค่าสูงสุด", required: true },
    ],
  },
  {
    title: "ระดับน้ำตาลที่แพทย์กำหนด (mg/dL)",
    description: "ค่าน้ำตาลที่ต่ำกว่าหรือสูงกว่าค่าที่กำหนดจะเข้าสู่ระดับนั้น โดยไม่นับค่าที่เท่ากับเกณฑ์",
    fields: [
      { name: "watchBelow", label: "เฝ้าระวัง: ต่ำกว่า", hint: BLANK_HINT },
      { name: "watchAbove", label: "เฝ้าระวัง: สูงกว่า", hint: BLANK_HINT },
      { name: "highBelow", label: "ความเสี่ยงสูง: ต่ำกว่า", hint: BLANK_HINT },
      { name: "highAbove", label: "ความเสี่ยงสูง: สูงกว่า", hint: BLANK_HINT },
      { name: "criticalGlucoseBelow", label: "วิกฤต: ต่ำกว่า", hint: BLANK_HINT },
      { name: "criticalGlucoseAbove", label: "วิกฤต: สูงกว่า", hint: BLANK_HINT },
    ],
  },
  {
    title: "ความดันวิกฤต (mmHg)",
    description: "ตัวบนหรือตัวล่างถึงค่าที่กำหนดอย่างใดอย่างหนึ่ง ถือว่าวิกฤต",
    fields: [
      { name: "criticalSbp", label: "ตัวบนตั้งแต่", required: true },
      { name: "criticalDbp", label: "ตัวล่างตั้งแต่", required: true },
    ],
  },
  {
    title: "เกณฑ์ Remission",
    description: "ผู้ป่วยต้องผ่านทุกข้อ",
    fields: [
      { name: "remissionHba1cMax", label: "HbA1c ต่ำกว่า (%)", required: true, hint: "ค่าที่เท่ากับเกณฑ์ไม่ผ่าน" },
      { name: "remissionMedFreeDays", label: "หยุดยาเบาหวานอย่างน้อย (วัน)", required: true },
      { name: "remissionHba1cMinDaysAfterStop", label: "ตรวจ HbA1c หลังหยุดยาอย่างน้อย (วัน)", required: true },
    ],
  },
  {
    title: "ข้อมูลเก่า",
    description: "แสดงป้ายเตือนเมื่อค่าน้ำตาลล่าสุดเก่ากว่าจำนวนวันนี้",
    fields: [{ name: "staleDataDays", label: "เก่ากว่า (วัน)", required: true }],
  },
];

const RULE_FIELD_NAMES = RULE_FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.name));

export function toRuleFormValues(rules: RiskRules): RuleFormValues {
  const values = { changeReason: "" } as RuleFormValues;
  for (const name of RULE_FIELD_NAMES) {
    const value = rules[name];
    values[name] = value === null ? "" : String(value);
  }
  return values;
}

export function toRuleSetPayload(baseVersion: number, values: RuleFormValues) {
  const numbers = {} as Record<RuleFieldName, number | null>;
  for (const name of RULE_FIELD_NAMES) numbers[name] = parseOptionalNumber(values[name]);
  return { baseVersion, changeReason: values.changeReason, ...numbers };
}
