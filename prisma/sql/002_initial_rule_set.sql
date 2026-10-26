-- =============================================================================
-- 002_initial_rule_set.sql
-- สร้างเกณฑ์ความเสี่ยงชุดที่ 1 (ชุดเริ่มต้น) รันใน Supabase Dashboard > SQL Editor
-- ต้องมีผู้ใช้อย่างน้อย 1 คนในตาราง profiles ก่อน (ใช้ Admin คนแรกเป็นผู้สร้าง)
--
-- เกณฑ์น้ำตาลระดับ เฝ้าระวัง / ความเสี่ยงสูง / วิกฤต เป็นค่าว่าง (NULL) ตั้งใจให้แพทย์เป็นผู้กรอก
-- จนกว่าจะกรอกครบ ระบบยังไม่ควรใช้กับผู้ป่วยจริง (ดู src/lib/risk/rules.ts findMissingThresholds)
-- รันซ้ำได้ ไม่สร้างซ้ำ
-- =============================================================================
INSERT INTO public.risk_rule_sets (id, version, "isActive", "changeReason", "createdById")
SELECT gen_random_uuid(), 1, true, 'ชุดเริ่มต้น: เกณฑ์น้ำตาลของแพทย์ยังไม่ได้กำหนด', p.id
FROM public.profiles p
WHERE p."isActive"
ORDER BY (p.role = 'ADMIN') DESC, p."createdAt" ASC
LIMIT 1
ON CONFLICT (version) DO NOTHING;

-- ตรวจผล: ควรเห็น 1 แถว isActive = true และคอลัมน์ watchBelow ... criticalGlucoseAbove เป็น null
-- SELECT version, "isActive", "goodMin", "goodMax", "watchBelow", "criticalGlucoseAbove" FROM public.risk_rule_sets;
