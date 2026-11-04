"use client";

import { useEffect, useRef } from "react";

const ARRIVAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
/** ตามเส้นโค้งนี้ เส้นถึงปลายจริงราวครึ่งทาง จุดปลายจึงปรากฏตอนนั้น */
const DOT_ARRIVES_AT_MS = 420;

type Options = {
  /** ลำดับของกลุ่มนี้ ใช้เหลื่อมเวลากับกลุ่มอื่น */
  order?: number;
  durationMs?: number;
  staggerMs?: number;
};

/**
 * เผยกราฟจากซ้ายไปขวาเมื่อเลื่อนมาถึง และเล่นซ้ำเมื่อข้อมูลเปลี่ยนเท่านั้น
 * ใช้กับลูกที่มี data-sweep ส่วน data-arrive และ data-ripple คือจุดปลายเส้นและวงกระจาย
 * ใช้ Web Animations จึงเห็นกราฟครบตามปกติหากสคริปต์ไม่ทำงาน
 * ผู้ที่ตั้งค่าลดการเคลื่อนไหวจะเห็นการค่อยๆ ปรากฏสั้นๆ แทน
 */
export function useChartArrival(signature: string, { order = 0, durationMs = 800, staggerMs = 70 }: Options = {}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const delay = order * staggerMs;
    const sweeps = [...root.querySelectorAll("[data-sweep]")];

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations = reduced
      ? sweeps.map((element) => element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "backwards" }))
      : [
          ...sweeps.map((element, index) =>
            element.animate(
              [{ clipPath: "inset(-8px 100% -8px -8px)" }, { clipPath: "inset(-8px -8px -8px -8px)" }],
              { duration: durationMs, delay: delay + index * staggerMs, easing: ARRIVAL_EASE, fill: "backwards" },
            ),
          ),
          ...[...root.querySelectorAll("[data-arrive]")].map((dot) =>
            dot.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
              duration: 240,
              delay: delay + DOT_ARRIVES_AT_MS,
              easing: ARRIVAL_EASE,
              fill: "backwards",
            }),
          ),
          // วงกระจายครั้งเดียวที่ปลายเส้น เพื่อบอกว่าค่าล่าสุดอยู่ตรงนี้ ไม่วนซ้ำ
          ...[...root.querySelectorAll("[data-ripple]")].map((ring) =>
            ring.animate(
              [{ transform: "scale(1)", opacity: 0.5 }, { transform: "scale(3.5)", opacity: 0 }],
              { duration: 700, delay: delay + DOT_ARRIVES_AT_MS + 120, easing: "ease-out" },
            ),
          ),
        ];

    animations.forEach((animation) => animation.pause());
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animations.forEach((animation) => animation.play());
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(root);

    // สั่งพิมพ์ก่อนเลื่อนมาถึงกราฟ ต้องไม่ได้กราฟที่ยังไม่มีเส้น
    const finishForPrint = () => animations.forEach((animation) => animation.finish());
    window.addEventListener("beforeprint", finishForPrint);

    return () => {
      window.removeEventListener("beforeprint", finishForPrint);
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [signature, order, durationMs, staggerMs]);

  return rootRef;
}
