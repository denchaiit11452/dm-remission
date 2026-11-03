import { describe, expect, it } from "vitest";
import { saveRuleSetSchema } from "./data/schemas";
import { DEFAULT_RISK_RULES, changedRuleFields } from "./risk/rules";
import { toRuleFormValues, toRuleSetPayload } from "./rule-set-form";

const values = (patch = {}) => ({ ...toRuleFormValues(DEFAULT_RISK_RULES), changeReason: "แพทย์ทบทวนเกณฑ์", ...patch });
const parse = (patch = {}) => saveRuleSetSchema.safeParse(toRuleSetPayload(3, values(patch)));

describe("ฟอร์มเกณฑ์", () => {
  it("แปลงเกณฑ์เป็นฟอร์มและกลับมาได้ค่าเดิม โดยช่องว่างเป็น null", () => {
    const r = parse();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.baseVersion).toBe(3);
      expect(r.data.remissionHba1cMax).toBe(6);
      expect(r.data.remissionHba1cMinDaysAfterStop).toBe(7);
      expect(r.data.watchAbove).toBeNull();
    }
  });
  it("ต้องระบุเหตุผล", () => {
    expect(parse({ changeReason: "  " }).success).toBe(false);
  });
  it("เกณฑ์น้ำตาลเว้นว่างได้ แต่เกณฑ์หลักเว้นว่างไม่ได้", () => {
    expect(parse({ criticalGlucoseAbove: "" }).success).toBe(true);
    expect(parse({ goodMin: "" }).success).toBe(false);
    expect(parse({ remissionHba1cMax: "" }).success).toBe(false);
  });
  it("ปฏิเสธข้อความและทศนิยมในช่องจำนวนเต็ม แต่ HbA1c มีทศนิยมได้", () => {
    expect(parse({ highAbove: "abc" }).success).toBe(false);
    expect(parse({ highAbove: "250.5" }).success).toBe(false);
    expect(parse({ remissionHba1cMax: "5.7" }).success).toBe(true);
  });
});

describe("changedRuleFields", () => {
  it("คืนเฉพาะเกณฑ์ที่เปลี่ยน", () => {
    expect(changedRuleFields(DEFAULT_RISK_RULES, DEFAULT_RISK_RULES)).toEqual([]);
    expect(changedRuleFields(DEFAULT_RISK_RULES, { ...DEFAULT_RISK_RULES, highAbove: 250, remissionHba1cMax: 5.7 }))
      .toEqual(expect.arrayContaining(["highAbove", "remissionHba1cMax"]));
  });
});
