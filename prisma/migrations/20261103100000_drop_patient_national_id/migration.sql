-- โรงพยาบาลยืนยันว่าระบบไม่เก็บเลขบัตรประชาชน
-- ถ้ามีเลขบัตรอยู่ในฐานข้อมูล ให้หยุดเพื่อให้ผู้ดูแลตรวจสอบก่อน ไม่ลบข้อมูลโดยไม่มีใครรู้
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "patients" WHERE "nationalId" IS NOT NULL) THEN
    RAISE EXCEPTION 'patients.nationalId still contains data: review it before applying this migration';
  END IF;
END $$;

-- DropIndex
DROP INDEX "patients_nationalId_key";

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "nationalId";
