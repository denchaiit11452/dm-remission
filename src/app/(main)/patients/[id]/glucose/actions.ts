"use server";

// Server Actions ของฟอร์มบันทึกน้ำตาล: ตัวอย่างก่อนบันทึก (อ่านอย่างเดียว) และบันทึกจริง
import { revalidatePath } from "next/cache";
import { previewGlucose, type PreviewResult } from "@/lib/data/glucose-preview";
import { saveGlucoseReadings } from "@/lib/data/glucose";

export async function previewGlucoseAction(raw: unknown): Promise<PreviewResult> {
  return previewGlucose(raw);
}

export async function saveGlucoseAction(raw: unknown) {
  const result = await saveGlucoseReadings(raw);
  if (result.ok) {
    const id = (raw as { patientId?: unknown } | null)?.patientId;
    revalidatePath("/patients");
    revalidatePath("/alerts");
    if (typeof id === "string") revalidatePath(`/patients/${id}`);
  }
  return result;
}
