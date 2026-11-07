"use client";

// ฟอร์มปักหมุดบ้านผู้ป่วย: แผนที่ + จุดสังเกต + ยืนยันความยินยอม (บังคับทุกครั้งที่บันทึก)
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { savePatientLocationAction } from "@/app/(main)/patients/actions";
import { useSaveToast } from "@/components/forms/SaveToast";
import UnsavedChangesGuard from "@/components/forms/UnsavedChangesGuard";
import { FormError, PRIMARY_BUTTON, SECONDARY_BUTTON, TextAreaField, TextField } from "@/components/forms/fields";
import LocationPinMap, { type LatLng } from "@/components/records/LocationPinMap";
import { pastDateReadback } from "@/lib/date-readback";

export type LocationFormInitial = {
  latitude: number;
  longitude: number;
  addressNote: string | null;
  consentGivenAt: string;
};

type Props = { patientId: string; today: string; initial: LocationFormInitial | null };

export default function LocationPinForm({ patientId, today, initial }: Props) {
  const router = useRouter();
  const showSaved = useSaveToast();
  const backHref = `/patients/${patientId}?tab=location`;

  const [pin, setPin] = useState<LatLng | null>(initial ? { latitude: initial.latitude, longitude: initial.longitude } : null);
  const [consentDate, setConsentDate] = useState(initial?.consentGivenAt ?? today);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pinError = fieldErrors.latitude ?? fieldErrors.longitude;

  function clearFieldError(...names: string[]) {
    setError(null);
    setFieldErrors((errors) => {
      const next = { ...errors };
      for (const name of names) delete next[name];
      return next;
    });
  }

  function movePin(next: LatLng) {
    setPin(next);
    setDirty(true);
    clearFieldError("latitude", "longitude");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!pin) {
      const message = "กรุณาปักหมุดบนแผนที่ตรงบ้านผู้ป่วย";
      setError(message);
      setFieldErrors({ latitude: message });
      return;
    }
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await savePatientLocationAction({
        patientId,
        latitude: pin.latitude,
        longitude: pin.longitude,
        addressNote: String(form.get("addressNote") ?? "") || null,
        consentConfirmed: form.get("consentConfirmed") === "yes",
        consentGivenAt: String(form.get("consentGivenAt") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setSaving(false);
        return;
      }
      setDirty(false);
      showSaved({ title: "บันทึกพิกัดบ้านแล้ว", detail: `${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}` });
      router.push(backHref); // คงสถานะกำลังบันทึกไว้จนเปลี่ยนหน้า กันกดซ้ำ
    } catch {
      setError("บันทึกพิกัดไม่สำเร็จ หมุดที่ปักไว้ยังอยู่ กรุณาลองใหม่อีกครั้ง");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onChange={(e) => {
        setDirty(true);
        const target = e.target as EventTarget;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) clearFieldError(target.name);
      }}
      noValidate
      className="space-y-5"
    >
      <section aria-labelledby="pin-title" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div>
          <h2 id="pin-title" className="text-[17px] font-semibold text-slate-900">ปักหมุดตรงบ้านผู้ป่วย</h2>
          <p className="mt-0.5 text-[14px] text-slate-700">แตะบนแผนที่ตรงตัวบ้าน แล้วลากหมุดเพื่อขยับให้ตรง ถ้าอยู่ที่บ้านผู้ป่วยแล้ว กด &quot;ไปที่ตำแหน่งของฉัน&quot; เพื่อเลื่อนแผนที่มาที่นี่ก่อน</p>
        </div>

        <LocationPinMap value={pin} onChange={movePin} describedBy={pinError ? "pin-error" : undefined} />

        <p aria-live="polite" className="text-[14px] tabular-nums text-slate-900">
          {pin ? (
            <>
              <span className="text-slate-600">หมุดอยู่ที่ </span>
              <span className="font-medium">{pin.latitude.toFixed(6)}, {pin.longitude.toFixed(6)}</span>
            </>
          ) : (
            <span className="text-slate-600">ยังไม่ได้ปักหมุด</span>
          )}
        </p>
        {pinError ? <p id="pin-error" className="text-sm text-red-800">{pinError}</p> : null}

        <TextAreaField
          name="addressNote"
          label="จุดสังเกต"
          maxLength={500}
          defaultValue={initial?.addressNote ?? ""}
          error={fieldErrors.addressNote}
          hint="เช่น บ้านไม้สองชั้นหลังร้านค้า ประตูรั้วสีเขียว"
        />
      </section>

      <section aria-labelledby="consent-title" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <h2 id="consent-title" className="text-[17px] font-semibold text-slate-900">ความยินยอมของผู้ป่วย</h2>
        <div>
          <label className="flex min-h-11 items-start gap-3 py-2 text-[15px] text-slate-900">
            <input
              type="checkbox"
              name="consentConfirmed"
              value="yes"
              aria-invalid={fieldErrors.consentConfirmed ? true : undefined}
              aria-describedby={fieldErrors.consentConfirmed ? "consent-error" : undefined}
              className="mt-0.5 size-5 shrink-0"
            />
            <span>ผู้ป่วยหรือผู้ดูแลยินยอมให้โรงพยาบาลบันทึกพิกัดบ้าน เพื่อใช้ออกเยี่ยมบ้านและติดตามการรักษา</span>
          </label>
          {fieldErrors.consentConfirmed ? <p id="consent-error" className="text-sm text-red-800">{fieldErrors.consentConfirmed}</p> : null}
        </div>
        <div className="max-w-xs">
          <TextField
            name="consentGivenAt"
            label="วันที่ให้ความยินยอม"
            type="date"
            required
            max={today}
            value={consentDate}
            onChange={(e) => setConsentDate(e.target.value)}
            readback={pastDateReadback(consentDate, today)}
            error={fieldErrors.consentGivenAt}
          />
        </div>
      </section>

      <FormError message={error} />

      <p className="text-[12.5px] leading-snug text-slate-600">
        ภาพแผนที่โหลดจาก OpenStreetMap ซึ่งเห็นเพียงพื้นที่ที่เลื่อนดู ไม่เห็นชื่อผู้ป่วย การบันทึกทุกครั้งถูกเก็บในประวัติการเข้าถึง
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={backHref} className={SECONDARY_BUTTON}>ยกเลิก</Link>
        <button type="submit" disabled={saving} aria-busy={saving} className={PRIMARY_BUTTON}>
          {saving ? "กำลังบันทึก..." : "บันทึกพิกัด"}
        </button>
      </div>

      <UnsavedChangesGuard when={dirty && !saving} />
    </form>
  );
}
