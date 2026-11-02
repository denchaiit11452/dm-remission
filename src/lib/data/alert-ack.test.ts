import { describe, expect, it } from "vitest";
import { acknowledgeCore, type AckTx } from "./alert-ack";

type Row = { patientId: string; level: string; status: string; ackAt: Date | null; ackBy: { fullName: string } | null };
function fakeTx(row: Row | null) {
  const audits: unknown[] = [];
  const tx: AckTx = {
    alert: {
      async updateMany({ data }) {
        if (row && row.status === "NEW") { row = { ...row, status: data.status, ackAt: data.ackAt, ackBy: { fullName: "ผู้กดคนแรก" } }; return { count: 1 }; }
        return { count: 0 };
      },
      async findUnique() { return row; },
    },
    auditLog: { async create(a) { audits.push(a.data); return {}; } },
  };
  return { tx, audits };
}
const NOW = new Date("2026-10-15T03:00:00Z");

describe("acknowledgeCore", () => {
  it("รับทราบ Alert ใหม่: เปลี่ยนสถานะและบันทึกประวัติ (audit) 1 รายการ", async () => {
    const { tx, audits } = fakeTx({ patientId: "p1", level: "CRITICAL", status: "NEW", ackAt: null, ackBy: null });
    expect(await acknowledgeCore(tx, { userId: "u1", alertId: "a1", now: NOW })).toEqual({ kind: "acked" });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ userId: "u1", action: "UPDATE", entity: "alert", entityId: "a1", patientId: "p1", before: { status: "NEW" }, after: { status: "ACKNOWLEDGED", ackById: "u1", level: "CRITICAL" } });
  });
  it("ผู้อื่นรับทราบไปแล้ว: ไม่เขียนทับ ไม่ลง audit และบอกว่าใครรับทราบเมื่อไร", async () => {
    const at = new Date("2026-10-15T02:50:00Z");
    const { tx, audits } = fakeTx({ patientId: "p1", level: "CRITICAL", status: "ACKNOWLEDGED", ackAt: at, ackBy: { fullName: "พญ. ใจดี" } });
    const r = await acknowledgeCore(tx, { userId: "u2", alertId: "a1", now: NOW });
    expect(r).toEqual({ kind: "already", status: "ACKNOWLEDGED", by: "พญ. ใจดี", at });
    expect(audits).toHaveLength(0);
  });
  it("กดซ้ำสองครั้ง: ครั้งแรกสำเร็จ ครั้งที่สองถูกปฏิเสธ (รับทราบครั้งเดียวต่อรายการ)", async () => {
    const { tx, audits } = fakeTx({ patientId: "p1", level: "HIGH", status: "NEW", ackAt: null, ackBy: null });
    expect((await acknowledgeCore(tx, { userId: "u1", alertId: "a1", now: NOW })).kind).toBe("acked");
    expect((await acknowledgeCore(tx, { userId: "u1", alertId: "a1", now: NOW })).kind).toBe("already");
    expect(audits).toHaveLength(1);
  });
  it("Alert ที่ถูกยกเลิก: รับทราบไม่ได้", async () => {
    const { tx } = fakeTx({ patientId: "p1", level: "CRITICAL", status: "CANCELLED", ackAt: null, ackBy: null });
    expect(await acknowledgeCore(tx, { userId: "u1", alertId: "a1", now: NOW })).toMatchObject({ kind: "already", status: "CANCELLED" });
  });
  it("ไม่พบ Alert", async () => {
    const { tx } = fakeTx(null);
    expect(await acknowledgeCore(tx, { userId: "u1", alertId: "nope", now: NOW })).toEqual({ kind: "not_found" });
  });
});
