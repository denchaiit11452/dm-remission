// ตรรกะ "เด้งเตือนผู้ป่วยวิกฤตรายใหม่" ฝั่งหน้าเว็บ (ฟังก์ชันล้วน ทดสอบได้)
// หลักการ: หน้าเว็บถามรายการ Alert วิกฤตที่ยังไม่รับทราบเป็นระยะ แล้วเด้งเฉพาะรายที่ "ยังไม่เคยเห็นในหน้าจอนี้"

export type CriticalAlertDTO = {
  id: string;
  patientId: string;
  patientName: string;
  hn: string;
  summary: string;
  /** วันที่วัด/ตรวจจริง YYYY-MM-DD */
  measuredDate: string;
  /** เวลาที่ระบบสร้าง Alert (ISO) */
  createdAt: string;
  backdatedDays: number;
  /** ผู้ที่กรอกค่านี้คือผู้ใช้คนที่กำลังดูหน้าจออยู่ (เขาเห็นกล่องยืนยันตอนบันทึกไปแล้ว จึงไม่เด้งซ้ำ) */
  enteredByMe: boolean;
};

export type WatcherState = { baselined: boolean; seen: string[] };

export const EMPTY_STATE: WatcherState = { baselined: false, seen: [] };
export const POLL_INTERVAL_MS = 15_000;
/** ถามไม่สำเร็จติดกันกี่ครั้งจึงแจ้งว่าระบบเด้งเตือนใช้ไม่ได้ (15 วินาที x 4 = ประมาณ 1 นาที) */
export const FAILURES_BEFORE_WARNING = 4;
const MAX_SEEN = 500;
/** จำนวนรายการสูงสุดที่เซิร์ฟเวอร์ส่งให้กล่องเตือน */
export const CRITICAL_LIST_LIMIT = 100;
/** หน้า login ทิ้งเครื่องหมายนี้ไว้ เพื่อให้หน้าแรกหลังเข้าสู่ระบบรู้ว่าต้องสรุปผู้ป่วยวิกฤตให้ดู (ไม่เก็บข้อมูลผู้ป่วย) */
export const LOGIN_PENDING_KEY = "dm.critical.loginPending";

/**
 * รับผลการถามครั้งล่าสุด:
 * - ครั้งแรกของหน้าจอ: จดรายการที่มีอยู่แล้วเป็น "เห็นแล้ว" โดยไม่เด้ง (รายเก่าดูได้จากตัวเลขบนเมนูและหน้าแจ้งเตือน)
 * - ครั้งต่อไป: รายที่ยังไม่เคยเห็น = รายใหม่ เด้งเรียงตามเวลาสร้าง (เก่าสุดก่อน เพื่อไม่ให้ข้ามรายใด)
 */
export function applyPoll(state: WatcherState, incoming: CriticalAlertDTO[]): { state: WatcherState; toShow: CriticalAlertDTO[] } {
  const ids = incoming.map((a) => a.id);
  if (!state.baselined) {
    return { state: { baselined: true, seen: unique(ids).slice(-MAX_SEEN) }, toShow: [] };
  }
  const seen = new Set(state.seen);
  const fresh = incoming.filter((a) => !seen.has(a.id));
  const toShow = fresh.filter((a) => !a.enteredByMe).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { state: { baselined: true, seen: unique([...state.seen, ...ids]).slice(-MAX_SEEN) }, toShow };
}

/**
 * ครั้งแรกหลังเข้าสู่ระบบ: แสดงทุกรายที่ยังไม่รับทราบ รวมรายที่ผู้ใช้กรอกเอง เรียงล่าสุดก่อน
 * และจดทุกรายเป็นเห็นแล้ว เพื่อไม่ให้กล่องเตือนรายใหม่เด้งซ้ำรายเดิม
 */
export function applyLoginPoll(incoming: CriticalAlertDTO[]): { state: WatcherState; toShow: CriticalAlertDTO[] } {
  const toShow = [...incoming].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { state: { baselined: true, seen: unique(incoming.map((a) => a.id)).slice(-MAX_SEEN) }, toShow };
}

/** รายที่มีคนรับทราบไปแล้ว (หายจากรายการ) ให้เอาออกจากคิว และใช้ข้อมูลล่าสุดของรายที่ยังอยู่ */
export function reconcileQueue(queue: CriticalAlertDTO[], incoming: CriticalAlertDTO[]): CriticalAlertDTO[] {
  const latest = new Map(incoming.map((a) => [a.id, a]));
  return queue.flatMap((a) => {
    const now = latest.get(a.id);
    return now ? [now] : [];
  });
}

export function mergeQueue(queue: CriticalAlertDTO[], toShow: CriticalAlertDTO[]): CriticalAlertDTO[] {
  const have = new Set(queue.map((a) => a.id));
  return [...queue, ...toShow.filter((a) => !have.has(a.id))];
}

/** อ่านสถานะที่เก็บไว้ในเบราว์เซอร์ ข้อมูลเสียหาย/ผิดรูปแบบ = เริ่มใหม่ (จะจดรายการที่มีอยู่เป็นเห็นแล้วโดยไม่เด้ง) */
export function parseState(raw: string | null): WatcherState {
  if (!raw) return EMPTY_STATE;
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === "object" && (v as WatcherState).baselined === true && Array.isArray((v as WatcherState).seen)) {
      const seen = (v as WatcherState).seen.filter((x): x is string => typeof x === "string").slice(-MAX_SEEN);
      return { baselined: true, seen };
    }
  } catch {
    /* ข้าม */
  }
  return EMPTY_STATE;
}

/** ตรวจรูปแบบข้อมูลที่ตอบกลับจากเซิร์ฟเวอร์ (ผิดรูปแบบ = ถือว่าถามไม่สำเร็จ) */
export function parseAlerts(body: unknown): CriticalAlertDTO[] | null {
  const list = (body as { alerts?: unknown } | null)?.alerts;
  if (!Array.isArray(list)) return null;
  const out: CriticalAlertDTO[] = [];
  for (const a of list) {
    const r = a as Partial<CriticalAlertDTO>;
    if (typeof r.id !== "string" || typeof r.patientId !== "string" || typeof r.patientName !== "string" || typeof r.hn !== "string" || typeof r.summary !== "string" || typeof r.measuredDate !== "string" || typeof r.createdAt !== "string") return null;
    out.push({ id: r.id, patientId: r.patientId, patientName: r.patientName, hn: r.hn, summary: r.summary, measuredDate: r.measuredDate, createdAt: r.createdAt, backdatedDays: typeof r.backdatedDays === "number" ? r.backdatedDays : 0, enteredByMe: r.enteredByMe === true });
  }
  return out;
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)];
}
