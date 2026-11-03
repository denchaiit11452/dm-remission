"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { saveLabAction } from "@/app/(main)/patients/actions";
import ActionDialog from "@/components/forms/ActionDialog";
import { useSaveToast } from "@/components/forms/SaveToast";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, TextField } from "@/components/forms/fields";
import LabChangeText from "@/components/records/LabChangeText";
import type { SaveLabData } from "@/lib/data/labs";
import { formatThaiDate } from "@/lib/format";
import { compareLabEntries, latestUpTo, withUnit, type LabComparison, type LabPoint, type LabSeries } from "@/lib/lab-summary";
import { parseOptionalNumber, toLabPayload, type LabFormValues } from "@/lib/record-forms";
import { assessBloodPressure } from "@/lib/risk/blood-pressure";
import { RISK_LEVEL_LABELS } from "@/lib/risk/levels";
import type { RiskRules } from "@/lib/risk/types";

type Props = {
  patient: { id: string; hn: string; fullName: string };
  rules: RiskRules;
  today: string;
  series: LabSeries;
};

/** ค่าที่บันทึกแล้ว เก็บผลเทียบไว้ก่อน router.refresh เพราะประวัติใหม่จะรวมค่าที่เพิ่งบันทึก */
type Saved = { data: SaveLabData; comparisons: LabComparison[] };

/** วันที่ไม่ตัดกลางบรรทัด (ช่องคำใบ้รับเฉพาะข้อความ จึงใช้ช่องว่างแบบไม่ตัดคำ) */
function unbrokenDate(date: string): string {
  return formatThaiDate(date).replaceAll(" ", "\u00a0");
}

function previousHint(point: LabPoint | null, unit: string): string {
  return point ? `ครั้งก่อน ${withUnit(point.value, unit)} (${unbrokenDate(point.date)})` : "ยังไม่มีผลครั้งก่อน";
}

/** แถวของฟอร์ม: หัวข้ออยู่ซ้าย ช่องกรอกอยู่ขวา (มือถือเรียงบนลงล่าง) */
function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-slate-200 p-4 first:border-t-0 md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-5 md:p-5">
      <h2 className="text-[15px] font-semibold text-slate-900 md:pt-1">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ComparisonRows({ items }: { items: LabComparison[] }) {
  return (
    <ul className="divide-y divide-slate-200">
      {items.map((item) => (
        <li key={item.key} className="py-2.5 transition-[opacity,translate] duration-200 ease-out first:pt-0 last:pb-0 starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-slate-700">{item.label}</span>
            {item.valueText === null ? (
              <span className="text-sm font-medium text-slate-900">{item.pending ?? "ตรวจค่าอีกครั้ง"}</span>
            ) : (
              <span className={`text-[17px] font-semibold tabular-nums ${item.critical ? "text-[#991b1b]" : "text-slate-900"}`}>{item.valueText}</span>
            )}
          </div>
          {item.critical ? <p className="mt-0.5 text-right text-[13px] font-semibold text-[#991b1b]">ถึงเกณฑ์วิกฤต</p> : null}
          {item.valueText !== null ? (
            <div className="mt-0.5 flex flex-wrap justify-end gap-x-3 text-[13px] text-slate-700">
              {item.previous ? (
                <>
                  {item.changes.map((c) => <LabChangeText key={c.label ?? "value"} change={c} />)}
                  <span>จาก {item.previous.text} · {formatThaiDate(item.previous.date)}</span>
                </>
              ) : (
                <span>ไม่มีผลก่อนหน้า</span>
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function LabForm({ patient, rules, today, series }: Props) {
  const router = useRouter();
  const showSaved = useSaveToast();
  const initialValues: LabFormValues = { recordedDate: today, hba1c: "", fbs: "", weightKg: "", heightCm: "", sbp: "", dbp: "", note: "" };
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Saved | null>(null);

  const comparisons = useMemo(() => compareLabEntries(values, series, rules), [values, series, rules]);
  const bmi = comparisons.find((c) => c.key === "bmi")?.valueText ?? null;

  const criticalBp = useMemo(() => {
    const sbp = parseOptionalNumber(values.sbp);
    const dbp = parseOptionalNumber(values.dbp);
    if (sbp === null || dbp === null || !Number.isFinite(sbp) || !Number.isFinite(dbp)) return null;
    return assessBloodPressure({ id: "", recordedDate: values.recordedDate, sbp, dbp, isVoided: false }, rules);
  }, [values.sbp, values.dbp, values.recordedDate, rules]);

  const field = (name: keyof LabFormValues) => ({
    name,
    value: values[name],
    error: fieldErrors[name],
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      setFieldErrors({});
      setError(null);
    },
  });

  // เทียบกับผลก่อนวันที่กำลังกรอก เพื่อให้การกรอกย้อนหลังเทียบกับผลที่ถูกต้อง
  const previousOf = (points: LabPoint[]) => latestUpTo(points, values.recordedDate);
  const previousBp = latestUpTo(series.bloodPressure, values.recordedDate);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveLabAction(toLabPayload(patient.id, values));
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setSaved({ data: result.data, comparisons });
      showSaved({
        title: "บันทึกผลตรวจแล้ว",
        detail: result.data.alertsCreated > 0 ? `สร้าง Alert ${result.data.alertsCreated} รายการ` : "ไม่มี Alert ใหม่",
      });
      router.refresh(); // ปรับตัวเลข Alert บนเมนู
    } catch {
      setError("บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (criticalBp) setConfirming(true); // ค่าวิกฤตต้องยืนยันก่อนเสมอ
    else void save();
  }

  if (saved) {
    const { data } = saved;
    return (
      <section role="status" className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-green-900">
            <svg className="size-5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 8.5 6.5 12 13 4.5" />
            </svg>
            บันทึกผลตรวจของ {patient.fullName} แล้ว
          </h2>
          <p className="mt-1 text-sm text-slate-800">
            {data.alertsCreated > 0 ? `สร้าง Alert ${data.alertsCreated} รายการ` : "ไม่มี Alert ใหม่"} ·{" "}
            {data.levelAfter ? `ระดับปัจจุบัน: ${RISK_LEVEL_LABELS[data.levelAfter]}` : "ยังไม่มีข้อมูลสำหรับประเมินระดับ"}
          </p>
        </div>
        <div className="border-t border-slate-200 pt-3"><ComparisonRows items={saved.comparisons} /></div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => { setSaved(null); setValues(initialValues); }} className={SECONDARY_BUTTON}>บันทึกผลตรวจเพิ่ม</button>
          <Link href={`/patients/${patient.id}?tab=labs`} className={PRIMARY_BUTTON}>ดูผลตรวจของผู้ป่วย</Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-xl border border-slate-200 bg-white">
        <FormGroup title="การตรวจครั้งนี้">
          <div className="max-w-xs">
            <TextField {...field("recordedDate")} label="วันที่ตรวจ" type="date" required max={today} hint="วันที่เจาะเลือดหรือตรวจจริง ไม่ใช่วันที่กรอก" />
          </div>
          <p className="mt-3 text-sm text-slate-700">กรอกเฉพาะรายการที่ตรวจในครั้งนี้ อย่างน้อย 1 รายการ</p>
        </FormGroup>

        <FormGroup title="น้ำตาล">
          <div className="grid grid-cols-2 items-start gap-4">
            <TextField {...field("hba1c")} label="HbA1c (%)" inputMode="decimal" hint={previousHint(previousOf(series.hba1c), "%")} />
            <TextField {...field("fbs")} label="FBS (mg/dL)" inputMode="numeric" hint={previousHint(previousOf(series.fbs), "mg/dL")} />
          </div>
        </FormGroup>

        <FormGroup title="ความดันโลหิต">
          <div className="grid grid-cols-2 items-start gap-4">
            <TextField {...field("sbp")} label="ตัวบน (mmHg)" inputMode="numeric" hint={previousBp ? `ครั้งก่อน ${previousBp.sbp}/${previousBp.dbp} (${unbrokenDate(previousBp.date)})` : "ยังไม่มีผลครั้งก่อน"} />
            <TextField {...field("dbp")} label="ตัวล่าง (mmHg)" inputMode="numeric" />
          </div>
        </FormGroup>

        <FormGroup title="น้ำหนักและส่วนสูง">
          <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3">
            <TextField {...field("weightKg")} label="น้ำหนัก (กก.)" inputMode="decimal" hint={previousHint(previousOf(series.weightKg), "กก.")} />
            <TextField {...field("heightCm")} label="ส่วนสูง (ซม.)" inputMode="decimal" hint={previousHint(previousOf(series.heightCm), "ซม.")} />
            <div className="col-span-2 sm:col-span-1">
              <p className="text-sm font-medium text-slate-900">BMI</p>
              <p className="mt-1 flex min-h-11 items-center text-sm text-slate-700">
                {bmi ? <span className="text-base font-semibold tabular-nums text-slate-900">{bmi}</span> : "คำนวณเมื่อกรอกน้ำหนักและส่วนสูง"}
              </p>
            </div>
          </div>
        </FormGroup>

        <FormGroup title="บันทึกเพิ่มเติม">
          <TextField {...field("note")} label="หมายเหตุ" maxLength={500} />
        </FormGroup>
      </div>

      <aside aria-label="สรุปก่อนบันทึก" className="space-y-3 lg:sticky lg:top-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-[15px] font-semibold text-slate-900">สิ่งที่จะบันทึก</h2>
          <p className="mb-3 mt-0.5 text-[13px] text-slate-700">{patient.fullName} · HN {patient.hn} · ตรวจ {formatThaiDate(values.recordedDate)}</p>
          {comparisons.length > 0 ? <ComparisonRows items={comparisons} /> : <p className="text-sm text-slate-700">ยังไม่ได้กรอกผลตรวจ</p>}
        </section>

        {criticalBp ? (
          <div role="note" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-950">
            {criticalBp.message} ระบบจะสร้าง Alert ทันทีหลังบันทึก และจะขอให้ยืนยันก่อนบันทึก
          </div>
        ) : null}

        <FormError message={error} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row lg:flex-col-reverse">
          <Link href={`/patients/${patient.id}?tab=labs`} className={`${SECONDARY_BUTTON} sm:flex-1 lg:flex-none`}>ยกเลิก</Link>
          <button type="submit" disabled={saving} aria-busy={saving} className={`${PRIMARY_BUTTON} sm:flex-1 lg:flex-none`}>{saving ? "กำลังบันทึก..." : "บันทึกผลตรวจ"}</button>
        </div>
      </aside>

      <ActionDialog open={confirming} title="ความดันถึงเกณฑ์วิกฤต บันทึกหรือไม่?" busy={saving} onClose={() => setConfirming(false)}>
        <p className="text-sm text-slate-700">{patient.fullName} · HN {patient.hn} · ตรวจ {formatThaiDate(values.recordedDate)}</p>
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-950">
          {criticalBp?.message} ระบบจะสร้าง Alert ทันที ตรวจตัวเลขก่อนยืนยัน
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={saving} onClick={() => setConfirming(false)} className={SECONDARY_BUTTON}>กลับไปแก้ไข</button>
          <button type="button" disabled={saving} aria-busy={saving} onClick={() => void save()} className={PRIMARY_BUTTON}>{saving ? "กำลังบันทึก..." : "บันทึกและสร้าง Alert"}</button>
        </div>
      </ActionDialog>
    </form>
  );
}
