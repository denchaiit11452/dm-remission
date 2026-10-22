import { redirect } from "next/navigation";

// หน้าแรกส่งต่อไปภาพรวมเสมอ ถ้ายังไม่ Login proxy.ts จะส่งไปหน้า Login เอง
export default function Home() {
  redirect("/dashboard");
}
