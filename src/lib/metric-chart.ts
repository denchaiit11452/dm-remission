// ตัวช่วยของกราฟตัวชี้วัดเฉลี่ย (ฟังก์ชันล้วน ทดสอบได้ ไม่มีเกณฑ์ทางคลินิกในไฟล์นี้)
import type { MetricRow } from "@/lib/dashboard-stats";

export type MetricScale = { min: number; max: number; ticks: number[] };

const TARGET_INTERVALS = 3;

/** ขนาดช่องแกนตั้งเป็นเลขกลม 1, 2, 2.5, 5 คูณสิบยกกำลัง */
function niceStep(span: number): number {
  const raw = span / TARGET_INTERVALS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((step) => step >= raw) ?? 10 * magnitude;
}

/**
 * แกนตั้งของแต่ละตัวชี้วัด ไม่เริ่มจากศูนย์เพื่อให้เห็นการเปลี่ยนแปลงของค่าเฉลี่ย จึงต้องแสดงเลขแกนกำกับเสมอ
 * รวมเส้นอ้างอิงในช่วงแกนด้วย เพื่อให้เห็นระยะห่างจริงจากเส้น
 * ค่าที่แทบไม่เปลี่ยนจะได้ช่วงแกนขั้นต่ำ เส้นจึงไม่ดูผันผวนเกินจริง
 */
export function metricScale(values: number[], decimals: number, reference?: number): MetricScale {
  const all = reference === undefined ? values : [...values, reference];
  if (all.length === 0) return { min: 0, max: 1, ticks: [0, 1] };

  const low = Math.min(...all);
  const high = Math.max(...all);
  const minSpan = 4 * 10 ** -decimals;
  const center = (low + high) / 2;
  const paddedLow = high - low < minSpan ? center - minSpan / 2 : low;
  const paddedHigh = high - low < minSpan ? center + minSpan / 2 : high;

  const step = niceStep(paddedHigh - paddedLow);
  const clean = (value: number) => Number(value.toFixed(6));
  const min = clean(Math.floor(paddedLow / step + 1e-9) * step);
  const max = clean(Math.ceil(paddedHigh / step - 1e-9) * step);
  const count = Math.round((max - min) / step);
  return { min, max, ticks: Array.from({ length: count + 1 }, (_, i) => clean(min + i * step)) };
}

/** ค่า ณ จุดที่เลือก แยกตัวเลขกับหน่วยเพื่อจัดขนาดตัวอักษร ความดันต้องมีครบทั้งตัวบนและตัวล่าง */
export function metricValueAt(metric: MetricRow, index: number): { value: string; unit: string } | null {
  const primary = metric.points[index] ?? null;
  if (primary === null) return null;
  if (metric.secondaryPoints === undefined) return { value: primary.toFixed(metric.decimals), unit: metric.unit };
  const secondary = metric.secondaryPoints[index] ?? null;
  if (secondary === null) return null;
  return { value: `${primary.toFixed(metric.decimals)}/${secondary.toFixed(metric.decimals)}`, unit: metric.unit };
}

/** ทิศของการเปลี่ยนแปลงจากข้อความ เช่น "-0.5" ความดันมีสองค่าจึงไม่สรุปทิศ */
export function changeDirection(change: string): "up" | "down" | null {
  if (change.includes("/")) return null;
  if (change.startsWith("+")) return "up";
  if (change.startsWith("-") && change !== "-") return "down";
  return null;
}
