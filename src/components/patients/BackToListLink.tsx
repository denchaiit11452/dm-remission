import Link from "next/link";
import "./back-to-list.css";

/** ลูกศรชี้ซ้ายในวงกลมสีเขียวหัวเป็ด */
function ArrowBadge() {
  return (
    <span aria-hidden="true" className="back-list-badge inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-800 text-white">
      <svg viewBox="0 0 24 24" className="back-list-arrow size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H6" />
        <path d="M11 6l-6 6 6 6" />
      </svg>
    </span>
  );
}

/** รายการสามแถว แทนหน้ารายชื่อผู้ป่วยปลายทาง */
function ListGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-teal-700" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <g className="back-list-row"><circle cx="4.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" /><path d="M8.5 6.5H20" /></g>
      <g className="back-list-row"><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><path d="M8.5 12H20" /></g>
      <g className="back-list-row"><circle cx="4.5" cy="17.5" r="1.1" fill="currentColor" stroke="none" /><path d="M8.5 17.5H16" /></g>
    </svg>
  );
}

/** ปุ่มกลับไปหน้ารายชื่อผู้ป่วย ใช้ร่วมกันระหว่างหน้าเพิ่มผู้ป่วยและหน้าโปรไฟล์ */
export default function BackToListLink() {
  return (
    <Link
      href="/patients"
      className="back-list inline-flex min-h-11 items-center gap-2.5 self-start rounded-full border border-teal-200 bg-teal-50 py-1.5 pl-1.5 pr-4 text-sm font-medium text-teal-900 hover:border-teal-300 hover:bg-teal-100 hover:shadow-[0_2px_8px_-2px_rgba(17,94,89,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      <ArrowBadge />
      <span>กลับไปรายชื่อผู้ป่วย</span>
      <ListGlyph />
    </Link>
  );
}
