// หน้าชั่วคราวของเมนูที่ยังไม่ได้พัฒนา (กันลิงก์ในเมนูขึ้น 404) ลบออกเมื่อมีหน้าจริง
export default function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-700">หน้านี้อยู่ระหว่างพัฒนา</p>
      {note ? <p className="mt-1 text-sm text-slate-600">{note}</p> : null}
    </section>
  );
}
