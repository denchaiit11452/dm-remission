import Link from "next/link";
import LabBandsPanel from "@/components/dashboard/LabBandsPanel";
import MetricsPanel from "@/components/dashboard/MetricsPanel";
import Panel, { PANEL_LINK } from "@/components/dashboard/Panel";
import RangeFilter from "@/components/dashboard/RangeFilter";
import RefreshButton from "@/components/dashboard/RefreshButton";
import RemissionStatusPanel from "@/components/dashboard/RemissionStatusPanel";
import RemissionTrendChart from "@/components/dashboard/RemissionTrendChart";
import RiskLevelsPanel from "@/components/dashboard/RiskLevelsPanel";
import SeverePatientsPanel from "@/components/dashboard/SeverePatientsPanel";
import SummaryStrip from "@/components/dashboard/SummaryStrip";
import ThresholdBanner from "@/components/patients/ThresholdBanner";
import { formatThaiTime } from "@/lib/alert-center";
import { canManageRecords } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { parseDashboardRange } from "@/lib/dashboard-range";
import { getDashboardData } from "@/lib/data/dashboard";
import { todayInBangkok } from "@/lib/date";
import { formatThaiDate } from "@/lib/format";

export const metadata = { title: "ภาพรวม | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SPLIT_ROW = "grid items-stretch gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_400px]";

// หน้าภาพรวม: ใช้ดูสถานะทั้งโปรแกรมอย่างเดียว การรับทราบแจ้งเตือนทำที่หน้าการแจ้งเตือน
export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(); // ทุกหน้าต้องเรียกเอง ไม่พึ่งการตรวจใน layout
  const today = todayInBangkok();
  const range = parseDashboardRange(await searchParams, today);
  const { stats, alertCount, missingThresholds, ruleSetMissing, loadedAt } = await getDashboardData(range, today);

  const rangeText = `${formatThaiDate(range.from)} ถึง ${formatThaiDate(range.to)}`;
  const granularityText = { day: "รายวัน", week: "รายสัปดาห์", month: "รายเดือน" }[stats.granularity];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ภาพรวม</h1>
          <p className="mt-1 text-sm text-slate-700">ผู้ป่วยทั้งหมด {stats.totalPatients} ราย</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-slate-600">อัปเดตล่าสุด {formatThaiTime(loadedAt)}</span>
          <RefreshButton />
        </div>
      </header>

      <ThresholdBanner
        missingThresholds={missingThresholds}
        ruleSetMissing={ruleSetMissing}
        canOpenSettings={user.role === "DOCTOR" || user.role === "ADMIN"}
      />

      {stats.totalPatients === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">
          <p className="font-semibold text-slate-900">ยังไม่มีผู้ป่วยในระบบ</p>
          <p className="mt-1 text-sm">เมื่อเพิ่มผู้ป่วยแล้ว กราฟและตัวเลขสรุปจะแสดงในหน้านี้</p>
          {canManageRecords(user.role) ? <Link href="/patients/new" className={`${PANEL_LINK} mt-2 text-sm`}>เพิ่มผู้ป่วย</Link> : null}
        </section>
      ) : (
        <>
          <RangeFilter range={range} today={today} earliestDate={stats.earliestDate} />
          <SummaryStrip stats={stats} alertCount={alertCount} />

          <div className={SPLIT_ROW}>
            <Panel title="แนวโน้มภาวะสงบ" subtitle={`จำนวนผู้ป่วย${granularityText} ${rangeText} คำนวณย้อนหลังด้วยเกณฑ์ปัจจุบัน`}>
              {stats.trend.length > 0 ? (
                <RemissionTrendChart points={stats.trend} />
              ) : (
                <p className="text-sm leading-relaxed text-slate-700">ยังไม่มีชุดเกณฑ์ที่ใช้งาน ระบบจึงยังไม่แสดงแนวโน้มนี้</p>
              )}
            </Panel>
            <RemissionStatusPanel remission={stats.remission} total={stats.totalPatients} />
          </div>

          <div className={SPLIT_ROW}>
            <RiskLevelsPanel risk={stats.risk} total={stats.totalPatients} />
            <LabBandsPanel bands={stats.bands} />
          </div>

          <div className={SPLIT_ROW}>
            <MetricsPanel metrics={stats.metrics} dates={stats.metricDates} comparisonLabel={stats.comparisonLabel} isCustomRange={range.preset === null} />
            <SeverePatientsPanel severe={stats.severe} critical={stats.risk.critical} high={stats.risk.high} thresholdsIncomplete={stats.risk.severeThresholdsIncomplete} />
          </div>
        </>
      )}
    </div>
  );
}
