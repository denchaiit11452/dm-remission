"use server";

// Server Actions ของหน้าตั้งค่า (การตรวจสิทธิ์และตรวจข้อมูลอยู่ในชั้น src/lib/data)
import { revalidatePath } from "next/cache";
import { saveRuleSet } from "@/lib/data/rule-sets";

export async function saveRuleSetAction(raw: unknown) {
  const result = await saveRuleSet(raw);
  if (result.ok) revalidatePath("/", "layout"); // เกณฑ์และระดับเปลี่ยนในทุกหน้า
  return result;
}
