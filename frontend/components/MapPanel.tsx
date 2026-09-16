"use client";

import dynamic from "next/dynamic";
import type { HexagonCollection } from "@/lib/types";

const CongestionMap = dynamic(() => import("./CongestionMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-sand-100 text-stone-500 text-sm">
      Loading map&hellip;
    </div>
  ),
});

export default function MapPanel({
  hexagons,
  center,
  mapKey
}: {
  hexagons: HexagonCollection;
  center: [number, number];
  mapKey: string
}) {
  return <CongestionMap hexagons={hexagons} center={center} mapKey={mapKey} />;
}
