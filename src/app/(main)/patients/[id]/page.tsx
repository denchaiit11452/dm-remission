import { notFound } from "next/navigation";
import BackToListLink from "@/components/patients/BackToListLink";
import DailyHistory from "@/components/patients/profile/DailyHistory";
import LabHistory from "@/components/patients/profile/LabHistory";
import LocationTab from "@/components/patients/profile/LocationTab";
import MedicationList from "@/components/patients/profile/MedicationList";
import OverviewTab from "@/components/patients/profile/OverviewTab";
import ProfileHeader from "@/components/patients/profile/ProfileHeader";
import ProfileTabs, { PROFILE_TABS, parseTab } from "@/components/patients/profile/ProfileTabs";
import TrendTab, { DEFAULT_TREND_DAYS, TREND_RANGES } from "@/components/patients/profile/TrendTab";
import { canConfirmNoDrug, canEditLocation, canManageRecords, canViewLocation } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDailyHistory } from "@/lib/data/history";
import { listLabRecords } from "@/lib/data/labs";
import { viewPatientLocation } from "@/lib/data/locations";
import { listMedications } from "@/lib/data/medications";
import { getPatientSummary, loadRules } from "@/lib/data/patients";
import { buildLabSeries } from "@/lib/lab-summary";
import { buildRemissionTrack } from "@/lib/patient-overview";

export const metadata = { title: "โปรไฟล์ผู้ป่วย | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const OVERVIEW_GLUCOSE_DAYS = 14;

/** ช่วงวันของกราฟน้ำตาลรับเฉพาะค่าที่มีปุ่มให้เลือก */
function trendDays(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (TREND_RANGES as readonly number[]).includes(n) ? n : DEFAULT_TREND_DAYS;
}

// หน้าโปรไฟล์ผู้ป่วย: หัวโปรไฟล์ + แท็บ ภาพรวม, กราฟแนวโน้ม, ประวัติรายวัน, ผลตรวจ, ยา และพิกัด
// แท็บ "ความเสี่ยงและ Alert" ยังไม่เปิดใช้งาน และยังไม่มีปุ่ม "ปรับระดับความเสี่ยง"
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireUser();
  const canManage = canManageRecords(user.role);
  const { id } = await params;
  const raw = await searchParams;
  const tab = parseTab(raw.tab);

  const summary = await getPatientSummary(id);
  if (!summary) notFound();

  const needsLabs = tab === "labs" || tab === "overview" || tab === "trend";
  const days = trendDays(raw.days);

  const data = tab === "history" ? await getDailyHistory(id, raw) : null;
  const overviewHistory = tab === "overview" ? await getDailyHistory(id, { days: String(OVERVIEW_GLUCOSE_DAYS) }) : null;
  const trendHistory = tab === "trend" ? await getDailyHistory(id, { days: String(days) }) : null;
  const labs = needsLabs ? await listLabRecords(id) : null;
  const labRules = labs ? await loadRules() : null;
  const medications = tab === "medications" ? await listMedications(id) : null;
  const locationAllowed = canViewLocation(user.role);
  const location = tab === "location" && locationAllowed ? await viewPatientLocation(id) : null;
  const tabLabel = PROFILE_TABS.find((t) => t.key === tab)?.label ?? "";

  const content = (() => {
    if (tab === "overview" && overviewHistory && labs && labRules) {
      return (
        <OverviewTab
          patientId={id}
          track={buildRemissionTrack(summary.remission, labRules.rules, summary.today, summary.noDrugConfirmation !== null)}
          remissionStatus={summary.remission.status}
          rules={labRules.rules}
          ruleSetMissing={labRules.ruleSetMissing}
          series={buildLabSeries(labs, labRules.rules)}
          history={overviewHistory.history}
          today={summary.today}
        />
      );
    }
    if (tab === "trend" && trendHistory && labs && labRules) {
      return (
        <TrendTab
          patientId={id}
          history={trendHistory.history}
          days={days}
          series={buildLabSeries(labs, labRules.rules)}
          rules={labRules.rules}
          ruleSetMissing={labRules.ruleSetMissing}
        />
      );
    }
    if (tab === "location") return <LocationTab patientId={id} allowed={locationAllowed} canEdit={canEditLocation(user.role)} location={location} />;
    if (data) {
      return (
        <DailyHistory
          patientId={id}
          history={data.history}
          range={data.range}
          goodMin={data.rules.goodMin}
          goodMax={data.rules.goodMax}
          canManage={canManage}
        />
      );
    }
    if (tab === "labs" && labs && labRules) {
      return <LabHistory patientId={id} rows={labs} canManage={canManage} rules={labRules.rules} ruleSetMissing={labRules.ruleSetMissing} today={summary.today} />;
    }
    if (medications) return <MedicationList patientId={id} rows={medications} today={summary.today} canManage={canManage} />;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">
        แท็บ &quot;{tabLabel}&quot; ยังไม่เปิดใช้งาน
      </div>
    );
  })();

  return (
    <div className="space-y-4">
      <BackToListLink />

      <ProfileHeader summary={summary} canManage={canManage} canConfirmNoDrug={canConfirmNoDrug(user.role)} />

      <ProfileTabs patientId={id} active={tab} openAlertCount={summary.openAlertCount} />

      <section aria-label={tabLabel}>{content}</section>
    </div>
  );
}
