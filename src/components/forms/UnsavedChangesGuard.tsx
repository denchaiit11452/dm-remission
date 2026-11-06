"use client";

// กันข้อมูลที่กรอกค้างหายเพราะเผลอกดลิงก์ออกจากหน้า (ยกเลิก, กลับไปรายชื่อ, เมนู)
// ดักเฉพาะลิงก์ภายในแอป ไม่ใช้ beforeunload เพราะจะไปขวางการออกจากระบบอัตโนมัติเมื่อไม่ใช้งาน 30 นาที
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ActionDialog from "./ActionDialog";
import { DANGER_BUTTON, PRIMARY_BUTTON } from "./fields";

type Props = {
  /** มีข้อมูลที่ยังไม่บันทึก */
  when: boolean;
};

/** ลิงก์ที่พาออกจากหน้านี้ภายในแอปเดียวกัน (ไม่นับแท็บใหม่ ไฟล์ดาวน์โหลด หรือการกดค้างปุ่มพิเศษ) */
function leavingHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function UnsavedChangesGuard({ when }: Props) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const whenRef = useRef(when);
  /** ยืนยันทิ้งแล้ว ไม่ถามซ้ำระหว่างกำลังเปลี่ยนหน้า */
  const leavingRef = useRef(false);

  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    whenRef.current = when;
  }, [when]);

  // effect ของ ActionDialog (showModal) ทำงานก่อน effect นี้ จึงโฟกัสได้หลังกล่องเปิดแล้ว
  // ใช้แทน autoFocus เพราะ React โฟกัสตอนกล่องยังไม่เปิด
  useEffect(() => {
    if (pendingHref !== null) keepRef.current?.focus();
  }, [pendingHref]);

  useEffect(() => {
    // ดักในจังหวะ capture ที่ document จึงทำงานก่อน Link ของ Next.js และยกเลิกการเปลี่ยนหน้าได้
    const onClick = (event: MouseEvent) => {
      if (!whenRef.current || leavingRef.current) return;
      const href = leavingHref(event);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const keepEditing = () => setPendingHref(null);
  const discardAndLeave = () => {
    const href = pendingHref;
    leavingRef.current = true;
    setPendingHref(null);
    if (href) router.push(href);
  };

  return (
    <ActionDialog open={pendingHref !== null} title="ข้อมูลที่กรอกยังไม่ได้บันทึก" busy={false} onClose={keepEditing}>
      <p className="text-sm leading-relaxed text-slate-700">ถ้าออกจากหน้านี้ ข้อมูลที่กรอกไว้จะหายทั้งหมด และต้องกรอกใหม่</p>
      {/* ปุ่มที่ปลอดภัยได้โฟกัสก่อน กด Enter หรือ Esc จึงกลับไปกรอกต่อ ไม่ทิ้งข้อมูลโดยไม่ตั้งใจ */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={discardAndLeave} className={DANGER_BUTTON}>ทิ้งข้อมูลและออก</button>
        <button ref={keepRef} type="button" onClick={keepEditing} className={PRIMARY_BUTTON}>กรอกต่อ</button>
      </div>
    </ActionDialog>
  );
}
