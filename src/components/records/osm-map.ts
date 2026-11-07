// ส่วนที่ใช้ร่วมกันของแผนที่ Leaflet + OpenStreetMap (หน้าปักหมุดและแท็บพิกัด)
// รับ L เป็นพารามิเตอร์ ไฟล์นี้จึง import ได้โดยไม่แตะ window (Leaflet ต้องโหลดใน useEffect เท่านั้น)
import type * as Leaflet from "leaflet";

/** ซูมที่เห็นตัวบ้านและซอยชัด */
export const HOUSE_ZOOM = 17;

const PIN_HTML = `<span class="lp-pin"><svg viewBox="0 0 24 32" width="28" height="36" aria-hidden="true">
<path d="M12 31C12 31 2 19.5 2 11.5a10 10 0 0 1 20 0C22 19.5 12 31 12 31Z" fill="var(--color-primary)" stroke="#fff" stroke-width="2"/>
<circle cx="12" cy="11.5" r="3.6" fill="#fff"/></svg></span>`;

/** ภาพแผนที่ OpenStreetMap พร้อมเครดิตตามเงื่อนไขการใช้งาน */
export function addOsmTiles(L: typeof Leaflet, map: Leaflet.Map): void {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    // OSM บล็อกภาพแผนที่ที่ไม่มี Referer ("Access blocked") แต่ทั้งเว็บตั้ง Referrer-Policy: same-origin ไว้
    // จึงส่งเฉพาะ origin ของเว็บให้ภาพแผนที่ ไม่ส่ง path ที่มีรหัสผู้ป่วย
    referrerPolicy: "origin",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
  }).addTo(map);
}

/** หมุดบ้านผู้ป่วย ปลายแหลมอยู่ตรงพิกัด (หน้าตาและอนิเมชันอยู่ใน location-pin.css) */
export function housePinIcon(L: typeof Leaflet): Leaflet.DivIcon {
  return L.divIcon({ html: PIN_HTML, className: "lp-pin-icon", iconSize: [28, 36], iconAnchor: [14, 36] });
}
