"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type TileBounds = [
  north: number,
  west: number,
  south: number,
  east: number,
];

// Returns the tile bounds as [north, west, south, east]
function tileBounds(lat: number, lon: number): TileBounds {
  const zoom = 14;
  const radius = 6;

  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;

  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );

  const west = ((x - radius) / n) * 360 - 180;
  const east = ((x + radius + 1) / n) * 360 - 180;

  const north =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y - radius)) / n))) * 180) /
    Math.PI;

  const south =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + radius + 1)) / n))) * 180) /
    Math.PI;

  return [north, west, south, east];
}

export default function MapViewer(): React.JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [46.6753, 24.7136],
      zoom: 14,
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const [north, west, south, east] = tileBounds(24.7136, 46.6753);

    map.on("load", () => {
      map.addSource("traffic", {
        type: "image",
        url: "/example.png",
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      });

      // map.addLayer({
      //   id: "traffic",
      //   type: "raster",
      //   source: "traffic",
      //   paint: {
      //     "raster-opacity": 0.7,
      //   },
      // });
      
      map.addSource("traffic-hex", {
          type: "geojson",
          data: "hexagon_congestion.geojson",
      });
  
      map.addLayer({
          id: "traffic-hex",
          type: "fill",
          source: "traffic-hex",
  
          paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": 0.40,
          },
      });
      map.addLayer({
        id: "traffic-hex-outline",
        type: "line",
        source: "traffic-hex",
        paint: {
          "line-color": "#333",
          "line-width": 0.5,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "500px" }}
    />
  );
}