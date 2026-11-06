"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPatientAction, updatePatientAction } from "@/app/(main)/patients/actions";
import { useSaveToast } from "@/components/forms/SaveToast";
import UnsavedChangesGuard from "@/components/forms/UnsavedChangesGuard";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { birthDateReadback, pastDateReadback } from "@/lib/date-readback";
import { GENDER_LABELS } from "@/lib/format";
import {
  DIABETES_TYPE_LABELS, PATIENT_FIELD_LIMITS as LIMITS, issuesFromFieldErrors, sanitizeHnInput, sanitizePhoneInput, toPatientPayload, validatePatientForm,
  type PatientFormIssue, type PatientFormValues,
} from "@/lib/patient-form";
import PatientChartLabel from "./PatientChartLabel";
import PatientFormIssuesDialog from "./PatientFormIssuesDialog";
import "./patient-form.css";

type Props = {
  /** ไม่มี = เพิ่มผู้ป่วยใหม่ */
  patientId?: string;
  initial: PatientFormValues;
  today: string;
  cancelHref: string;
};

const SECTION_ICONS = {
  identity: (
    <>
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
      <circle cx="5.5" cy="7" r="1.4" />
      <path d="M3.3 10.8c.3-1.1 1.2-1.7 2.2-1.7s1.9.6 2.2 1.7M10 6.5h2.5M10 9.5h2.5" />
    </>
  ),
  contact: <path d="M4.2 2.2h1.6l1 3-1.3 1a8 8 0 0 0 4.3 4.3l1-1.3 3 1v1.6a1.4 1.4 0 0 1-1.5 1.4A11.3 11.3 0 0 1 2.8 3.7a1.4 1.4 0 0 1 1.4-1.5z" />,
  program: (
    <>
      <rect x="3" y="2.8" width="10" height="11.2" rx="1.5" />
      <path d="M6 2h4v1.8H6zM5.5 9h1.2l1-2 1.3 3.5.9-1.5h1.1" />
    </>
  ),
};

type FormSectionProps = {
  id: string;
  title: string;
  note?: string;
  /** ใส่ไอคอนและแถบหัวสีเฉพาะหน้าเพิ่มผู้ป่วย หน้าแก้ไขยังเป็นหัวเรียบแบบเดิม */
  icon?: keyof typeof SECTION_ICONS;
  children: ReactNode;
};

function FormSection({ id, title, note, icon, children }: FormSectionProps) {
  return (
    <section aria-labelledby={id} className={`@container space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5 ${icon ? "pf-section" : ""}`}>
      {icon ? (
        <div className="pf-section-head -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-t-[11px] px-4 py-2.5 md:-mx-5 md:-mt-5 md:px-5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="pf-section-icon flex size-8 shrink-0 items-center justify-center rounded-lg text-white">
              <svg viewBox="0 0 16 16" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">{SECTION_ICONS[icon]}</svg>
            </span>
            <h2 id={id} className="text-base font-semibold text-primary-hover">{title}</h2>
          </div>
          {note ? <p className="text-[12.5px] text-section-note">{note}</p> : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 id={id} className="text-base font-semibold text-slate-900">{title}</h2>
          {note ? <p className="text-[12.5px] text-slate-600">{note}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}

const PAST_DATE_HINT = "ไม่เกินวันนี้";
const PHONE_HINT = `ตัวเลข 0-9 ครบ ${LIMITS.phone} หลัก`;

function maxCharsHint(max: number) {
  return `ไม่เกิน ${max.toLocaleString("en-US")} ตัวอักษร`;
}

/** ตัดตัวอักษรที่ไม่อนุญาตทันทีที่พิมพ์หรือวาง โดยเคอร์เซอร์ยังอยู่ตำแหน่งเดิม */
function keepAllowedInput(sanitize: (value: string) => string) {
  return (e: FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const clean = sanitize(input.value);
    if (clean === input.value) return;
    const caret = sanitize(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
    input.value = clean;
    input.setSelectionRange(caret, caret);
  };
}

/** พาไปยังช่องที่ต้องแก้ แล้วสั่นและเรืองจางหนึ่งครั้งให้เห็นว่าคือช่องไหน ลดการเคลื่อนไหวแล้วเหลือแค่สีจาง */
function showField(field: HTMLElement) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  field.focus({ preventScroll: true });
  field.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  field.animate([{ backgroundColor: "#fee2e2" }, { backgroundColor: "#ffffff" }], { duration: 900, easing: "ease-out" });
  if (reduceMotion) return;
  field.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)", offset: 0.25 },
      { transform: "translateX(3px)", offset: 0.6 },
      { transform: "translateX(-1px)", offset: 0.85 },
      { transform: "translateX(0)" },
    ],
    { duration: 280, easing: "ease-out" },
  );
}

export default function PatientForm({ patientId, initial, today, cancelHref }: Props) {
  const isNew = !patientId;
  const router = useRouter();
  const showSaved = useSaveToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [issues, setIssues] = useState<PatientFormIssue[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // ช่องกรอกยังเป็น uncontrolled เหมือนเดิม ค่าชุดนี้ใช้แสดงบนแฟ้มเท่านั้น และไม่ถูกเก็บไว้ที่ไหนนอกหน้านี้
  const [liveValues, setLiveValues] = useState(initial);
  const [focused, setFocused] = useState<string | null>(null);

  function showIssues(found: PatientFormIssue[]) {
    setError(null);
    setFieldErrors(Object.fromEntries(found.map((issue) => [issue.name, issue.message])));
    setIssues(found);
  }

  const closeIssues = useCallback((fieldName: PatientFormIssue["name"]) => {
    setIssues(null);
    const field = formRef.current?.querySelector<HTMLElement>(`[name="${fieldName}"]`);
    if (field) showField(field);
  }, []);

  function clearFieldError(name: string) {
    setError(null);
    setFieldErrors((errors) => {
      const next = { ...errors };
      delete next[name];
      return next;
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget)) as PatientFormValues;
    const found = validatePatientForm(values, { today, initial: patientId ? initial : undefined });
    if (found.length > 0) {
      showIssues(found);
      return;
    }
    const payload = toPatientPayload(values);
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = patientId
        ? await updatePatientAction({ ...payload, id: patientId })
        : await createPatientAction(payload);
      if (!result.ok) {
        // เช่น HN ซ้ำ ซึ่งรู้ได้จาก server เท่านั้น ส่วนข้อผิดพลาดที่ไม่เจาะจงช่องยังแสดงในกรอบเดิม
        const serverIssues = issuesFromFieldErrors(result.fieldErrors ?? {});
        if (serverIssues.length > 0) showIssues(serverIssues);
        else setError(result.error);
        setSaving(false);
        return;
      }
      showSaved(
        patientId
          ? { title: "บันทึกการแก้ไขข้อมูลผู้ป่วยแล้ว", detail: `HN ${values.hn}` }
          : {
              title: "เพิ่มผู้ป่วยแล้ว",
              detail: `HN ${values.hn}`,
              celebrate: {
                name: [values.prefix, values.firstName, values.lastName].map((part) => part.trim()).filter(Boolean).join(" "),
                nextHref: "/patients/new",
                nextLabel: "เพิ่มผู้ป่วยรายถัดไป",
              },
            },
      );
      setSaved(isNew);
      router.push(`/patients/${result.id}`); // คงสถานะกำลังบันทึกไว้จนเปลี่ยนหน้า กันกดซ้ำ
    } catch {
      setError("บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่อีกครั้ง");
      setSaving(false);
    }
  }

  // มีค่าที่ต่างจากตอนเปิดหน้า = มีข้อมูลที่ยังไม่บันทึก หยุดถามเมื่อกำลังบันทึกหรือบันทึกสำเร็จแล้ว
  const dirty = !saving && !saved && (Object.keys(initial) as (keyof PatientFormValues)[]).some((key) => (liveValues[key] ?? "") !== initial[key]);

  const submitLabel = saved ? "กำลังเปิดโปรไฟล์..." : saving ? "กำลังบันทึก..." : patientId ? "บันทึกการแก้ไข" : "เพิ่มผู้ป่วย";

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onChange={(e) => {
        clearFieldError(e.target.name);
        // ทั้งหน้าเพิ่มและหน้าแก้ไขใช้ค่าชุดนี้แสดงวันที่เป็น พ.ศ. ใต้ช่อง ส่วนแฟ้มมีเฉพาะหน้าเพิ่ม
        setLiveValues(Object.fromEntries(new FormData(e.currentTarget)) as PatientFormValues);
      }}
      onFocus={(e) => setFocused(e.target.name || null)}
      onBlur={() => setFocused(null)}
      noValidate
      data-has-label={isNew ? "" : undefined}
      // ใช้ flex บนจอแคบ เพราะ grid จำกัดระยะตรึงของแฟ้มไว้แค่แถวของตัวเอง
      className={`patient-form flex flex-col gap-5 ${isNew ? "lg:grid lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:items-start" : ""}`}
    >
      <div className="min-w-0 space-y-5">
        <FormSection id="pf-identity" title="ข้อมูลผู้ป่วย" icon={isNew ? "identity" : undefined}>
          <div className="grid gap-4 @[420px]:grid-cols-2">
            <TextField name="hn" label="HN" required inputMode="numeric" hint={`ตัวเลข 0-9 ไม่เกิน ${LIMITS.hn} หลัก`} onInput={keepAllowedInput(sanitizeHnInput)} defaultValue={initial.hn} error={fieldErrors.hn} autoComplete="off" />
            <TextField name="prefix" label="คำนำหน้า" hint={maxCharsHint(LIMITS.prefix)} maxLength={LIMITS.prefix} defaultValue={initial.prefix} error={fieldErrors.prefix} autoComplete="off" />
            <TextField name="firstName" label="ชื่อ" required hint={maxCharsHint(LIMITS.firstName)} maxLength={LIMITS.firstName} defaultValue={initial.firstName} error={fieldErrors.firstName} autoComplete="off" />
            <TextField name="lastName" label="นามสกุล" required hint={maxCharsHint(LIMITS.lastName)} maxLength={LIMITS.lastName} defaultValue={initial.lastName} error={fieldErrors.lastName} autoComplete="off" />
            <SelectField name="gender" label="เพศ" defaultValue={initial.gender} error={fieldErrors.gender}>
              <option value="">ไม่ระบุ</option>
              {Object.entries(GENDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectField>
            <TextField name="birthDate" label="วันเกิด" type="date" hint={PAST_DATE_HINT} readback={birthDateReadback(liveValues.birthDate, today)} max={today} defaultValue={initial.birthDate} error={fieldErrors.birthDate} />
          </div>
        </FormSection>

        <FormSection id="pf-contact" title="การติดต่อ" icon={isNew ? "contact" : undefined} note={isNew ? "เว้นไว้แล้วเติมภายหลังได้" : undefined}>
          <div className="grid gap-4 @[420px]:grid-cols-2">
            <TextField name="phone" label="เบอร์โทรศัพท์" type="tel" inputMode="numeric" hint={PHONE_HINT} onInput={keepAllowedInput(sanitizePhoneInput)} defaultValue={initial.phone} error={fieldErrors.phone} autoComplete="off" />
            <TextField name="emergencyContactName" label="ชื่อผู้ติดต่อฉุกเฉิน" hint={maxCharsHint(LIMITS.emergencyContactName)} maxLength={LIMITS.emergencyContactName} defaultValue={initial.emergencyContactName} error={fieldErrors.emergencyContactName} autoComplete="off" />
            <TextField name="emergencyContactPhone" label="เบอร์ผู้ติดต่อฉุกเฉิน" type="tel" inputMode="numeric" hint={PHONE_HINT} onInput={keepAllowedInput(sanitizePhoneInput)} defaultValue={initial.emergencyContactPhone} error={fieldErrors.emergencyContactPhone} autoComplete="off" />
          </div>
          <TextAreaField name="address" label="ที่อยู่" hint={maxCharsHint(LIMITS.address)} maxLength={LIMITS.address} defaultValue={initial.address} error={fieldErrors.address} />
        </FormSection>

        <FormSection id="pf-program" title="เบาหวานและโปรแกรม" icon={isNew ? "program" : undefined} note={isNew ? "เว้นไว้แล้วเติมภายหลังได้" : undefined}>
          <div className="grid gap-4 @[420px]:grid-cols-2 @[640px]:grid-cols-3">
            <SelectField name="diabetesType" label="ชนิดเบาหวาน" defaultValue={initial.diabetesType} error={fieldErrors.diabetesType}>
              {Object.entries(DIABETES_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectField>
            <TextField name="diagnosedAt" label="วันที่วินิจฉัย" type="date" hint={PAST_DATE_HINT} readback={pastDateReadback(liveValues.diagnosedAt, today)} max={today} defaultValue={initial.diagnosedAt} error={fieldErrors.diagnosedAt} />
            <TextField name="programStartDate" label="วันที่เริ่มโปรแกรม" type="date" hint={PAST_DATE_HINT} readback={pastDateReadback(liveValues.programStartDate, today)} max={today} defaultValue={initial.programStartDate} error={fieldErrors.programStartDate} />
          </div>
          <TextAreaField name="notes" label="หมายเหตุ" hint={maxCharsHint(LIMITS.notes)} maxLength={LIMITS.notes} defaultValue={initial.notes} error={fieldErrors.notes} />
        </FormSection>
      </div>

      {/* จอกว้าง: แฟ้มและปุ่มตรึงอยู่คอลัมน์ขวาด้วยกัน จอแคบ: แฟ้มตรึงด้านบน ปุ่มอยู่ท้ายฟอร์ม */}
      <div className={`contents ${isNew ? "lg:sticky lg:top-6 lg:block lg:space-y-4" : ""}`}>
        {isNew ? (
          <div className="sticky top-0 z-10 order-first -mx-4 bg-slate-50 px-4 py-2 md:top-[65px] md:-mx-6 md:px-6 lg:static lg:mx-0 lg:bg-transparent lg:p-0">
            <PatientChartLabel values={liveValues} focused={focused} today={today} saving={saving && !saved} saved={saved} />
          </div>
        ) : null}

        <FormError message={error} />

        <div className={`flex flex-col-reverse gap-3 ${isNew ? "sm:flex-row sm:justify-end lg:flex-col-reverse" : "sm:flex-row sm:justify-end"}`}>
          {/* เพิ่มสำเร็จแล้วไม่มีอะไรให้ยกเลิก */}
          {saved ? null : <Link href={cancelHref} className={SECONDARY_BUTTON}>ยกเลิก</Link>}
          <button type="submit" disabled={saving} aria-busy={saving} className={PRIMARY_BUTTON}>
            {submitLabel}
          </button>
        </div>
      </div>

      {issues ? <PatientFormIssuesDialog issues={issues} onClose={closeIssues} /> : null}
      <UnsavedChangesGuard when={dirty} />
    </form>
  );
}
