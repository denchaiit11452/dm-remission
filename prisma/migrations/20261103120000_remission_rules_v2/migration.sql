-- เกณฑ์ Remission ที่โรงพยาบาลยืนยัน: HbA1c ต่ำกว่า 6.0, หยุดยาครบ 90 วัน, ผล HbA1c ตรวจหลังหยุดยาอย่างน้อย 7 วัน
-- และแพทย์ยืนยันรายคนได้เมื่อผู้ป่วยไม่เคยใช้ยาเบาหวาน

-- AlterTable
ALTER TABLE "risk_rule_sets" ADD COLUMN "remissionHba1cMinDaysAfterStop" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "risk_rule_sets" ALTER COLUMN "remissionHba1cMax" SET DEFAULT 6.0;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN "noDrugConfirmedAt" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN "noDrugConfirmedById" UUID;
ALTER TABLE "patients" ADD COLUMN "noDrugConfirmReason" TEXT;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_noDrugConfirmedById_fkey" FOREIGN KEY ("noDrugConfirmedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ห้ามแก้ชุดเกณฑ์เดิม: สร้างเวอร์ชันใหม่จากชุดที่ใช้งานอยู่ (ฐานข้อมูลใหม่ที่ยังไม่มีชุดเกณฑ์จะข้ามขั้นนี้)
-- ระดับความเสี่ยงไม่ได้ใช้เกณฑ์ Remission จึงไม่ต้องประเมินความเสี่ยงใหม่ ส่วน Remission คำนวณสดตอนอ่าน
CREATE TEMP TABLE "_active_rule_set" ON COMMIT DROP AS
  SELECT * FROM "risk_rule_sets" WHERE "isActive" ORDER BY "version" DESC LIMIT 1;

UPDATE "risk_rule_sets" SET "isActive" = false WHERE "isActive";

INSERT INTO "risk_rule_sets" (
  "id", "version", "isActive", "goodMin", "goodMax", "watchBelow", "watchAbove", "highBelow", "highAbove",
  "criticalGlucoseBelow", "criticalGlucoseAbove", "criticalSbp", "criticalDbp",
  "remissionHba1cMax", "remissionMedFreeDays", "remissionHba1cMinDaysAfterStop",
  "staleDataDays", "alertOnHighRisk", "changeReason", "createdById"
)
SELECT
  gen_random_uuid(), (SELECT MAX("version") + 1 FROM "risk_rule_sets"), true, "goodMin", "goodMax", "watchBelow", "watchAbove", "highBelow", "highAbove",
  "criticalGlucoseBelow", "criticalGlucoseAbove", "criticalSbp", "criticalDbp",
  6.0, 90, 7,
  "staleDataDays", "alertOnHighRisk", 'โรงพยาบาลยืนยันเกณฑ์ Remission: HbA1c ต่ำกว่า 6.0, หยุดยาครบ 90 วัน, ตรวจ HbA1c หลังหยุดยาอย่างน้อย 7 วัน', "createdById"
FROM "_active_rule_set";
