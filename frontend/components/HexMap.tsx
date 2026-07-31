"use client";

import { useMemo, useState } from "react";

const HEX_R = 11;
const W = 420;
const H = 260;

type TrafficMode = "all" | "morning" | "evening";

interface Cell {
  x: number;
  y: number;
  base: number;
}

interface HexMapProps {
  seed?: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;

  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function colorFor(t: number, mode: TrafficMode): string {
  let v = t;

  if (mode === "morning") {
    v = Math.min(1, t * 0.75);
  } else if (mode === "evening") {
    v = Math.min(1, t * 1.25);
  }

  const stops = [
    [0.0, [43, 168, 74]],
    [0.35, [232, 196, 43]],
    [0.65, [230, 126, 34]],
    [1.0, [214, 48, 33]],
  ] as const;

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];

    if (v >= t0 && v <= t1) {
      const f = (v - t0) / (t1 - t0);

      const c = c0.map((value, index) =>
        Math.round(value + (c1[index] - value) * f)
      );

      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }

  return "rgb(214,48,33)";
}

function hexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }

  return points.join(" ");
}

function buildCells(seed: number): Cell[] {
  const cols = Math.floor(W / (HEX_R * 1.5));
  const rows = Math.floor(H / (HEX_R * Math.sqrt(3)));
  const rand = seededRandom(seed);

  const cells: Cell[] = [];

  const cx0 = cols / 2;
  const cy0 = rows / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * HEX_R * 1.5 + HEX_R;
      const yOffset = (col % 2) * ((HEX_R * Math.sqrt(3)) / 2);
      const y = row * HEX_R * Math.sqrt(3) + yOffset + HEX_R;

      const dx = (col - cx0) / cx0;
      const dy = (row - cy0) / cy0;
      const dist = Math.sqrt(dx * dx + dy * dy * 1.4);
      const noise = rand();

      if (dist < 0.95 + noise * 0.15) {
        const base = Math.max(0, 1 - dist) * 0.7 + noise * 0.3;
        cells.push({ x, y, base });
      }
    }
  }

  return cells;
}

export default function HexMap({
  seed = 42,
}: HexMapProps): React.JSX.Element {
  const [mode, setMode] = useState<TrafficMode>("all");

  const cells = useMemo(() => buildCells(seed), [seed]);

  return (
    <div className="map-card">
      <div className="map-inner">
        <div className="filters">
          <h3>Traffic conditions</h3>

          <button
            className={`filter-btn${mode === "all" ? " active" : ""}`}
            onClick={() => setMode("all")}
          >
            All days <span className="tag">24/7</span>
          </button>

          <button
            className={`filter-btn${mode === "morning" ? " active" : ""}`}
            onClick={() => setMode("morning")}
          >
            Morning rush hour
          </button>

          <button
            className={`filter-btn${mode === "evening" ? " active" : ""}`}
            onClick={() => setMode("evening")}
          >
            Evening rush hour
          </button>
        </div>

        <div className="hexmap">
          <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
            {cells.map((cell, index) => (
              <polygon
                key={index}
                points={hexPoints(cell.x, cell.y, HEX_R - 1)}
                fill={colorFor(cell.base, mode)}
                opacity={0.85}
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="map-caption">sample data</div>
    </div>
  );
}