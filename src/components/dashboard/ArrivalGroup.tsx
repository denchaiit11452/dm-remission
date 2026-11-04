"use client";

import type { ReactNode } from "react";
import { useChartArrival } from "./useChartArrival";

/** ครอบแผงที่เป็น server component เพื่อให้แท่ง data-sweep ข้างในเผยตัวเมื่อเลื่อนมาถึง */
export default function ArrivalGroup({ signature, className, children }: { signature: string; className?: string; children: ReactNode }) {
  const rootRef = useChartArrival(signature, { durationMs: 600, staggerMs: 50 });
  return <div ref={rootRef} className={className}>{children}</div>;
}
