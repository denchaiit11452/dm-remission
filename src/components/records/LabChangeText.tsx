import type { LabChange } from "@/lib/lab-summary";

const ARROWS: Record<"up" | "down", string> = { up: "M8 13V3M4 7l4-4 4 4", down: "M8 3v10M4 9l4 4 4-4" };
const WORDS: Record<LabChange["direction"], string> = { up: "เพิ่มขึ้น", down: "ลดลง", same: "เท่าเดิม" };

/**
 * การเปลี่ยนจากผลครั้งก่อน: บอกทิศทางด้วยลูกศรและตัวเลขในสีกลาง
 * ไม่ใช้สีเขียวหรือแดง เพราะการตีความว่าดีหรือแย่เป็นการตัดสินทางคลินิก
 */
export default function LabChangeText({ change }: { change: LabChange }) {
  const { direction, amount, label } = change;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
      {label ? <span>{label}</span> : null}
      {direction === "same" ? (
        <span>เท่าเดิม</span>
      ) : (
        <>
          <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ARROWS[direction]} />
          </svg>
          <span className="sr-only">{WORDS[direction]} </span>
          <span>{amount}</span>
        </>
      )}
    </span>
  );
}
