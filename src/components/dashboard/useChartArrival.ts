"use client";

import { useEffect, useRef } from "react";

const ARRIVAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
/** ตามเส้นโค้งนี้ เส้นถึงปลายจริงราวครึ่งทาง จุดปลายจึงปรากฏตอนนั้น */
const DOT_ARRIVES_AT_MS = 420;

const REDUCED_FADE_MS = 400;
const SETTLE_MS = 450;

type Options = {
  /** ลำดับของกลุ่มนี้ ใช้เหลื่อมเวลากับกลุ่มอื่น */
  order?: number;
  durationMs?: number;
  staggerMs?: number;
  easing?: string;
};

/**
 * ส่วนข้อมูลเก่าเริ่มเป็นสีเต็ม แล้วจางลงถึงค่าที่ตั้งไว้ในองค์ประกอบ
 * เพื่อสื่อว่าระดับไม่เปลี่ยน แต่ความมั่นใจลดลง เป็นการเปลี่ยนสีจึงเล่นในทุกโหมด
 */
function settleStale(sweep: Element, delay: number): Animation[] {
  return [...sweep.querySelectorAll("[data-settle]")].map((segment) => {
    const opacity = getComputedStyle(segment).opacity;
    return segment.animate([{ opacity: 1 }, { opacity }], { duration: SETTLE_MS, delay, easing: "ease-out", fill: "backwards" });
  });
}

/** ตัวเลขที่ปลายแท่งวิ่งไปพร้อมแท่ง ค่าที่แสดงเป็นค่าจริงตลอด ไม่มีการนับขึ้น */
function rideWithSweep(sweep: Element, timing: KeyframeAnimationOptions): Animation[] {
  const tip = sweep.nextElementSibling;
  if (!tip?.hasAttribute("data-tip")) return [];
  const distance = sweep.getBoundingClientRect().width;
  return [tip.animate([{ transform: `translateX(${-distance}px)` }, { transform: "translateX(0)" }], timing)];
}

/**
 * เผยกราฟจากซ้ายไปขวาเมื่อเลื่อนมาถึง และเล่นซ้ำเมื่อข้อมูลเปลี่ยนเท่านั้น
 * ใช้กับลูกที่มี data-sweep ส่วน data-arrive และ data-ripple คือจุดปลายเส้นและวงกระจาย
 * data-tip คือตัวเลขถัดจากแท่ง และ data-settle คือส่วนข้อมูลเก่าในแท่ง
 * ใช้ Web Animations จึงเห็นกราฟครบตามปกติหากสคริปต์ไม่ทำงาน
 * ผู้ที่ตั้งค่าลดการเคลื่อนไหวจะเห็นการค่อยๆ ปรากฏทีละส่วนโดยไม่มีการเคลื่อนที่แทน
 */
export function useChartArrival(signature: string, { order = 0, durationMs = 800, staggerMs = 70, easing = ARRIVAL_EASE }: Options = {}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const delay = order * staggerMs;
    const sweeps = [...root.querySelectorAll("[data-sweep]")];

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations = reduced
      ? sweeps.flatMap((element, index) => {
          const start = delay + index * staggerMs;
          return [
            element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FADE_MS, delay: start, easing: "ease-out", fill: "backwards" }),
            ...settleStale(element, start + REDUCED_FADE_MS),
          ];
        })
      : [
          ...sweeps.flatMap((element, index) => {
            const timing = { duration: durationMs, delay: delay + index * staggerMs, easing, fill: "backwards" } as const;
            // แท่งที่มีตัวเลขวิ่งตาม เผยแค่ถึงขอบแท่ง ระยะห่างกับตัวเลขจึงคงที่ ส่วนเส้นกราฟเผื่อที่ให้ปลายเส้น
            const rightEnd = element.nextElementSibling?.hasAttribute("data-tip") ? "0px" : "-8px";
            return [
              element.animate([{ clipPath: "inset(-8px 100% -8px -8px)" }, { clipPath: `inset(-8px ${rightEnd} -8px -8px)` }], timing),
              ...rideWithSweep(element, timing),
              ...settleStale(element, timing.delay + durationMs / 2),
            ];
          }),
          ...[...root.querySelectorAll("[data-arrive]")].map((dot) =>
            dot.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], {
              duration: 240,
              delay: delay + DOT_ARRIVES_AT_MS,
              easing,
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
  }, [signature, order, durationMs, staggerMs, easing]);

  return rootRef;
}
