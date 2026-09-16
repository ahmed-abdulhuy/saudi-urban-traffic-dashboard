"use client";
import { useMemo, useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Lock, Layers, Plus, Minus, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISTRICTS } from "@/data/mockData";
import maplibregl, { Map } from "maplibre-gl";

interface MapViewerProps {
  city_name: string;
  cords: [number, number];

  // Called when a hexagon is selected
  onAreaSelect?: (properties: Record<string, unknown>) => void;
}

type LayerKey = "grid" | "incidents" | "arterials" | "boundaries";
type LayersState = Record<LayerKey, boolean>;
interface Hex {
  q: number;
  r: number;
  cx: number;
  cy: number;
  v: number;
}
interface DistrictMarker {
  id: string | number;
  en: string;
  ar: string;
  x: number;
  y: number;
}
interface IncidentMarker {
  x: number;
  y: number;
  t: string;
}
interface CongestionColor {
  fill: string;
  glow: string;
}
interface HexagonMapProps {
  search?: string;
  city_name: string;
  cords: [number, number];

  // Called when a hexagon is selected
  onAreaSelect?: (properties: Record<string, unknown>) => void;

}

// Static hexagon grid (period-invariant per spec)
// Generate a stable pseudo-random congestion pattern seeded by hex coords
const hexRandom = (q: number, r: number): number => {
  const x = Math.sin(q * 999 + r * 37) * 43758.5453;
  return x - Math.floor(x);
};
const congestionColor = (v: number): CongestionColor => {
  if (v < 26) {
    return { fill: "hsl(160 70% 45%)", glow: "rgba(16,185,129,0.35)" };
  }
  if (v < 51) {
    return { fill: "hsl(45 92% 55%)", glow: "rgba(245,158,11,0.35)" };
  }
  if (v < 76) {
    return { fill: "hsl(20 90% 55%)", glow: "rgba(239,68,68,0.4)" };
  }
  return { fill: "hsl(0 70% 45%)", glow: "rgba(153,27,27,0.5)" };
};
// Hex geometry (flat-top)
const HEX_SIZE = 14;
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = 2 * HEX_SIZE;
const hexPath = (cx: number, cy: number, s: number): string => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    points.push(`${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`);
  }
  return `M${points.join(" L")} Z`;
};

// City-shape mask — approximation of Riyadh urban footprint
const inRiyadhShape = (
  cx: number,
  cy: number,
  w: number,
  h: number,
): boolean => {
  const nx = (cx - w / 2) / (w / 2);
  const ny = (cy - h / 2) / (h / 2);
  // Rounded blob with a slight north-south stretch
  // and a bite on the west (wadi Hanifa)
  const r = Math.sqrt(nx * nx + ny * 0.85 * (ny * 0.85));
  const wadiBite = nx < -0.35 && Math.abs(ny) < 0.35 ? 0.15 : 0;
  return r < 0.92 - wadiBite;
};
const DISTRICT_MARKERS: DistrictMarker[] = DISTRICTS.slice(0, 8).map(
  (district, index) => ({
    ...district,
    x: 0.3 + 0.45 * (((index * 137) % 100) / 100),
    y: 0.2 + 0.6 * (((index * 233) % 100) / 100),
  }),
);
const INCIDENT_MARKERS: IncidentMarker[] = [
  { x: 0.45, y: 0.28, t: "Accident" },
  { x: 0.62, y: 0.58, t: "Roadwork" },
  { x: 0.35, y: 0.72, t: "Hazard" },
];
const INITIAL_LAYERS: LayersState = {
  grid: true,
  incidents: true,
  arterials: true,
  boundaries: true,
};

export function HexagonMapV2({ search = "", city_name, cords, onAreaSelect }: HexagonMapProps & MapViewerProps) {
  const [layers, setLayers] = useState<LayersState>(INITIAL_LAYERS);
  const [zoom, setZoom] = useState<number>(1);
  const [hovered, setHovered] = useState<Hex | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: cords,
      zoom: 14,
      // attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");
     
    try {
      map.on("load", async () => {

        const response = await fetch(
            `http://localhost:8000/city/${city_name}/traffic/latest/hexagons`,
          );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch GeoJSON: ${response.status} ${response.statusText}`,
          );
        }
          
        const geoJson = await response.json();
          
        map.addSource("traffic-hex", {
          type: "geojson",
          data: geoJson,
        });
        map.addLayer({
          id: "traffic-hex",
          type: "fill",
          source: "traffic-hex",
          paint: {
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "congestion_score"],

              0.005,
              "#777777",
              0.405,
              "#FF2323",
              0.9,
              "#FFFF37",
              1.0,
              "#2BC82B",
            ],

            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11, 0.35,
              14, 0.50,
              17, 0.65,
            ],
          },
        });

        map.addLayer({
          id: "traffic-hex-outline",
          type: "line",
          source: "traffic-hex",
          paint: {
            "line-color": "rgba(255,255,255,0.25)",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0.25,
              14,
              0.5,
              18,
              0.75,
            ],
          },
        });

        /*
         * Selected hexagon.
         *
         * Initially nothing is selected.
         */
        map.addLayer({
          id: "traffic-hex-selected",
          type: "line",
          source: "traffic-hex",

          filter: [
            "==",
            ["get", "_selected"],
            true,
          ],

          paint: {
            "line-color": "#ffffff",
            "line-width": 3,
          },
        });

        /*
         * Cursor interaction.
         */
        map.on("mouseenter", "traffic-hex", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "traffic-hex", () => {
          map.getCanvas().style.cursor = "";
        });

        /*
         * Hover tooltip.
         */
        map.on("mousemove", "traffic-hex", (event) => {
          const feature = event.features?.[0];

          if (!feature) {
            return;
          }

                    const properties = feature.properties ?? {};

          const congestion =
            properties.congestion_score.toFixed(2) ??
            "N/A";

          const level =
            properties.congestion_level ??
            "N/A";

          const html = `
            <div style="
              min-width: 160px;
              font-family: sans-serif;
            ">
              <div style="
                font-weight: 600;
                margin-bottom: 8px;
              ">
                Congestion Area
              </div>

              <div style="
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
              ">
                <span>Index</span>
                <strong>${congestion}</strong>
              </div>

              <div style="
                display: flex;
                justify-content: space-between;
              ">
                <span>Level</span>
                <strong>${level}</strong>
              </div>

              <div style="
                margin-top: 8px;
                font-size: 11px;
                color: #666;
              ">
                Click for details
              </div>
            </div>
          `;

          if (!popupRef.current) {
            popupRef.current = new maplibregl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 10,
            });
          }

          popupRef.current
            .setLngLat(event.lngLat)
            .setHTML(html)
            .addTo(map);
        });

        /*
         * Remove tooltip when leaving the map.
         */
        map.on("mouseleave", "traffic-hex", () => {
          popupRef.current?.remove();
        });

        /*
         * Click a congestion area.
         */
        map.on("click", "traffic-hex", (event) => {
          const feature = event.features?.[0];

          if (!feature) {
            return;
          }

          const properties = feature.properties ?? {};

          /*
           * Send the selected area to the parent component.
           */
          onAreaSelect?.(properties);

          /*
           * Highlight selected hexagon.
           *
           * MapLibre's feature-state is a cleaner solution
           * than modifying the GeoJSON.
           */
          const featureId = feature.id;

          if (featureId !== undefined) {
            map.setFeatureState(
              {
                source: "traffic-hex",
                id: featureId,
              },
              {
                selected: true,
              },
            );
          }
        });
      });

    } catch (error) {
        console.error("Failed to load congestion GeoJSON:", error);
      }

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;

      map.remove();
      mapRef.current = null;
    };
  }, [city_name, cords, onAreaSelect]);

  return (
    <Card
      data-testid="riyadh-hexagon-map-container"
      className="relative overflow-hidden bg-card/70 glass sand-border card-elev p-4"
    >
      {" "}
      <div className="flex items-center justify-between mb-3">
        {" "}
        <div>
          {" "}
          <h2 className="font-display font-semibold text-base">
            {" "}
            Riyadh Congestion Hex Grid{" "}
          </h2>{" "}
          <p className="text-[11px] text-muted-foreground">
            {" "}
            Real-time hexagonal sensor mosaic · zoom &amp; pan to inspect{" "}
          </p>{" "}
        </div>{" "}
        <div
          data-testid="map-static-indicator-badge"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest sand-border sand-text bg-muted/40"
        >
          {" "}
          <Lock className="w-3 h-3" /> Static Base Map{" "}
        </div>{" "}
      </div>{" "}
      <div className="relative rounded-xl overflow-hidden border border-border/60 bg-gradient-to-br from-background to-muted/30">
        {" "}        
        <div
          ref={mapContainerRef}
          style={{ width: "100%", height: "500px" }}
        />

        {/* Tooltip */}{" "}
        {hovered && (
          <div className="absolute bottom-3 left-3 bg-card/95 glass border border-border/60 rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
            {" "}
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              {" "}
              Hex #{hovered.q}-{hovered.r}{" "}
            </div>{" "}
            <div className="flex items-center gap-2 mt-0.5">
              {" "}
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: congestionColor(hovered.v).fill }}
              />{" "}
              Congestion{" "}
              <span className="text-foreground font-semibold">
                {" "}
                {hovered.v}{" "}
              </span>{" "}
              / 100{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </Card>
  );

}

export default function HexagonMap({ search = "" }: HexagonMapProps) {
  const [layers, setLayers] = useState<LayersState>(INITIAL_LAYERS);
  const [zoom, setZoom] = useState<number>(1);
  const [hovered, setHovered] = useState<Hex | null>(null);
  const W = 700;
  const H = 520;
  const hexes = useMemo<Hex[]>(() => {
    const rows: Hex[] = [];
    const cols = Math.ceil(W / HEX_W) + 2;
    const rowsN = Math.ceil(H / (HEX_H * 0.75)) + 2;
    for (let r = 0; r < rowsN; r++) {
      for (let q = 0; q < cols; q++) {
        const cx = q * HEX_W + (r % 2 ? HEX_W / 2 : 0);
        const cy = r * HEX_H * 0.75;
        if (!inRiyadhShape(cx, cy, W, H)) {
          continue;
        }
        const v = Math.round(hexRandom(q, r) * 100);
        rows.push({ q, r, cx, cy, v });
      }
    }
    return rows;
  }, []);
  const arterials = [
    { d: `M ${W * 0.5} 20 L ${W * 0.5} ${H - 20}`, name: "King Fahd Rd" },
    { d: `M 30 ${H * 0.32} L ${W - 30} ${H * 0.32}`, name: "Northern Ring Rd" },
    { d: `M 30 ${H * 0.68} L ${W - 30} ${H * 0.68}`, name: "Khurais Rd" },
    { d: `M ${W * 0.22} 30 L ${W * 0.22} ${H - 30}`, name: "Western Ring Rd" },
    { d: `M ${W * 0.78} 30 L ${W * 0.78} ${H - 30}`, name: "Eastern Ring Rd" },
  ];
  const searchLower = search.toLowerCase();
  const toggleLayer = (key: LayerKey): void => {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  };
  const increaseZoom = (): void => {
    setZoom((current) => Math.min(2, +(current + 0.2).toFixed(2)));
  };
  const decreaseZoom = (): void => {
    setZoom((current) => Math.max(0.6, +(current - 0.2).toFixed(2)));
  };
  return (
    <Card
      data-testid="riyadh-hexagon-map-container"
      className="relative overflow-hidden bg-card/70 glass sand-border card-elev p-4"
    >
      {" "}
      <div className="flex items-center justify-between mb-3">
        {" "}
        <div>
          {" "}
          <h2 className="font-display font-semibold text-base">
            {" "}
            Riyadh Congestion Hex Grid{" "}
          </h2>{" "}
          <p className="text-[11px] text-muted-foreground">
            {" "}
            Real-time hexagonal sensor mosaic · zoom &amp; pan to inspect{" "}
          </p>{" "}
        </div>{" "}
        <div
          data-testid="map-static-indicator-badge"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest sand-border sand-text bg-muted/40"
        >
          {" "}
          <Lock className="w-3 h-3" /> Static Base Map{" "}
        </div>{" "}
      </div>{" "}
      <div className="relative rounded-xl overflow-hidden border border-border/60 bg-gradient-to-br from-background to-muted/30">
        {" "}
        {/* Controls */}{" "}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-card/80 glass rounded-lg border border-border/60 p-1">
          {" "}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={increaseZoom}
            aria-label="Zoom in"
          >
            {" "}
            <Plus className="w-3.5 h-3.5" />{" "}
          </Button>{" "}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={decreaseZoom}
            aria-label="Zoom out"
          >
            {" "}
            <Minus className="w-3.5 h-3.5" />{" "}
          </Button>{" "}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setZoom(1)}
            aria-label="Reset map zoom"
          >
            {" "}
            <Locate className="w-3.5 h-3.5" />{" "}
          </Button>{" "}
        </div>{" "}
        {/* Layers */}{" "}
        <div className="absolute top-3 left-3 z-10 bg-card/80 glass rounded-lg border border-border/60 p-2 text-[11px] space-y-1">
          {" "}
          <div className="flex items-center gap-1.5 uppercase tracking-widest text-[9px] text-muted-foreground pb-1 border-b border-border/60">
            {" "}
            <Layers className="w-3 h-3" /> Layers{" "}
          </div>{" "}
          {(Object.entries(layers) as [LayerKey, boolean][]).map(
            ([key, enabled]) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                {" "}
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleLayer(key)}
                  className="accent-[hsl(var(--sand))]"
                />{" "}
                <span className="capitalize"> {key} </span>{" "}
              </label>
            ),
          )}{" "}
        </div>{" "}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-[520px]"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            transition: "transform 300ms ease",
          }}
        >
          {" "}
          {/* Subtle grid backdrop */}{" "}
          <defs>
            {" "}
            <pattern
              id="gridBg"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              {" "}
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.4"
                opacity="0.5"
              />{" "}
            </pattern>{" "}
            <radialGradient id="cityGlow" cx="50%" cy="50%" r="60%">
              {" "}
              <stop
                offset="0%"
                stopColor="hsl(var(--sand))"
                stopOpacity="0.12"
              />{" "}
              <stop offset="100%" stopColor="transparent" />{" "}
            </radialGradient>{" "}
          </defs>{" "}
          <rect width={W} height={H} fill="url(#gridBg)" />{" "}
          <rect width={W} height={H} fill="url(#cityGlow)" /> {/* Arterials */}{" "}
          {layers.arterials &&
            arterials.map((arterial, index) => (
              <path
                key={index}
                d={arterial.d}
                stroke="hsl(var(--sand))"
                strokeOpacity="0.35"
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="0"
              />
            ))}{" "}
          {/* Hexagons */}{" "}
          {layers.grid &&
            hexes.map((hex) => {
              const congestion = congestionColor(hex.v);
              const isHover = hovered?.q === hex.q && hovered?.r === hex.r;
              return (
                <path
                  key={`${hex.q}-${hex.r}`}
                  d={hexPath(hex.cx, hex.cy, HEX_SIZE - 1.2)}
                  fill={congestion.fill}
                  fillOpacity={isHover ? 0.95 : 0.72}
                  stroke={
                    isHover ? "hsl(var(--sand))" : "hsl(var(--background))"
                  }
                  strokeWidth={isHover ? 1.5 : 0.6}
                  onMouseEnter={() => setHovered(hex)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ transition: "all 200ms", cursor: "pointer" }}
                />
              );
            })}{" "}
          {/* District boundaries + labels */}{" "}
          {layers.boundaries &&
            DISTRICT_MARKERS.map((district) => {
              const match =
                searchLower.length > 0 &&
                (district.en.toLowerCase().includes(searchLower) ||
                  district.ar.includes(searchLower));
              return (
                <g
                  key={district.id}
                  transform={`translate(${district.x * W}, ${district.y * H})`}
                >
                  {" "}
                  <circle
                    r={match ? 12 : 6}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--sand))"
                    strokeWidth={match ? 2.5 : 1.2}
                    opacity={match ? 1 : 0.85}
                  />{" "}
                  <circle r="2.5" fill="hsl(var(--sand))" />{" "}
                  <text
                    x="10"
                    y="4"
                    fill="hsl(var(--foreground))"
                    fontSize="10"
                    fontWeight="600"
                    style={{
                      paintOrder: "stroke",
                      stroke: "hsl(var(--background))",
                      strokeWidth: 3,
                      strokeLinejoin: "round",
                    }}
                  >
                    {" "}
                    {district.en}{" "}
                  </text>{" "}
                </g>
              );
            })}{" "}
          {/* Incidents markers */}{" "}
          {layers.incidents && (
            <>
              {" "}
              {INCIDENT_MARKERS.map((marker, index) => (
                <g
                  key={index}
                  transform={`translate(${marker.x * W}, ${marker.y * H})`}
                >
                  {" "}
                  <circle
                    r="8"
                    fill="none"
                    stroke="hsl(0 80% 60%)"
                    strokeWidth="1.5"
                    opacity="0.6"
                  >
                    {" "}
                    <animate
                      attributeName="r"
                      values="6;14;6"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />{" "}
                    <animate
                      attributeName="opacity"
                      values="0.8;0;0.8"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />{" "}
                  </circle>{" "}
                  <circle r="4" fill="hsl(0 80% 60%)" />{" "}
                </g>
              ))}{" "}
            </>
          )}{" "}
        </svg>{" "}
        {/* Tooltip */}{" "}
        {hovered && (
          <div className="absolute bottom-3 left-3 bg-card/95 glass border border-border/60 rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
            {" "}
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              {" "}
              Hex #{hovered.q}-{hovered.r}{" "}
            </div>{" "}
            <div className="flex items-center gap-2 mt-0.5">
              {" "}
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: congestionColor(hovered.v).fill }}
              />{" "}
              Congestion{" "}
              <span className="text-foreground font-semibold">
                {" "}
                {hovered.v}{" "}
              </span>{" "}
              / 100{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Legend */}{" "}
        <div className="absolute bottom-3 right-3 bg-card/90 glass border border-border/60 rounded-lg px-3 py-2 text-[10px]">
          {" "}
          <div className="uppercase tracking-widest text-muted-foreground mb-1.5">
            {" "}
            Congestion Index{" "}
          </div>{" "}
          <div className="flex items-center gap-2 font-mono">
            {" "}
            {[
              { c: "hsl(160 70% 45%)", l: "0–25" },
              { c: "hsl(45 92% 55%)", l: "26–50" },
              { c: "hsl(20 90% 55%)", l: "51–75" },
              { c: "hsl(0 70% 45%)", l: "76–100" },
            ].map((severity) => (
              <div key={severity.l} className="flex items-center gap-1">
                {" "}
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ background: severity.c }}
                />{" "}
                {severity.l}{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </Card>
  );
}
