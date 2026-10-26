// เครื่องมือสำหรับนักพัฒนา: สร้าง/ลบข้อมูลผู้ป่วยสมมติ และดูสถานะข้อมูล
// เปิดใช้ได้เฉพาะโหมดพัฒนา (NODE_ENV !== "production") และเฉพาะผู้ใช้ Admin/แพทย์ที่ล็อกอินอยู่
//
//   /api/dev/seed?action=status                         ดูรายชื่อผู้ป่วยและระดับความเสี่ยง (JSON)
//   /api/dev/seed?action=seed&confirm=yes               สร้างผู้ป่วยสมมติ 7 ราย
//   /api/dev/seed?action=seed&confirm=yes&demoRules=1   เช่นเดียวกัน + เกณฑ์น้ำตาลสมมติ (เห็นครบ 5 ระดับ)
//   /api/dev/seed?action=reset&confirm=yes              ลบข้อมูลสาธิตและเกณฑ์สมมติ
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { DemoExistsError, resetDemo, seedDemo } from "@/lib/data/demo-seed";
import { listPatients } from "@/lib/data/patients";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const user = await requireRole("ADMIN", "DOCTOR");

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action") ?? "status";
  const confirmed = sp.get("confirm") === "yes";

  try {
    if (action === "status") {
      const list = await listPatients({ pageSize: 100 });
      return NextResponse.json({ ok: true, ...list });
    }
    if (!confirmed) {
      return NextResponse.json({ ok: false, error: "ต้องเติม &confirm=yes เพื่อยืนยัน" }, { status: 400 });
    }
    if (action === "seed") {
      const summary = await seedDemo(user.id, { demoRules: sp.get("demoRules") === "1" });
      return NextResponse.json({
        ok: true,
        message: summary.demoRules
          ? "สร้างข้อมูลสาธิตแล้ว (ใช้เกณฑ์น้ำตาลสมมติสำหรับทดสอบ ห้ามใช้กับผู้ป่วยจริง ลบด้วย action=reset)"
          : "สร้างข้อมูลสาธิตแล้ว (ใช้เกณฑ์ชุดเริ่มต้น เกณฑ์น้ำตาลของแพทย์ยังว่าง จึงเห็นเฉพาะบางระดับ)",
        summary,
      });
    }
    if (action === "reset") {
      return NextResponse.json({ ok: true, ...(await resetDemo()) });
    }
    return NextResponse.json({ ok: false, error: "action ที่รองรับ: status, seed, reset" }, { status: 400 });
  } catch (e) {
    if (e instanceof DemoExistsError) return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    console.error("dev seed failed", e);
    return NextResponse.json({ ok: false, error: "ดำเนินการไม่สำเร็จ ดูรายละเอียดในเทอร์มินัลของ npm run dev" }, { status: 500 });
  }
}
