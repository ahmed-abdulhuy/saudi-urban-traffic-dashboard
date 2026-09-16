"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";


interface MapViewerProps {
  city_name: string;
  cords: [number, number];

  // Called when a hexagon is selected
  onAreaSelect?: (properties: Record<string, unknown>) => void;
}

export default function MapViewer({ city_name, cords, onAreaSelect }: MapViewerProps): React.JSX.Element {
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
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
        const response = await fetch(
            `${API_URL}/city/${city_name}/traffic/latest/hexagons`,
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
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "500px" }}
    />
  );
}