import Link from "next/link";
import { PRIMARY_BUTTON } from "@/components/forms/fields";
import PatientCards from "@/components/patients/PatientCards";
import PatientFilters from "@/components/patients/PatientFilters";
import PatientListMotion from "@/components/patients/PatientListMotion";
import PatientTable from "@/components/patients/PatientTable";
import Pagination from "@/components/patients/Pagination";
import "@/components/patients/patient-list.css";
import ThresholdBanner from "@/components/patients/ThresholdBanner";
import { canManageRecords } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { listPatients } from "@/lib/data/patients";
import { hasActiveFilters, parsePatientQuery } from "@/lib/patient-query";

export const metadata = { title: "ผู้ป่วย | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// หน้ารายชื่อผู้ป่วย
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const query = parsePatientQuery(await searchParams);
  const result = await listPatients({
    q: query.q || undefined,
    level: query.level ?? undefined,
    status: query.status ?? undefined,
    staleOnly: query.staleOnly,
    page: query.page,
    pageSize: query.pageSize,
  });

  const filtered = hasActiveFilters(query);
  const canOpenSettings = user.role === "DOCTOR" || user.role === "ADMIN";

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ผู้ป่วย</h1>
          <p className="mt-1 text-sm text-slate-700">
            {filtered ? `พบ ${result.total} ราย` : `ผู้ป่วยทั้งหมด ${result.total} ราย`} เรียงจากเสี่ยงมากไปน้อย
          </p>
        </div>
        {canManageRecords(user.role) ? <Link href="/patients/new" className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>+ เพิ่มผู้ป่วย</Link> : null}
      </header>

      <ThresholdBanner
        missingThresholds={result.missingThresholds}
        ruleSetMissing={result.ruleSetMissing}
        canOpenSettings={canOpenSettings}
      />

      <PatientFilters query={query} riskRows={result.riskRows} />

      {result.rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">
          <p>{filtered ? "ไม่พบผู้ป่วยที่ตรงกับเงื่อนไข ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง" : "ยังไม่มีผู้ป่วยในระบบ"}</p>
          {filtered ? <Link href="/patients" scroll={false} className={`${PRIMARY_BUTTON} mt-4`}>ล้างตัวกรอง</Link> : null}
          {!filtered && canManageRecords(user.role) ? <Link href="/patients/new" className={`${PRIMARY_BUTTON} mt-4`}>+ เพิ่มผู้ป่วย</Link> : null}
        </div>
      ) : (
        <PatientListMotion>
          <PatientTable rows={result.rows} />
          <PatientCards rows={result.rows} />
        </PatientListMotion>
      )}

      {result.total > 0 ? (
        <Pagination query={query} page={result.page} pageSize={result.pageSize} total={result.total} />
      ) : null}
    </section>
  );
}
