"use client";

// ตัวกรองรายชื่อผู้ป่วย: ค่าทั้งหมดเก็บใน URL (ส่งลิงก์ต่อหรือรีเฟรชแล้วยังอยู่)
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PROGRAM_STATUS_LABELS } from "@/lib/format";
import type { RiskRow } from "@/lib/dashboard-stats";
import { buildPatientQueryString, hasActiveFilters, type PatientQuery } from "@/lib/patient-query";
import type { ProgramStatus } from "@prisma/client";
import RiskScale from "./RiskScale";

const FIELD =
  "min-h-11 w-full appearance-none rounded-[10px] border border-slate-300 bg-white text-[15px] text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700";

const STATUS_OPTIONS = Object.keys(PROGRAM_STATUS_LABELS) as ProgramStatus[];

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 8 5 5 5-5" />
    </svg>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${FIELD} pl-3 pr-9`}>
        {children}
      </select>
      <Chevron />
    </label>
  );
}

export default function PatientFilters({ query, riskRows }: { query: PatientQuery; riskRows: RiskRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(query.q);
  const lastSent = useRef(query.q);

  // ค้นหา: รอผู้ใช้หยุดพิมพ์สักครู่ก่อนค่อยอัปเดต URL
  useEffect(() => {
    if (text.trim() === query.q) return;
    const t = setTimeout(() => apply({ q: text.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // กด Back/Forward แล้ว URL เปลี่ยนจากภายนอก: ซิงก์ช่องค้นหาตาม
  useEffect(() => {
    if (query.q !== lastSent.current) {
      lastSent.current = query.q;
      setText(query.q);
    }
  }, [query.q]);

  function apply(change: Partial<PatientQuery>) {
    const next = { ...query, ...change, page: 1 };
    lastSent.current = next.q;
    startTransition(() => router.replace(`${pathname}${buildPatientQueryString(next)}`, { scroll: false }));
  }

  return (
    <form
      role="search"
      aria-label="ค้นหาและกรองผู้ป่วย"
      aria-busy={isPending}
      data-pending={isPending ? "" : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: text.trim() });
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative block lg:col-span-1">
          <span className="sr-only">ค้นหา HN หรือชื่อ</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" />
            <path d="m17 17-3.5-3.5" />
          </svg>
          <input
            type="search"
            inputMode="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ค้นหา HN หรือชื่อ"
            maxLength={100}
            autoComplete="off"
            className={`${FIELD} pl-9 pr-3`}
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:contents">
          <SelectField label="สถานะ" value={query.status ?? ""} onChange={(v) => apply({ status: (v || null) as ProgramStatus | null })}>
            <option value="">สถานะ: ทั้งหมด</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {PROGRAM_STATUS_LABELS[s]}
              </option>
            ))}
          </SelectField>
          <SelectField label="ข้อมูลเก่า" value={query.staleOnly ? "1" : ""} onChange={(v) => apply({ staleOnly: v === "1" })}>
            <option value="">ข้อมูลเก่า: ทั้งหมด</option>
            <option value="1">เฉพาะข้อมูลเก่า</option>
          </SelectField>
        </div>
      </div>

      <RiskScale
        rows={riskRows}
        active={query.level}
        onSelect={(level) => apply({ level })}
        action={
          hasActiveFilters(query) ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                apply({ q: "", level: null, status: null, staleOnly: false });
              }}
              className="min-h-11 px-2 text-sm font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              ล้างตัวกรอง
            </button>
          ) : null
        }
      />

      <div aria-hidden="true" className="patient-progress h-0.5 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full w-1/4 rounded-full bg-teal-700" />
      </div>
      <p role="status" className="sr-only">{isPending ? "กำลังโหลด..." : ""}</p>
    </form>
  );
}
