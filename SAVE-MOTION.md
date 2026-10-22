# การเคลื่อนไหวหลังกดบันทึกค่าน้ำตาล DTX

สเปกสำหรับนำไปใช้ตอนเขียนหน้า `บันทึกน้ำตาล DTX` (ดูภาพใน Figma: D3-4, D3-5, D3-6 และแผน "การเคลื่อนไหวหลังกดบันทึก")

**หน้าที่ของการเคลื่อนไหว:** ยืนยันว่า "บันทึกแล้ว" และชี้ว่าอะไรบนหน้าเปลี่ยนไป ไม่ใช้เพื่อความสวยงาม

**กติกา**
- ใช้เฉพาะ `transform`, `opacity` และสี ห้าม animate `width` / `height` / `top` / `left` / margin
- Toast ลอยทับ (`position: fixed`) ไม่ดันเนื้อหา
- ผู้ใช้ทำงานต่อได้ทันที ไม่ล็อกหน้าระหว่างเล่นการเคลื่อนไหว
- เนื้อหาต้องมองเห็นในสถานะเริ่มต้น (ไม่ซ่อนไว้รอสคริปต์)

## ค่าที่ใช้

```css
:root {
  --dur-press: 100ms;
  --dur-state: 150ms;
  --dur-enter: 300ms;
  --dur-exit: 150ms;
  --dur-check: 250ms;
  --dur-highlight-hold: 1000ms;
  --dur-highlight-fade: 500ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* ขาเข้า */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);       /* ขาออก (เร็วกว่าขาเข้า) */
}
```

## ลำดับเวลา (สมมติระบบตอบกลับสำเร็จที่ 300 ms)

| เวลา | เหตุการณ์ |
|---|---|
| 0 ms | กดปุ่ม: ย่อ `scale(0.98)` 100 ms เข้าสถานะ "กำลังบันทึก" (spinner, ปิดทุกปุ่มและ Esc) แสดงอย่างน้อย 300 ms กันภาพกะพริบ |
| 300 ms | ตอบกลับสำเร็จ: กล่องยืนยันปิด (opacity + เลื่อนลง 8 px, 150 ms, `ease-in`) |
| 400 ms | Toast "บันทึกสำเร็จ" เข้า (เลื่อนลง 12 px → 0 + opacity, 300 ms, `ease-out`) ค้างจนผู้ใช้ปิดหรือออกจากหน้า |
| 450 ms | เครื่องหมาย "บันทึกแล้ว" ที่ช่องวาดขึ้น 250 ms พื้นชิปเขียวอ่อนจางใน 1.2 วินาที |
| 500 ms | ตัวเลข Alert บนเมนู 3 → 4 (crossfade 200 ms + วงแดงขยายแล้วจาง 600 ms) ไฮไลต์ค่าที่เปลี่ยนอยู่ 1 วินาทีแล้วจาง 500 ms |
| ถาวร | แผน "สิ่งที่เปลี่ยนจากการบันทึกนี้" และป้าย "เปลี่ยน / ไม่เปลี่ยน" อยู่ต่อ ให้ตรวจย้อนหลังได้หลังไฮไลต์จางไปแล้ว |

## คีย์เฟรม

```css
@keyframes toast-in {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes dialog-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(8px); }
}
/* เส้นเช็กถูก: ตั้ง stroke-dasharray / pathLength="1" ที่ path */
@keyframes check-draw {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
@keyframes highlight-fade {
  0%, 67% { background-color: var(--highlight, #ccfbf1); }   /* ค้าง 1 วินาที */
  100%    { background-color: transparent; }                  /* จางใน 0.5 วินาที */
}
@keyframes alert-halo {
  from { box-shadow: 0 0 0 0 rgb(220 38 38 / 0.45); }
  to   { box-shadow: 0 0 0 8px rgb(220 38 38 / 0); }
}
@keyframes spin { to { transform: rotate(360deg); } }

.toast[data-state="enter"]   { animation: toast-in var(--dur-enter) var(--ease-out) both; }
.dialog[data-state="exit"]   { animation: dialog-out var(--dur-exit) var(--ease-in) both; }
.saved-check path            { stroke-dasharray: 1; animation: check-draw var(--dur-check) var(--ease-out) 150ms both; }
.changed-mark                { animation: highlight-fade 1500ms linear both; }
.alert-count[data-bumped]    { animation: alert-halo 600ms var(--ease-out) 1; }
.btn-saving .spinner         { animation: spin 800ms linear infinite; }
```

## ลดการเคลื่อนไหว (`prefers-reduced-motion`)

ลดการเคลื่อนที่ ไม่ใช่ปิดการแจ้ง สีไฮไลต์ ป้าย "เปลี่ยน" และข้อความยังอยู่ครบ

```css
@media (prefers-reduced-motion: reduce) {
  .toast[data-state="enter"] { animation: fade-in 150ms linear both; }
  .dialog[data-state="exit"] { animation: fade-out 100ms linear both; }
  .saved-check path          { animation: none; stroke-dashoffset: 0; }
  .alert-count[data-bumped]  { animation: none; }   /* เหลือ crossfade ตัวเลขอย่างเดียว */
  .btn-saving .spinner       { animation: none; }   /* ข้อความ "กำลังบันทึก..." ยังแสดง */
  .btn:active                { transform: none; }
}
@keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
```

## พฤติกรรมที่ต้องทำในโค้ด

1. **สถานะ:** `idle → saving → saved` (หรือ `saving → error`) ใช้ state เดียว ไม่ซ้อนหลายตัวแปร
2. **ขณะ `saving`:** ปิดปุ่มทุกปุ่ม ปิด Esc และการคลิกนอกกล่อง ป้องกันกดซ้ำจนบันทึกซ้อน
3. **ประกาศให้โปรแกรมอ่านหน้าจอ:** region `role="status"` (`aria-live="polite"`) อ่านว่า "บันทึกสำเร็จ 2 ค่า สร้าง Alert 1 รายการ ระดับปัจจุบันไม่เปลี่ยน" ไม่พึ่งภาพอย่างเดียว
4. **โฟกัส:** เมื่อกล่องยืนยันปิดหลังบันทึกสำเร็จ ให้คืนโฟกัสไปที่ปุ่ม "กลับไปโปรไฟล์"
5. **บันทึกไม่สำเร็จ:** ไม่มีเอฟเฟกต์เช็กถูก กล่องปิด ข้อมูลที่กรอกไว้ยังอยู่ ขึ้นข้อความสีแดงพร้อมปุ่ม "ลองใหม่" ไม่ใช้การสั่นของช่อง
6. **ผู้ใช้กดซ้ำหรือออกจากหน้า:** ยกเลิก animation ที่ค้างอยู่ได้ทันที (ใช้ `animation-fill-mode: both` และไม่พึ่ง timer ที่แก้ state ภายหลัง)
7. **มือถือ:** แผ่นล่างเลื่อนลงออก 200 ms (`translateY(100%)`) แทนการจาง และ toast อยู่เหนือ safe area ด้านบน
8. **ประสิทธิภาพ:** ทั้งหมดใช้ transform / opacity / สี จึงเหมาะกับแท็บเล็ตและมือถือที่ใช้ตอนเยี่ยมบ้าน ใส่ `will-change` เฉพาะช่วงที่กำลังเล่นเท่านั้น
