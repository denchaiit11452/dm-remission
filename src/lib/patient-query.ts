// แปลงพารามิเตอร์ใน URL ของหน้ารายชื่อผู้ป่วย <-> ตัวกรองของ listPatients (ฟังก์ชันล้วน ทดสอบได้)
import type { ProgramStatus } from "@prisma/client";
import { RISK_LEVEL_ORDER } from "@/lib/risk/levels";
import type { RiskLevel } from "@/lib/risk/types";

export const PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

const STATUSES: readonly ProgramStatus[] = ["IN_PROGRAM", "REMISSION", "LOST_REMISSION", "DISCHARGED"];

export type PatientQuery = {
  q: string;
  level: RiskLevel | "NONE" | null;
  status: ProgramStatus | null;
  staleOnly: boolean;
  page: number;
  pageSize: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function positiveInt(v: string | undefined, fallback: number, max: number): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function parsePatientQuery(raw: RawParams): PatientQuery {
  const level = first(raw.level);
  const status = first(raw.status);
  return {
    q: (first(raw.q) ?? "").trim().slice(0, 100),
    level: level === "NONE" ? "NONE" : RISK_LEVEL_ORDER.find((l) => l === level) ?? null,
    status: STATUSES.find((s) => s === status) ?? null,
    staleOnly: first(raw.stale) === "1",
    page: positiveInt(first(raw.page), 1, 10_000),
    pageSize: positiveInt(first(raw.size), PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

/** สร้าง query string (ไม่ใส่ค่าเริ่มต้น เพื่อให้ลิงก์สั้นและอ่านง่าย) */
export function buildPatientQueryString(query: Partial<PatientQuery>): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.level) p.set("level", query.level);
  if (query.status) p.set("status", query.status);
  if (query.staleOnly) p.set("stale", "1");
  if (query.pageSize && query.pageSize !== PAGE_SIZE) p.set("size", String(query.pageSize));
  if (query.page && query.page > 1) p.set("page", String(query.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(query: PatientQuery): boolean {
  return query.q !== "" || query.level !== null || query.status !== null || query.staleOnly;
}
