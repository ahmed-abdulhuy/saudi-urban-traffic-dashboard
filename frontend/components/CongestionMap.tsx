"use client";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css"
import type { HexagonCollection, HexagonFeature } from "@/lib/types";
import { LEVEL_LABEL } from "@/lib/format";

export default function CongestionMap({
  hexagons,
  center, 
}: {
  hexagons: HexagonCollection;
  center: [number, number]; // [lon, lat]
}) {
  const [lon, lat] = center;

  function styleFeature(feature?: HexagonFeature) {
    const level = feature?.properties.congestion_level ?? "no_data";
    return {
      fillColor: feature?.properties.color ?? "rgb(184,176,160)",
      fillOpacity: level === "no_data" ? 0.15 : 0.50,
      color: "#211F1A",
      weight: 0.5,
      opacity: 0.35,
    };
  }

  function onEachFeature(feature: HexagonFeature, layer: Layer) {
    const p = feature.properties;
    layer.bindPopup(
      `<div class="text-sm">
         <div class="font-medium">${LEVEL_LABEL[p.congestion_level]}</div>
         <div>Score: ${p.congestion_score.toFixed(3)}</div>
         <div>Road pixels sampled: ${p.road_pixel_count.toLocaleString()}</div>
       </div>`,
      { className: "hex-popup" }
    );
    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        (e.target as any).setStyle({ weight: 1.5, opacity: 0.8 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        (e.target as any).setStyle({ weight: 0.5, opacity: 0.35 });
      },
    });
  }

  return (
    <MapContainer
      center={[lat, lon]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
      attributionControl={true}
    >
      <TileLayer
        url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${process.env.CARTOCDN_KEY}`}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <GeoJSON
        data={hexagons as GeoJSON.FeatureCollection}
        style={styleFeature as any}
        onEachFeature={onEachFeature as any}
      />
    </MapContainer>
  );
}
