// ตรวจว่า error มาจาก "ติดต่อฐานข้อมูลไม่ได้" หรือไม่ (ไม่ผูกกับคลาสของ Prisma จึงทดสอบได้และไม่พังเมื่อเวอร์ชันเปลี่ยน)
// รหัส Prisma: P1001 เข้าถึงเซิร์ฟเวอร์ไม่ได้, P1002 หมดเวลาเชื่อมต่อ, P1008 หมดเวลาดำเนินการ,
//             P1017 เซิร์ฟเวอร์ปิดการเชื่อมต่อ, P2024 รอคิวเชื่อมต่อนานเกินไป

const DB_CODES = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);
const DB_MESSAGE = /can'?t reach database server|timed out fetching a new connection|server has closed the connection|connection pool|terminating connection due to administrator command/i;

type ErrorLike = { name?: unknown; code?: unknown; message?: unknown; cause?: unknown };

export function isDbUnavailable(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 3) return false;
  const e = error as ErrorLike;
  if (e.name === "PrismaClientInitializationError") return true;
  if (typeof e.code === "string" && DB_CODES.has(e.code)) return true;
  if (typeof e.message === "string" && DB_MESSAGE.test(e.message)) return true;
  return e.cause ? isDbUnavailable(e.cause, depth + 1) : false;
}
