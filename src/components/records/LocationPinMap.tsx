"use client";

// แผนที่ปักหมุดบ้านผู้ป่วย (Leaflet + ภาพแผนที่ OpenStreetMap)
// แตะบนแผนที่เพื่อปักหมุด ลากหมุดเพื่อขยับ หรือเลื่อนแผนที่แล้วกด "ปักหมุดที่กลางแผนที่" (ใช้กับคีย์บอร์ดได้)
// Leaflet อ้าง window ตั้งแต่ import จึงโหลดใน useEffect เท่านั้น
import "leaflet/dist/leaflet.css";
import "./location-pin.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { SECONDARY_BUTTON } from "@/components/forms/fields";
import { addOsmTiles, HOUSE_ZOOM, housePinIcon } from "./osm-map";

export type LatLng = { latitude: number; longitude: number };

type Props = {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  /** id ของข้อความผิดพลาดใต้แผนที่ (ถ้ามี) */
  describedBy?: string;
};

/** มุมมองเริ่มต้นเมื่อยังไม่มีหมุด: ทั้งประเทศไทย ผู้ใช้เลื่อนเข้าไปหาบ้านเอง หรือกด "ไปที่ตำแหน่งของฉัน" */
const DEFAULT_VIEW = { center: [13.0, 101.0] as [number, number], zoom: 6 };
const PIN_ZOOM = HOUSE_ZOOM;
/** ต่ำกว่าระดับนี้ หมุดหนึ่งพิกเซลคลาดหลายสิบเมตร จึงซูมเข้าหาหมุดให้ผู้ใช้ขยับต่อ */
const MIN_PRECISE_ZOOM = 16;

/** ปัดเป็นทศนิยม 6 ตำแหน่ง (ราว 10 ซม.) ละเอียดเกินพอสำหรับหาบ้าน */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function zoomInIfCoarse(map: Leaflet.Map | null, at: Leaflet.LatLng) {
  if (map && map.getZoom() < MIN_PRECISE_ZOOM) map.setView(at, PIN_ZOOM);
}

type LocateState = { kind: "idle" } | { kind: "locating" } | { kind: "error"; message: string };

export default function LocationPinMap({ value, onChange, describedBy }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const [ready, setReady] = useState(false);
  const [locate, setLocate] = useState<LocateState>({ kind: "idle" });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // สร้างแผนที่ครั้งเดียว
  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (cancelled || !containerRef.current) return;
      const start = initialValueRef.current;
      map = L.map(containerRef.current, {
        center: start ? [start.latitude, start.longitude] : DEFAULT_VIEW.center,
        zoom: start ? PIN_ZOOM : DEFAULT_VIEW.zoom,
      });
      addOsmTiles(L, map);
      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        onChangeRef.current({ latitude: round6(e.latlng.lat), longitude: round6(e.latlng.lng) });
        zoomInIfCoarse(map, e.latlng);
      });
      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // ให้หมุดบนแผนที่ตรงกับค่าที่เลือก
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const at: [number, number] = [value.latitude, value.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(at);
      return;
    }
    const marker = L.marker(at, {
      draggable: true,
      keyboard: false, // เลื่อนด้วยคีย์บอร์ดผ่านปุ่ม "ปักหมุดที่กลางแผนที่" แทน
      icon: housePinIcon(L),
    }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onChangeRef.current({ latitude: round6(p.lat), longitude: round6(p.lng) });
    });
    markerRef.current = marker;
  }, [ready, value]);

  function pinAtCenter() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    onChange({ latitude: round6(c.lat), longitude: round6(c.lng) });
    zoomInIfCoarse(map, c);
  }

  function goToMyPosition() {
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setLocate({ kind: "error", message: "อุปกรณ์นี้หาตำแหน่งไม่ได้ ต้องเปิดเว็บผ่าน https เท่านั้น เลื่อนแผนที่หาบ้านเองแทนได้" });
      return;
    }
    setLocate({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], PIN_ZOOM);
        setLocate({ kind: "idle" });
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งในการตั้งค่าเบราว์เซอร์ หรือเลื่อนแผนที่หาบ้านเอง"
            : "หาตำแหน่งปัจจุบันไม่สำเร็จ ลองใหม่อีกครั้ง หรือเลื่อนแผนที่หาบ้านเอง";
        setLocate({ kind: "error", message });
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <div>
      <div className="relative isolate overflow-hidden rounded-[10px] border border-slate-300">
        <div
          ref={containerRef}
          role="application"
          aria-label="แผนที่ปักหมุดบ้านผู้ป่วย แตะบนแผนที่เพื่อปักหมุด หรือใช้ลูกศรเลื่อนแผนที่แล้วกดปุ่มปักหมุดที่กลางแผนที่"
          aria-describedby={describedBy}
          className="h-[min(60vh,480px)] min-h-[320px] w-full bg-slate-100"
        />
        {/* เป้ากลางแผนที่ ใช้คู่กับปุ่ม "ปักหมุดที่กลางแผนที่" */}
        <span aria-hidden="true" className="lp-crosshair pointer-events-none absolute left-1/2 top-1/2 z-[500] size-6 -translate-x-1/2 -translate-y-1/2" />
        {!ready ? (
          <p className="absolute inset-0 z-[600] grid place-items-center text-[14px] text-slate-700">กำลังโหลดแผนที่...</p>
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={pinAtCenter} disabled={!ready} className={SECONDARY_BUTTON}>
          ปักหมุดที่กลางแผนที่
        </button>
        <button type="button" onClick={goToMyPosition} disabled={!ready || locate.kind === "locating"} aria-busy={locate.kind === "locating"} className={SECONDARY_BUTTON}>
          {locate.kind === "locating" ? "กำลังหาตำแหน่ง..." : "ไปที่ตำแหน่งของฉัน"}
        </button>
      </div>
      {locate.kind === "error" ? <p role="status" className="mt-1 text-[13px] text-red-800">{locate.message}</p> : null}
    </div>
  );
}
