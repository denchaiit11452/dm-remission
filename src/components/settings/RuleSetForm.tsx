"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveRuleSetAction } from "@/app/(main)/settings/actions";
import ActionDialog from "@/components/forms/ActionDialog";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, TEXT_LINK, TextAreaField, TextField } from "@/components/forms/fields";
import type { RecomputeSummary } from "@/lib/data/rule-sets";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import type { RiskRules } from "@/lib/risk/types";
import { RULE_FIELD_GROUPS, toRuleFormValues, toRuleSetPayload, type RuleFormValues } from "@/lib/rule-set-form";

type Props = { activeVersion: number; rules: RiskRules };
type Saved = { version: number; summary: RecomputeSummary };

function SaveOutcome({ saved, onEditAgain }: { saved: Saved; onEditAgain: () => void }) {
  const { assessedCount, overrideKeptCount, changes } = saved.summary;
  return (
    <section role="status" className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-5 text-green-950">
      <h2 className="text-base font-semibold">บันทึกเกณฑ์เวอร์ชัน {saved.version} และประเมินใหม่แล้ว</h2>
      <p className="text-sm leading-relaxed">
        ประเมินผู้ป่วย {assessedCount} ราย · ระดับเปลี่ยน {changes.length} ราย · คงระดับที่แพทย์ปรับไว้ {overrideKeptCount} ราย · ไม่สร้าง Alert ย้อนหลัง
      </p>
      <p className="text-sm leading-relaxed">ผล Remission คำนวณจากเกณฑ์ปัจจุบันทุกครั้งที่เปิดดูโปรไฟล์ผู้ป่วย</p>
      {changes.length > 0 ? (
        <ul className="divide-y divide-green-200 text-sm" aria-label="ผู้ป่วยที่ระดับเปลี่ยน">
          {changes.map((c) => (
            <li key={c.patientId} className="flex flex-wrap items-center justify-between gap-x-4 py-1">
              <Link href={`/patients/${c.patientId}`} className={TEXT_LINK}>HN {c.hn} {c.fullName}</Link>
              <span>{c.before ? RISK_LEVEL_LABELS[c.before] : "ยังไม่เคยประเมิน"} → <strong>{RISK_LEVEL_LABELS[c.after]}</strong></span>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" onClick={onEditAgain} className={SECONDARY_BUTTON}>แก้ไขเกณฑ์อีกครั้ง</button>
    </section>
  );
}

/** ฟอร์มเกณฑ์: บันทึกเป็นเวอร์ชันใหม่เสมอ ต้องระบุเหตุผล และยืนยันก่อนบันทึกเพราะมีผลกับผู้ป่วยทุกคน */
export default function RuleSetForm({ activeVersion, rules }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<RuleFormValues>(() => toRuleFormValues(rules));
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Saved | null>(null);

  const set = (name: keyof RuleFormValues, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setFieldErrors({});
    setError(null);
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveRuleSetAction(toRuleSetPayload(activeVersion, values));
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSaved({ version: result.version, summary: result.summary });
      setValues((v) => ({ ...v, changeReason: "" }));
      router.refresh();
    } catch {
      setError("บันทึกเกณฑ์ไม่สำเร็จ เกณฑ์เดิมยังใช้งานอยู่ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  if (saved) return <SaveOutcome saved={saved} onEditAgain={() => setSaved(null)} />;

  return (
    <form onSubmit={(e) => { e.preventDefault(); setConfirming(true); }} noValidate className="space-y-4">
      {RULE_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <legend className="px-1 text-base font-semibold text-slate-900">{group.title}</legend>
          <p className="mb-3 text-sm text-slate-700">{group.description}</p>
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.fields.map((f) => (
              <TextField
                key={f.name} name={f.name} label={f.label} hint={f.hint} required={f.required} inputMode="decimal"
                value={values[f.name]} error={fieldErrors[f.name]} disabled={saving}
                onChange={(e) => set(f.name, e.target.value)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <TextAreaField
          name="changeReason" label="เหตุผลที่เปลี่ยนเกณฑ์" required maxLength={500} value={values.changeReason}
          error={fieldErrors.changeReason} disabled={saving} onChange={(e) => set("changeReason", e.target.value)}
        />
      </section>

      {/* กล่องยืนยันปิดเมื่อบันทึกไม่ผ่าน จึงต้องแสดงข้อความในหน้าฟอร์ม */}
      <FormError message={error} />

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>บันทึกเป็นเวอร์ชันใหม่</button>
      </div>

      <ActionDialog open={confirming} title="บันทึกเกณฑ์เวอร์ชันใหม่?" busy={saving} onClose={() => setConfirming(false)}>
        <p className="text-sm leading-relaxed text-slate-700">
          เกณฑ์ใหม่จะมีผลกับผู้ป่วยทุกคนทันที ระบบจะประเมินระดับความเสี่ยงทุกคนใหม่ คงระดับที่แพทย์ปรับไว้ และไม่สร้าง Alert ย้อนหลัง เกณฑ์เดิมยังเก็บไว้ในประวัติ
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={saving} onClick={() => setConfirming(false)} className={SECONDARY_BUTTON}>กลับไปแก้ไข</button>
          <button type="button" disabled={saving} aria-busy={saving} onClick={() => void save()} className={PRIMARY_BUTTON}>
            {saving ? "กำลังประเมินใหม่..." : "ยืนยันและประเมินใหม่"}
          </button>
        </div>
      </ActionDialog>
    </form>
  );
}
