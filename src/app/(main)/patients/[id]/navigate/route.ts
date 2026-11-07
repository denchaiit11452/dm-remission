// ปุ่ม "นำทาง" ในแท็บพิกัด: ตรวจสิทธิ์ บันทึก OPEN_NAVIGATION แล้วส่งต่อไป Google Maps
// พิกัดถูกส่งออกนอกโรงพยาบาลเฉพาะตอนที่ผู้ใช้กดปุ่มนี้เท่านั้น
import { NextResponse } from "next/server";
import { locationForNavigation } from "@/lib/data/locations";
import { googleMapsDirectionsUrl } from "@/lib/patient-overview";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const location = await locationForNavigation(id);
  if (!location) {
    return NextResponse.redirect(new URL(`/patients/${encodeURIComponent(id)}?tab=location`, request.url), { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.redirect(googleMapsDirectionsUrl(location.latitude, location.longitude), { headers: { "Cache-Control": "no-store" } });
}
