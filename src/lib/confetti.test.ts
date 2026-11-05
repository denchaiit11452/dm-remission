import { describe, expect, it } from "vitest";
import { buildConfetti } from "./confetti";

describe("buildConfetti", () => {
  it("seed เดิมได้ผลเดิม จึงไม่เปลี่ยนทุกครั้งที่ render", () => {
    expect(buildConfetti(20, 7)).toEqual(buildConfetti(20, 7));
    expect(buildConfetti(20, 7)).not.toEqual(buildConfetti(20, 8));
  });

  it("กระจายครบทั้งซ้ายขวาบนล่าง ไม่กระจุกด้านเดียว", () => {
    const pieces = buildConfetti(48, 1);
    expect(pieces).toHaveLength(48);
    expect(pieces.some((p) => p.xVw < -10)).toBe(true);
    expect(pieces.some((p) => p.xVw > 10)).toBe(true);
    expect(pieces.some((p) => p.yVh < -10)).toBe(true);
    expect(pieces.some((p) => p.yVh > 10)).toBe(true);
  });

  it("ไม่ใช้สีที่สงวนไว้บอกระดับความเสี่ยง", () => {
    const riskColors = ["#991b1b", "#dc2626", "#ea580c", "#d97706", "#15803d"];
    for (const piece of buildConfetti(200, 3)) expect(riskColors).not.toContain(piece.color);
  });

  it("อยู่ในขอบเขตจอ และร่วงจบก่อน popup ปิดที่ 6 วินาที", () => {
    for (const piece of buildConfetti(200, 5)) {
      expect(Math.abs(piece.xVw)).toBeLessThanOrEqual(50);
      expect(Math.abs(piece.yVh)).toBeLessThanOrEqual(50);
      expect(piece.delayMs + piece.durationMs).toBeLessThan(5000);
    }
  });
});
