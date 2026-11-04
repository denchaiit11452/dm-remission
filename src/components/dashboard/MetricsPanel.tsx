import type { MetricDate, MetricRow } from "@/lib/dashboard-stats";
import MetricCharts from "./MetricCharts";
import Panel from "./Panel";

export default function MetricsPanel({ metrics, dates, comparisonLabel, isCustomRange }: { metrics: MetricRow[]; dates: MetricDate[]; comparisonLabel: string; isCustomRange: boolean }) {
  return (
    <Panel title="ตัวชี้วัดเฉลี่ยทั้งโปรแกรม" subtitle={`เฉลี่ยจากค่าล่าสุดของผู้ป่วยแต่ละคน ${comparisonLabel} จำนวนผู้ป่วย ณ สองจุดอาจไม่เท่ากัน ชี้หรือแตะกราฟเพื่อดูทุกตัวชี้วัดในวันเดียวกัน`}>
      <MetricCharts metrics={metrics} dates={dates} comparisonLabel={comparisonLabel} latestCaption={isCustomRange ? "ณ วันสิ้นสุดช่วง" : "ล่าสุด"} />
    </Panel>
  );
}
