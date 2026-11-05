// คำนวณกระดาษสีของ popup ฉลอง (ฟังก์ชันล้วน ทดสอบได้ ค่า seed เดิมได้ผลเดิม)

export type ConfettiShape = "paper" | "dot" | "plus";

export type ConfettiPiece = {
  shape: ConfettiShape;
  color: string;
  /** ขนาดเป็น px */
  size: number;
  /** จุดที่แตกไปถึงก่อนเริ่มร่วง ใช้เป็นตำแหน่งนิ่งเมื่อเครื่องปิดอนิเมชันด้วย */
  xVw: number;
  yVh: number;
  /** ลอยออกด้านข้างระหว่างร่วง */
  driftVw: number;
  spinDeg: number;
  delayMs: number;
  durationMs: number;
};

/** เฉดเขียวหัวเป็ดกับเหลืองอ่อน ไม่ใช้แดง ส้ม อำพัน และเขียวที่สงวนไว้บอกระดับความเสี่ยง */
const COLORS = ["#115e59", "#14b8a6", "#5eead4", "#99f6e4", "#fde68a"] as const;
const SHAPES: readonly ConfettiShape[] = ["paper", "paper", "dot", "plus"];

/** ระลอกสองตามหลังระลอกแรกเล็กน้อย ให้รู้สึกเหมือนแตกต่อเนื่อง */
const SECOND_WAVE_DELAY_MS = 220;

/** ตัวสุ่มที่กำหนด seed ได้ (mulberry32) จึงเรียกจาก render ได้โดยผลไม่เปลี่ยนทุกครั้งที่ render */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildConfetti(count: number, seed: number): ConfettiPiece[] {
  const random = seededRandom(seed);
  const between = (min: number, max: number) => min + random() * (max - min);

  return Array.from({ length: count }, (_, index) => {
    // กระจายมุมให้ทั่วก่อนค่อยสุ่มเล็กน้อย กระดาษจึงไม่กระจุกอยู่ด้านเดียว
    const angle = (index / count) * Math.PI * 2 + between(-0.2, 0.2);
    const reach = between(0.55, 1);
    const shape = SHAPES[Math.floor(random() * SHAPES.length)];
    return {
      shape,
      color: COLORS[Math.floor(random() * COLORS.length)],
      size: shape === "plus" ? between(18, 28) : between(11, 18),
      xVw: Math.cos(angle) * reach * 46,
      yVh: Math.sin(angle) * reach * 42,
      driftVw: between(-6, 6),
      spinDeg: between(-300, 300),
      delayMs: between(0, 100) + (index % 2 === 0 ? 0 : SECOND_WAVE_DELAY_MS),
      durationMs: between(1700, 2600),
    };
  });
}
