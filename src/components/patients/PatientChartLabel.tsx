"use client";

import { useLayoutEffect, useRef } from "react";
import { GENDER_LABELS, formatThaiDate } from "@/lib/format";
import { ageInYears } from "@/lib/data/view";
import { DIABETES_TYPE_LABELS, requiredFieldStatus, type PatientFormValues } from "@/lib/patient-form";
import RiskBadge from "./RiskBadge";

type FieldName = keyof PatientFormValues;

type Props = {
  values: PatientFormValues;
  /** ชื่อช่องที่กำลังกรอกอยู่ ใช้บอกว่าแถวไหนบนแฟ้มกำลังเปลี่ยน */
  focused: string | null;
  today: string;
  saving: boolean;
  saved: boolean;
};

/** เกินอายุนี้มักเป็นปีที่ยังพิมพ์ไม่จบ จึงยังไม่แสดงอายุ (ใช้แสดงผลเท่านั้น ไม่ใช่เกณฑ์ตรวจข้อมูล) */
const MAX_DISPLAYED_AGE = 130;

const FUTURE_DATE_NOTE = "เป็นวันในอนาคต";

type RowValue = { text: string; warn?: boolean };

/** แปลงวันที่เป็น พ.ศ. ให้เห็นทันทีว่าปีที่กรอกถูกหรือไม่ เพราะช่องวันที่ของเบราว์เซอร์อาจแสดงเป็น ค.ศ. */
function pastDateValue(value: string, today: string): RowValue | null {
  if (!value) return null;
  const date = formatThaiDate(value);
  return value > today ? { text: `${date} ${FUTURE_DATE_NOTE}`, warn: true } : { text: date };
}

function birthDateValue(value: string, today: string): RowValue | null {
  const date = pastDateValue(value, today);
  if (!date || date.warn) return date;
  const age = ageInYears(value, today);
  return age !== null && age <= MAX_DISPLAYED_AGE ? { text: `${date.text} อายุ ${age} ปี` } : date;
}

function textValue(...parts: string[]): RowValue | null {
  const text = parts.map((part) => part.trim()).filter(Boolean).join(" ");
  return text ? { text } : null;
}

type Row = { label: string; fields: FieldName[]; typed?: boolean; read: (values: PatientFormValues, today: string) => RowValue | null };

const ROWS: Row[] = [
  { label: "เพศ", fields: ["gender"], read: (v) => (v.gender ? { text: GENDER_LABELS[v.gender as keyof typeof GENDER_LABELS] } : null) },
  { label: "วันเกิด", fields: ["birthDate"], read: (v, today) => birthDateValue(v.birthDate, today) },
  { label: "โทรศัพท์", fields: ["phone"], typed: true, read: (v) => textValue(v.phone) },
  { label: "ติดต่อฉุกเฉิน", fields: ["emergencyContactName", "emergencyContactPhone"], typed: true, read: (v) => textValue(v.emergencyContactName, v.emergencyContactPhone) },
  {
    label: "ชนิดเบาหวาน",
    fields: ["diabetesType"],
    read: (v) => (v.diabetesType && v.diabetesType !== "UNKNOWN" ? { text: DIABETES_TYPE_LABELS[v.diabetesType as keyof typeof DIABETES_TYPE_LABELS] } : null),
  },
  { label: "วันที่วินิจฉัย", fields: ["diagnosedAt"], read: (v, today) => pastDateValue(v.diagnosedAt, today) },
  { label: "เริ่มโปรแกรม", fields: ["programStartDate"], read: (v, today) => pastDateValue(v.programStartDate, today) },
];

function Caret() {
  return <span aria-hidden="true" className="chart-caret ml-0.5 inline-block h-[1em] w-0.5 bg-current align-[-0.15em]" />;
}

/** แถวที่มีไฮไลต์เลื่อนตามช่องที่กำลังกรอก จึงเห็นว่าค่าที่พิมพ์ไปลงตรงไหนของแฟ้ม */
function useFocusSlider(focusKey: string | null, values: PatientFormValues) {
  const listRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const slider = sliderRef.current;
    const row = listRef.current?.querySelector<HTMLElement>("[data-active]");
    if (!slider) return;
    if (!row) {
      slider.removeAttribute("data-on");
      return;
    }
    // เพิ่งปรากฏ: วางตำแหน่งก่อนโดยไม่เลื่อน เพื่อไม่ให้พุ่งมาจากแถวเดิมที่ซ่อนไปแล้ว
    if (!slider.hasAttribute("data-on")) {
      slider.style.transition = "opacity 120ms ease-out";
      slider.style.transform = `translateY(${row.offsetTop}px)`;
      slider.style.height = `${row.offsetHeight}px`;
      void slider.offsetHeight;
      slider.style.removeProperty("transition");
      slider.setAttribute("data-on", "");
      return;
    }
    slider.style.transform = `translateY(${row.offsetTop}px)`;
    slider.style.height = `${row.offsetHeight}px`;
  }, [focusKey, values]);

  return { listRef, sliderRef };
}

function RequiredProgress({ values }: { values: PatientFormValues }) {
  const status = requiredFieldStatus(values);
  const missing = status.filter((field) => !field.filled);
  return (
    <>
      <div aria-hidden="true" className="flex gap-1">
        {status.map((field) => (
          <span key={field.name} className="h-1 flex-1 overflow-hidden rounded bg-white/25">
            <span data-filled={field.filled ? "" : undefined} className="chart-required-fill block h-full rounded bg-[#5eead4]" />
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] text-[#cfe6e3]">
        {missing.length > 0 ? `ยังต้องกรอก ${missing.map((field) => field.label).join(" ")}` : "กรอกช่องจำเป็นครบแล้ว"}
      </p>
      {/* แจ้งเฉพาะตอนครบ ไม่อ่านซ้ำทุกครั้งที่พิมพ์ */}
      <p role="status" className="sr-only">{missing.length === 0 ? "กรอกช่องจำเป็นครบแล้ว" : ""}</p>
    </>
  );
}

function SavedStamp() {
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-[#5eead4]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle className="chart-stamp-ring" cx="12" cy="12" r="10" pathLength={1} />
        <path className="chart-stamp-check" d="M7.5 12.5l3 3 6-6.5" pathLength={1} />
      </svg>
      เพิ่มผู้ป่วยแล้ว
    </p>
  );
}

/** แฟ้มผู้ป่วยที่เขียนตัวเองตามค่าที่กรอก ช่วยให้เห็นว่ากำลังเพิ่มใครและค่าที่กรอกอ่านออกมาเป็นอะไร */
export default function PatientChartLabel({ values, focused, today, saving, saved }: Props) {
  const { listRef, sliderRef } = useFocusSlider(focused, values);
  const hn = values.hn.trim();
  const nameParts = (["prefix", "firstName", "lastName"] as const).filter((field) => values[field].trim() !== "");
  const nameFocused = focused === "prefix" || focused === "firstName" || focused === "lastName";

  return (
    <div data-saving={saving ? "" : undefined} data-saved={saved ? "" : undefined} aria-label="สรุปข้อมูลผู้ป่วยที่กำลังเพิ่ม" role="group" className="chart-label">
      {/* แท็บแฟ้มทับเส้นขอบบนของการ์ด จึงดูเป็นชิ้นเดียวกัน */}
      <div className="relative z-[1] -mb-px ml-4 flex overflow-hidden">
        <div
          data-active={focused === "hn" ? "" : undefined}
          className="chart-tab min-w-0 truncate rounded-t-lg bg-[#115e59] px-3 py-1 text-[13px] font-medium tabular-nums text-white"
        >
          HN {hn ? hn : <span className="font-normal text-[#cfe6e3]">ยังไม่ได้กรอก</span>}
          {focused === "hn" ? <Caret /> : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-white">
        <span aria-hidden="true" className="chart-spine absolute inset-y-0 left-0 z-[1] w-1 bg-[#94a3b8]" />

        {/* ส่วนหัวสีเข้มเป็นจุดเด่นของหน้า เพราะบอกว่ากำลังเพิ่มผู้ป่วยคนไหน จอแคบจะเห็นเฉพาะส่วนนี้ */}
        <div className="bg-[#115e59] py-3 pl-5 pr-4 text-white lg:py-4">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="min-w-0 break-words text-[17px] font-semibold leading-snug lg:text-lg">
              {nameParts.length === 0 ? <span className="font-normal text-[#cfe6e3]">ยังไม่ได้กรอกชื่อ</span> : null}
              {nameParts.map((field, index) => (
                <span key={field}>
                  {index > 0 ? " " : ""}
                  {values[field].trim()}
                  {focused === field ? <Caret /> : null}
                </span>
              ))}
              {nameFocused && !nameParts.includes(focused as (typeof nameParts)[number]) ? <Caret /> : null}
            </p>
            <span className="hidden lg:block">
              <RiskBadge level={null} />
            </span>
          </div>

          {/* สูงเท่ากันทั้งสองสถานะ ปุ่มด้านล่างจึงไม่กระโดดตอนบันทึกสำเร็จ */}
          <div className="mt-2.5 min-h-7 lg:mt-3">{saved ? <SavedStamp /> : <RequiredProgress values={values} />}</div>
        </div>

        <div className="hidden rounded-b-xl border border-t-0 border-slate-200 pb-3 pl-5 pr-4 pt-2 lg:block">
          <div ref={listRef} className="relative">
            <span ref={sliderRef} aria-hidden="true" className="chart-row-slider absolute inset-x-0 top-0 -mx-2 rounded-md bg-[#d9ebe8]" />
            <dl>
              {ROWS.map((row) => {
                const value = row.read(values, today);
                const active = focused !== null && row.fields.includes(focused as FieldName);
                return (
                  <div key={row.label} data-active={active ? "" : undefined} className="relative grid grid-cols-[6.25rem_minmax(0,1fr)] gap-x-2 py-1.5 text-sm">
                    <dt className="pt-px text-[12.5px] text-slate-600">{row.label}</dt>
                    <dd className="min-w-0 break-words">
                      {/* เปลี่ยน key ให้เล่นการเขียนหมึกตอนค่าเพิ่งลงแฟ้ม ช่องที่พิมพ์ต่อเนื่องจึงไม่กะพริบทุกตัวอักษร */}
                      <span
                        key={row.typed ? String(value !== null) : (value?.text ?? "")}
                        className={`${value ? "chart-ink" : ""} ${value?.warn ? "font-medium text-red-800" : value ? "text-slate-900" : "text-slate-500"}`}
                      >
                        {value?.text ?? "ยังไม่ระบุ"}
                      </span>
                      {active && row.typed ? <Caret /> : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        {/* จอแคบเส้นนี้วิ่งบนหัวสีเข้ม จอกว้างวิ่งบนพื้นขาว จึงใช้เฉดกลางที่เห็นได้ทั้งสองแบบ */}
        <span aria-hidden="true" className="chart-progress absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
          <span className="block h-full w-1/4 bg-teal-500" />
        </span>
      </div>
    </div>
  );
}
