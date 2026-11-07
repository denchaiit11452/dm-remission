"use client";

// แผนที่ดูพิกัดบ้านผู้ป่วยในแท็บพิกัด (ดูอย่างเดียว หมุดลากไม่ได้ แก้ไขที่หน้าปักหมุด)
// Leaflet อ้าง window ตั้งแต่ import จึงโหลดใน useEffect เท่านั้น
import "leaflet/dist/leaflet.css";
import "@/components/records/location-pin.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { addOsmTiles, HOUSE_ZOOM, housePinIcon } from "@/components/records/osm-map";
import { toDms } from "@/lib/patient-overview";

type Props = { latitude: number; longitude: number };

export default function LocationViewMap({ latitude, longitude }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, {
        center: [latitude, longitude],
        zoom: HOUSE_ZOOM,
        scrollWheelZoom: false, // ไม่ดักการเลื่อนหน้า ซูมด้วยปุ่ม +/− หรือสองนิ้วแทน
      });
      addOsmTiles(L, map);
      L.marker([latitude, longitude], { icon: housePinIcon(L), keyboard: false, interactive: false }).addTo(map);
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      setReady(true);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [latitude, longitude]);

  return (
    <figure className="relative isolate overflow-hidden rounded-[10px] border border-slate-200">
      <div
        ref={containerRef}
        role="region"
        aria-label={`แผนที่บ้านผู้ป่วย ละติจูด ${latitude.toFixed(6)} ลองจิจูด ${longitude.toFixed(6)}`}
        className="aspect-[3/2] min-h-[320px] w-full bg-slate-100"
      />
      {!ready ? <p className="absolute inset-0 z-[600] grid place-items-center text-[14px] text-slate-700">กำลังโหลดแผนที่...</p> : null}
      <figcaption className="absolute right-2.5 top-2.5 z-[500] rounded-md bg-white/90 px-2.5 py-1.5 text-right text-[12.5px] leading-snug tabular-nums text-slate-900 shadow-sm">
        {toDms(latitude, "lat")}
        <br />
        {toDms(longitude, "lng")}
      </figcaption>
    </figure>
  );
}
