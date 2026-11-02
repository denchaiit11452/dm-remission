import AlertCenter from "@/components/alerts/center/AlertCenter";
import { parseAlertQuery } from "@/lib/alert-center";
import { requireUser } from "@/lib/auth/session";
import { listAlertCenter } from "@/lib/data/alerts";
import { loadRules } from "@/lib/data/patients";
import { findMissingThresholds } from "@/lib/risk/rules";

export const metadata = { title: "การแจ้งเตือน | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Alert Center (ทุกบทบาทเปิดดูและรับทราบได้): แท็บ ใหม่ / รับทราบแล้ว / ยกเลิก
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const query = parseAlertQuery(await searchParams);
  const [data, rules] = await Promise.all([listAlertCenter(query), loadRules()]);
  const thresholdMissing = rules.ruleSetMissing || findMissingThresholds(rules.rules).length > 0;
  return <AlertCenter data={data} thresholdMissing={thresholdMissing} canOpenSettings={user.role === "DOCTOR" || user.role === "ADMIN"} />;
}
