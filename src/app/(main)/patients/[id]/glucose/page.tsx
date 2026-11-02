import Link from "next/link";
import { notFound } from "next/navigation";
import GlucoseForm from "@/components/glucose/GlucoseForm";
import ThresholdBanner from "@/components/patients/ThresholdBanner";
import { requireUser } from "@/lib/auth/session";
import { todayInBangkok } from "@/lib/date";
import { getPatientSummary } from "@/lib/data/patients";
import { NoActiveRuleSetError, getActiveRuleSet } from "@/lib/data/risk-service";
import { GENDER_LABELS } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { findMissingThresholds } from "@/lib/risk/rules";

export const metadata = { title: "บันทึกน้ำตาล DTX | DM Remission" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// ขั้น 5E: ฟอร์มบันทึกน้ำตาล DTX (ทุกบทบาทบันทึกได้ ตามตารางสิทธิ์)
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const raw = await searchParams;

  const summary = await getPatientSummary(id);
  if (!summary) notFound();

  const today = todayInBangkok();
  const wanted = Array.isArray(raw.date) ? raw.date[0] : raw.date;
  const initialDate = wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) && wanted <= today ? wanted : today;

  let active;
  try {
    active = await getActiveRuleSet(prisma);
  } catch (e) {
    if (!(e instanceof NoActiveRuleSetError)) throw e;
    return (
      <div className="space-y-4">
        <Link href={`/patients/${id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-teal-800 underline underline-offset-2">← กลับไปโปรไฟล์</Link>
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
          ยังไม่มีชุดเกณฑ์ความเสี่ยงที่ใช้งานอยู่ จึงบันทึกค่าน้ำตาลไม่ได้ กรุณาแจ้งผู้ดูแลระบบ
        </div>
      </div>
    );
  }

  const { patient, risk } = summary;
  const missing = findMissingThresholds(active.rules);
  const subtitle = [
    `HN ${patient.hn}`,
    patient.gender ? `เพศ${GENDER_LABELS[patient.gender]}` : null,
    patient.ageYears !== null ? `อายุ ${patient.ageYears} ปี` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <ThresholdBanner missingThresholds={missing} ruleSetMissing={false} canOpenSettings={user.role === "DOCTOR" || user.role === "ADMIN"} />
      <GlucoseForm
        patient={{ id: patient.id, hn: patient.hn, fullName: patient.fullName, subtitle }}
        currentLevel={risk.level}
        lastGlucoseDate={risk.glucoseDate}
        openAlertCount={summary.openAlertCount}
        rules={active.rules}
        ruleSummary={`ชุดที่ ${active.version} · ควบคุมได้ดี ${active.rules.goodMin}–${active.rules.goodMax} mg/dL`}
        recorder={{ name: user.fullName }}
        today={today}
        initialDate={initialDate}
      />
    </div>
  );
}
