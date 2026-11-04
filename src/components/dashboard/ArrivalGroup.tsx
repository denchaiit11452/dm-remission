"use client";

import type { ReactNode } from "react";
import { useChartArrival } from "./useChartArrival";

type Props = {
  signature: string;
  className?: string;
  durationMs?: number;
  staggerMs?: number;
  easing?: string;
  children: ReactNode;
};

/** ครอบแผงที่เป็น server component เพื่อให้แท่ง data-sweep ข้างในเผยตัวเมื่อเลื่อนมาถึง */
export default function ArrivalGroup({ signature, className, durationMs = 600, staggerMs = 50, easing, children }: Props) {
  const rootRef = useChartArrival(signature, { durationMs, staggerMs, easing });
  return <div ref={rootRef} className={className}>{children}</div>;
}
