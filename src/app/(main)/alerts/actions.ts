"use server";

import { revalidatePath } from "next/cache";
import { acknowledgeAlert } from "@/lib/data/alerts";

export async function acknowledgeAlertAction(raw: unknown) {
  const result = await acknowledgeAlert(raw);
  if (result.ok) revalidatePath("/alerts");
  return result;
}
