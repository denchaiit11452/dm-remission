import { describe, expect, it } from "vitest";
import { EMPTY_STATE, applyPoll, mergeQueue, parseAlerts, parseState, reconcileQueue, type CriticalAlertDTO } from "./critical-alerts";

const a = (id: string, o: Partial<CriticalAlertDTO> = {}): CriticalAlertDTO => ({
  id, patientId: "p" + id, patientName: "ชื่อ " + id, hn: "67" + id, summary: "น้ำตาลสูงจัด", measuredDate: "2026-10-15",
  createdAt: `2026-10-15T0${id.length}:00:00.000Z`, backdatedDays: 0, enteredByMe: false, ...o,
});

describe("applyPoll", () => {
  it("ครั้งแรก: จดรายการเดิมเป็นเห็นแล้วโดยไม่เด้ง (กันเด้งรายเก่าทุกครั้งที่เปิดหน้า)", () => {
    const r = applyPoll(EMPTY_STATE, [a("1"), a("22")]);
    expect(r.toShow).toEqual([]);
    expect(r.state).toEqual({ baselined: true, seen: ["1", "22"] });
  });
  it("ครั้งถัดไป: เด้งเฉพาะรายใหม่ และไม่เด้งซ้ำ", () => {
    const s1 = applyPoll(EMPTY_STATE, [a("1")]).state;
    const r2 = applyPoll(s1, [a("1"), a("22")]);
    expect(r2.toShow.map((x) => x.id)).toEqual(["22"]);
    expect(applyPoll(r2.state, [a("1"), a("22")]).toShow).toEqual([]);
  });
  it("หลายรายพร้อมกัน: เรียงเก่าสุดก่อน", () => {
    const s = applyPoll(EMPTY_STATE, []).state;
    const r = applyPoll(s, [a("333"), a("1"), a("22")]);
    expect(r.toShow.map((x) => x.id)).toEqual(["1", "22", "333"]);
  });
  it("ค่าที่ผู้ใช้คนนี้กรอกเอง: จดเป็นเห็นแล้ว แต่ไม่เด้ง", () => {
    const s = applyPoll(EMPTY_STATE, []).state;
    const r = applyPoll(s, [a("1", { enteredByMe: true }), a("22")]);
    expect(r.toShow.map((x) => x.id)).toEqual(["22"]);
    expect(applyPoll(r.state, [a("1", { enteredByMe: true })]).toShow).toEqual([]);
  });
  it("รายที่หายไป (มีคนรับทราบ) แล้วไม่กลับมาเด้ง", () => {
    const s = applyPoll(applyPoll(EMPTY_STATE, []).state, [a("1")]).state;
    const gone = applyPoll(s, []);
    expect(applyPoll(gone.state, [a("1")]).toShow).toEqual([]);
  });
  it("seen ไม่โตไม่จำกัด", () => {
    let s = applyPoll(EMPTY_STATE, []).state;
    for (let i = 0; i < 700; i++) s = applyPoll(s, [a("x" + i)]).state;
    expect(s.seen.length).toBeLessThanOrEqual(500);
  });
});

describe("reconcileQueue / mergeQueue", () => {
  it("เอารายที่มีคนรับทราบแล้วออกจากคิว", () => {
    expect(reconcileQueue([a("1"), a("22")], [a("22")]).map((x) => x.id)).toEqual(["22"]);
    expect(reconcileQueue([a("1")], [])).toEqual([]);
  });
  it("ไม่ใส่รายซ้ำในคิว", () => {
    expect(mergeQueue([a("1")], [a("1"), a("22")]).map((x) => x.id)).toEqual(["1", "22"]);
  });
});

describe("parseState", () => {
  it("ค่าที่เก็บไว้ถูกต้อง", () => expect(parseState(JSON.stringify({ baselined: true, seen: ["a", 1, "b"] }))).toEqual({ baselined: true, seen: ["a", "b"] }));
  it("ว่าง/เสียหาย/ผิดรูปแบบ = เริ่มใหม่", () => {
    for (const raw of [null, "", "{", "[]", '{"baselined":false,"seen":[]}', '{"baselined":true,"seen":"x"}']) expect(parseState(raw)).toEqual(EMPTY_STATE);
  });
});

describe("parseAlerts", () => {
  it("รูปแบบถูกต้อง", () => expect(parseAlerts({ alerts: [a("1")] })).toHaveLength(1));
  it("รูปแบบผิด = null (ถือว่าถามไม่สำเร็จ ไม่ทำให้หน้าล้ม)", () => {
    expect(parseAlerts(null)).toBeNull();
    expect(parseAlerts({})).toBeNull();
    expect(parseAlerts({ alerts: [{ id: 1 }] })).toBeNull();
  });
});
