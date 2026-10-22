// Prisma client แบบ singleton
// ใน dev โหมด Next.js โหลดโมดูลซ้ำบ่อย ถ้าสร้าง client ใหม่ทุกครั้งจะเปิด connection เกินจำเป็น
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
