import RuleSetForm from "@/components/settings/RuleSetForm";
import { formatThaiDateTime } from "@/lib/alert-center";
import { RULE_MANAGER_ROLES } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { getRuleSettings } from "@/lib/data/rule-sets";
import { findMissingThresholds } from "@/lib/risk/rules";

export const metadata = { title: "ตั้งค่า | DM Remission" };

// หน้าตั้งค่าเกณฑ์ เฉพาะแพทย์และผู้ดูแลระบบ (การจัดการผู้ใช้ยังไม่เปิดใช้งาน)
export default async function Page() {
  await requireRole(...RULE_MANAGER_ROLES);
  const { activeVersion, rules, versions } = await getRuleSettings();
  const missing = findMissingThresholds(rules).length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">ตั้งค่าเกณฑ์</h1>
        <p className="mt-1 text-sm text-slate-700">
          {activeVersion > 0 ? `เวอร์ชันที่ใช้งาน: ${activeVersion}` : "ยังไม่มีชุดเกณฑ์ที่ใช้งาน ค่าด้านล่างคือค่าเริ่มต้นของระบบ"}
        </p>
      </header>

      {missing > 0 ? (
        <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          ยังไม่ได้กำหนดเกณฑ์น้ำตาล {missing} ค่า ไม่ควรใช้ระดับความเสี่ยงกับผู้ป่วยจริงจนกว่าแพทย์จะกำหนดครบ
        </div>
      ) : null}

      <RuleSetForm key={activeVersion === 0 ? "none" : "active"} activeVersion={activeVersion} rules={rules} />

      {versions.length > 0 ? (
        <section aria-labelledby="rule-history" className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <h2 id="rule-history" className="text-base font-semibold text-slate-900">ประวัติเกณฑ์</h2>
          <ul className="mt-2 divide-y divide-slate-200 text-sm">
            {versions.map((v) => (
              <li key={v.version} className="py-2">
                <p className="font-medium text-slate-900">เวอร์ชัน {v.version}{v.isActive ? " (ใช้งานอยู่)" : ""}</p>
                <p className="text-slate-700">{v.createdByName} · {formatThaiDateTime(v.createdAt)}</p>
                {v.changeReason ? <p className="text-slate-800">{v.changeReason}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
