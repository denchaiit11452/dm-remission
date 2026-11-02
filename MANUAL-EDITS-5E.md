# 5E: แก้ไฟล์เดิม 3 จุด (ทำเองเพื่อไม่ทับส่วนที่คุณปรับฟอนต์/สัญลักษณ์ไว้แล้ว)

## 1) src/components/patients/profile/ProfileHeader.tsx — เพิ่มปุ่ม "+ บันทึกน้ำตาล"

เพิ่ม import ด้านบน:

    import Link from "next/link";

แทนที่ `<header>...</header>` เดิมด้วย:

    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 id="patient-name" className="text-xl font-semibold text-slate-900 md:text-2xl">{patient.fullName}</h1>
        <p className="mt-1 text-sm text-slate-700">{subtitle}</p>
      </div>
      <Link
        href={`/patients/${patient.id}/glucose`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-800 px-5 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 md:w-auto"
      >
        + บันทึกน้ำตาล
      </Link>
    </header>

## 2) src/components/patients/profile/DailyHistory.tsx — ลิงก์ "+ เพิ่มค่าย้อนหลัง" (2 จุด)

(ก) ในตาราง ภายใน `<td colSpan={4} ...>` ต่อจากข้อความ "ไม่ได้บันทึกค่าน้ำตาลในวันนี้" เพิ่ม:

    <Link href={`/patients/${patientId}/glucose?date=${day.date}`} className="ml-3 inline-flex min-h-11 items-center font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
      + เพิ่มค่าย้อนหลัง
    </Link>

(ข) ในการ์ดมือถือ แทนที่ `<p className="mt-2 text-sm text-slate-700">ไม่ได้บันทึกค่าน้ำตาลในวันนี้</p>` ด้วย:

    <>
      <p className="mt-2 text-sm text-slate-700">ไม่ได้บันทึกค่าน้ำตาลในวันนี้</p>
      <Link href={`/patients/${patientId}/glucose?date=${day.date}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-teal-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
        + เพิ่มค่าย้อนหลัง
      </Link>
    </>

## 3) (ไม่บังคับ) src/app/(main)/patients/[id]/page.tsx — แก้คอมเมนต์ให้ตรงความจริง
บรรทัดคอมเมนต์ที่บอกว่ายังไม่มีปุ่มบันทึกน้ำตาล/เพิ่มค่าย้อนหลัง ให้แก้เป็นว่าเปิดแล้วในขั้น 5E
