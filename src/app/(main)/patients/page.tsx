import PatientCards from "@/components/patients/PatientCards";
import PatientFilters from "@/components/patients/PatientFilters";
import PatientTable from "@/components/patients/PatientTable";
import Pagination from "@/components/patients/Pagination";
import ThresholdBanner from "@/components/patients/ThresholdBanner";
import { requireUser } from "@/lib/auth/session";
import { listPatients } from "@/lib/data/patients";
import { hasActiveFilters, parsePatientQuery } from "@/lib/patient-query";

export const metadata = { title: "ผู้ป่วย | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// หน้ารายชื่อผู้ป่วย (ขั้น 5C)
// หมายเหตุ: ยังไม่มีปุ่ม "+ เพิ่มผู้ป่วย" โดยตั้งใจ เพราะฟอร์มเพิ่มผู้ป่วยอยู่ขั้น 5F (เพิ่มเมื่อฟอร์มพร้อม ทั้ง Desktop และ Mobile)
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
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">ผู้ป่วย</h1>
        <p className="mt-1 text-sm text-slate-700">
          {filtered ? `พบ ${result.total} ราย` : `ผู้ป่วยทั้งหมด ${result.total} ราย`}
          <span className="md:hidden"> · เรียงตามระดับความเสี่ยง</span>
        </p>
      </header>

      <ThresholdBanner
        missingThresholds={result.missingThresholds}
        ruleSetMissing={result.ruleSetMissing}
        canOpenSettings={canOpenSettings}
      />

      <PatientFilters query={query} />

      {result.rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-700">
          {filtered ? "ไม่พบผู้ป่วยที่ตรงกับเงื่อนไข ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง" : "ยังไม่มีผู้ป่วยในระบบ"}
        </div>
      ) : (
        <>
          <PatientTable rows={result.rows} />
          <PatientCards rows={result.rows} />
        </>
      )}

      {result.total > 0 ? (
        <Pagination query={query} page={result.page} pageSize={result.pageSize} total={result.total} />
      ) : null}
    </section>
  );
}
