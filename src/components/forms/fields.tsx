// ช่องกรอกที่ใช้ร่วมกันในฟอร์มข้อมูลผู้ป่วย ผลตรวจ และยา (แตะง่ายอย่างน้อย 44 px)
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
const CONTROL = "mt-1 min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 disabled:bg-slate-50 aria-invalid:border-red-700";

export const PRIMARY_BUTTON = `inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-70 ${FOCUS}`;
export const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50 ${FOCUS}`;
export const DANGER_BUTTON = `inline-flex min-h-11 items-center justify-center rounded-lg bg-risk-critical px-5 text-sm font-medium text-white hover:bg-red-900 disabled:cursor-wait disabled:opacity-70 ${FOCUS}`;
export const TEXT_LINK = `inline-flex min-h-11 items-center text-sm font-medium text-teal-800 underline underline-offset-2 ${FOCUS}`;

/** ค่าที่อ่านกลับให้ผู้กรอกตรวจ เช่น วันที่เป็น พ.ศ. warn = ค่าที่ต้องระวัง (มีคำกำกับในข้อความเสมอ) */
export type FieldReadback = { text: string; warn?: boolean };

type ShellProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** undefined = ช่องนี้ไม่มีบรรทัดอ่านกลับ, null = มีแต่ยังไม่มีค่า (จองบรรทัดไว้ ฟอร์มจึงไม่กระโดดตอนกรอก) */
  readback?: FieldReadback | null;
  children: ReactNode;
};

function FieldShell({ id, label, required, error, hint, readback, children }: ShellProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-900">
        {label}
        {required ? <span className="text-risk-critical"> * <span className="sr-only">จำเป็นต้องกรอก</span></span> : null}
      </label>
      {children}
      {hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-slate-700">{hint}</p> : null}
      {/* อยู่ใต้คำแนะนำ ช่องว่างที่จองไว้ตอนยังไม่กรอกจึงอยู่ท้ายสุด ไม่แทรกระหว่างช่องกับคำแนะนำ */}
      {readback !== undefined ? (
        <p
          id={`${id}-readback`}
          aria-live="polite"
          className={`mt-0.5 min-h-5 text-[13px] font-medium leading-5 tabular-nums ${readback?.warn ? "text-red-800" : "text-primary-hover"}`}
        >
          {readback?.text ?? ""}
        </p>
      ) : null}
      {error ? <p id={`${id}-error`} className="mt-1 text-sm text-red-800">{error}</p> : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string, readback?: FieldReadback | null): string | undefined {
  const ids = [readback ? `${id}-readback` : null, hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

type FieldProps = { name: string; label: string; error?: string; hint?: string };

export function TextField({ name, label, error, hint, required, readback, ...rest }: FieldProps & { readback?: FieldReadback | null } & InputHTMLAttributes<HTMLInputElement>) {
  const id = `field-${name}`;
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint} readback={readback}>
      <input id={id} name={name} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint, readback)} className={CONTROL} {...rest} />
    </FieldShell>
  );
}

export function SelectField({ name, label, error, hint, required, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = `field-${name}`;
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <select id={id} name={name} required={required} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={CONTROL} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ name, label, error, hint, required, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = `field-${name}`;
  return (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
      <textarea id={id} name={name} required={required} rows={3} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} className={`${CONTROL} py-2`} {...rest} />
    </FieldShell>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">{message}</div>;
}
