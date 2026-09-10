"use client";

import { useEffect, useId, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface CongestionPoint {
  timestamp: string;
  congestion_index: number;
  run_index: string;
}

interface CongestionResponse {
  city: string;
  range: "date" | "today" | "yesterday";
  date: string;
  points: CongestionPoint[];
}

interface ProfilePoint { 
  time: string; 
  congestion_index: number | null; 
  mean_congestion_index: number | null;
  min_congestion_index: number | null;
  max_congestion_index: number | null;
  median_congestion_index: number | null;
  p10_congestion_index: number | null;
}

interface ProfileResponse { 
  city: string; 
  range: "last_week" | "last_month"; 
  start_date: string; 
  end_date: string; 
  slot_minutes: number; 
  time_of_day: ProfilePoint[]; 
}

type ApiResponse = CongestionResponse | ProfileResponse;

type HistoryRange = 
  | "date" 
  | "today" 
  | "yesterday" 
  | "last_week" 
  | "last_month";

const WIDTH = 600;
const HEIGHT = 240;

const PADDING = {
  top: 20,
  right: 20,
  bottom: 30,
  left: 52,
};

function getLocalISODate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function timeLabel(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isProfileResponse( 
  response: ApiResponse 
  ): response is ProfileResponse { 
    return ( 
      "time_of_day" in response && 
      Array.isArray(response.time_of_day) 
    ); 
}

function isPointResponse( 
    response: ApiResponse 
  ): response is CongestionResponse { 
  return "points" in response && Array.isArray(response.points); 
}

export default function CongestionChart() {
  const [date, setDate] = useState<string>(getLocalISODate);
  const [graphRange, setGraphRange] = useState<HistoryRange>("today");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradientId = useId();

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (graphRange === "date") { 
          if (!date) { 
            throw new Error("Invalid date."); 
          } 
          params.set("date", date); } 
          else { 
            params.set("range", graphRange); 
          }
        
        const url =
          `${API_URL}/city/Riyadh/traffic/history?${params.toString()}`;
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Request failed: ${response.status} ${response.statusText}`
          );
        }

        const json: ApiResponse = await response.json();

        const validPointsResponse = isPointResponse(json); 
        const validProfileResponse = isProfileResponse(json); 
        if (!validPointsResponse && !validProfileResponse) { 
          throw new Error("Invalid congestion response."); 
        }
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch congestion history:", err);

        setData(null);
        setError("Could not load congestion data for this date.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [date, graphRange]);

  const {
    path,
    minPath,
    maxPath,
    medianPath,
    p10Path,
    areaPath,
    yTicks,
    xLabels,
  } = useMemo(() => {
    if (!data) {
      return { 
        path: "", 
        minPath: "", 
        maxPath: "", 
        medianPath: "", 
        p10Path: "",
        areaPath: "", 
        yTicks: [] as { 
          y: number; 
          label: string; 
        }[], 
        xLabels: [] as { 
          x: number; 
          label: string; 
        }[], 
      };
    }

    /*
     * Remove invalid points first.
     */

    let chartPoints: { 
      timestamp: string; 
      congestion_index: number; 
      min_congestion_index: number | null; 
      max_congestion_index: number | null;
      median_congestion_index: number | null;
      p10_congestion_index: number | null; 
    }[] = [];
    
    if (isPointResponse(data)) { 
      chartPoints = data.points 
      .filter((point) => { 
        const timestamp = new Date( 
          point.timestamp 
        ).getTime(); 
        return ( 
          Number.isFinite(timestamp) && 
          point.congestion_index !== null && 
          Number.isFinite(point.congestion_index) 
        ); 
      }) 
      .map((point) => ({ 
        timestamp: point.timestamp, 
        congestion_index: 
          point.congestion_index as number, 
        min_congestion_index: null,
        max_congestion_index: null,
        median_congestion_index: null,
        p10_congestion_index: null,
      })) 
      .sort( 
        (a, b) => 
          new Date(a.timestamp).getTime() - 
        new Date(b.timestamp).getTime() 
      ); 
    }

    if (isProfileResponse(data)) { 
      chartPoints = data.time_of_day 
      .filter( 
        (point) => 
          point.mean_congestion_index !== null && 
          Number.isFinite(point.mean_congestion_index) 
      ) 
      .map((point, index) => ({ 
        timestamp: `2000-01-01T${point.time}`, 
        congestion_index: point.mean_congestion_index as number,
        min_congestion_index: point.min_congestion_index,
        max_congestion_index: point.max_congestion_index,
        median_congestion_index: point.median_congestion_index,
        p10_congestion_index: point.p10_congestion_index,
      })); 
    } 

    if (chartPoints.length === 0) { 
      return { 
        path: "", 
        minPath: "", 
        maxPath: "", 
        medianPath: "",
        p10Path: "",
        areaPath: "", 
        yTicks: [], 
        xLabels: [], 
      }; 
    }

    const innerW = WIDTH - PADDING.left - PADDING.right;
    const innerH = HEIGHT - PADDING.top - PADDING.bottom;

    /*
     * -------------------------
     * X axis
     * -------------------------
     */
    const times = chartPoints.map((point) => 
      new Date(point.timestamp).getTime()
    );

    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    /*
     * If there is only one timestamp, create an artificial
     * time range so the point appears in the center.
     */
    const tSpan = tMax - tMin;

    const x = (timestamp: number) => {
      if (tSpan === 0) {
        return PADDING.left + innerW / 2;
      }

      return (
        PADDING.left +
        ((timestamp - tMin) / tSpan) * innerW
      );
    };

    /*
     * -------------------------
     * Y axis
     * -------------------------
     */

    const values = chartPoints.map( (point) => point.congestion_index );

    const dataMin = ["last_week", "last_month"].includes(graphRange)
      ? Math.min(...chartPoints.map((point) => point.min_congestion_index || 0))
      : Math.min(...values);
    
      const dataMax = ["last_week", "last_month"].includes(graphRange)
      ? Math.max(...chartPoints.map((point) => point.max_congestion_index || 1))
      : Math.max(...values);

    const range = dataMax - dataMin;

    /*
     * Add some padding around the data.
     */
    const padding = Math.max(range * 0.1, 0.005);

    let yMin = Math.max(0, dataMin - padding);
    let yMax = Math.min(1, dataMax + padding);

    const minYRange = 0.01; 
    if (yMax - yMin < minYRange) { 
      const center = (dataMin + dataMax) / 2; 
      const halfRange = minYRange / 2; 
      yMin = Math.max(0, center - halfRange); 
      yMax = Math.min(1, center + halfRange); 
      // If we hit one of the boundaries, compensate on the other side. 
      if (yMin === 0) { 
        yMax = Math.min(1, minYRange); 
      } 
      if (yMax === 1) { 
        yMin = Math.max(0, 1 - minYRange); 
      } 
    }

    /*
     * If everything is zero, avoid yMin === yMax.
     */
    const actualYMax =
      yMax > yMin
        ? yMax
        : Math.min(1, yMin + minYRange);

    const yRange = actualYMax - yMin;

    const y = (value: number) => {
      return (
        PADDING.top +
        (1 - (value - yMin) / yRange) * innerH
      );
    };

    /*
     * -------------------------
     * Line coordinates
     * -------------------------
     */
    const coords = chartPoints.map((point) => ({ 
      x: x( 
        new Date(point.timestamp).getTime() 
      ), 
      y: y(
        point.congestion_index), 
      })); 
      const line = coords.map( (point, index) => 
        `${index === 0 ? "M" : "L"}${point.x.toFixed( 2 )},${point.y.toFixed(2)}` 
      )
      .join(" ");

      const min_coords = chartPoints.map((point) => ({
        x: x(
          new Date(point.timestamp).getTime()
        ),
        y: point.min_congestion_index !== null ? y(point.min_congestion_index) : y(yMin),
      }));
      const min_line = min_coords.map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed( 2 )},${point.y.toFixed(2)}`
      ).join(" ");

      const max_coords = chartPoints.map((point) => ({
        x: x(
          new Date(point.timestamp).getTime()
        ),
        y: point.max_congestion_index !== null ? y(point.max_congestion_index) : y(yMax),
      }));
      const max_line = max_coords.map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed( 2 )},${point.y.toFixed(2)}`
      ).join(" ");

      const median_coords = chartPoints.map((point) => ({
        x: x(
          new Date(point.timestamp).getTime()
        ),
        y: point.median_congestion_index !== null ? y(point.median_congestion_index) : y(yMin),
      }));
      const median_line = median_coords.map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed( 2 )},${point.y.toFixed(2)}`
      ).join(" ");

      const p10_coords = chartPoints.map((point) => ({
        x: x(
          new Date(point.timestamp).getTime()
        ),
        y: point.p10_congestion_index !== null ? y(point.p10_congestion_index) : y(yMin),
      }));
      const p10_line = p10_coords.map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed( 2 )},${point.y.toFixed(2)}`
      ).join(" ");


    /*
     * -------------------------
     * Area under the line
     * -------------------------
     */

    const baseline = PADDING.top + innerH;

    const firstPoint = coords[0];
    const lastPoint = coords[coords.length - 1];

    const area =
      coords.length > 0
        ? `${line} ` +
          `L${lastPoint.x.toFixed(2)},${baseline.toFixed(2)} ` +
          `L${firstPoint.x.toFixed(2)},${baseline.toFixed(2)} Z`
        : "";

    /*
     * -------------------------
     * Y-axis ticks
     * -------------------------
     */

    const decimalPlaces = yRange < 0.001 ? 4 : 
    yRange < 0.01 ? 3 : 
    yRange < 0.1 ? 2 : 1;
    
    const tickCount = 5;

    const ticks = Array.from(
      { length: tickCount },
      (_, index) => {
        const value =
          yMin +
          ((actualYMax - yMin) * index) /
            (tickCount - 1);

        return {
          y: y(value),
          label: value.toFixed(decimalPlaces),
        };
      }
    ).reverse();

    /*
     * -------------------------
     * X-axis labels
     * -------------------------
     *
     * Keep the first and last points and show
     * approximately 6 labels.
     */

    const maxLabels = 6;

    let labelIndexes: number[];

    if (chartPoints.length <= maxLabels) { 
      labelIndexes = chartPoints.map( (_, index) => index ); 
    } else { 
      const step = (chartPoints.length - 1) / (maxLabels - 1); 
      labelIndexes = Array.from( { length: maxLabels }, (_, index) => Math.round(index * step) ); 
    } 
    const labels = labelIndexes.map( 
      (index) => { 
        const point = chartPoints[index]; 
        const label = timeLabel(point.timestamp);

        return { x: coords[index].x, label, }; 
      } 
    );

    return {
      path: line,
      areaPath: area,
      minPath: min_line,
      maxPath: max_line,
      medianPath: median_line,
      p10Path: p10_line,
      yTicks: ticks,
      xLabels: labels,
    };
  }, [data]);

  /* 
  * -------------------------------------------------- 
  * Controller labels 
  * -------------------------------------------------- 
  */ 
 const rangeLabel: Record< HistoryRange, string > = { 
    date: "Specific date", 
    today: "Today", 
    yesterday: "Yesterday", 
    last_week: "Last week", 
    last_month: "Last month", 
  }; 
  
  /* 
  * -------------------------------------------------- 
  * Graph title 
  * -------------------------------------------------- 
  */ 
 const graphTitle = graphRange === "date" ? 
  "Congestion level over the day" : 
  graphRange === "today" ? 
  "Congestion level today" : 
  graphRange === "yesterday" ? 
  "Congestion level yesterday" : 
  graphRange === "last_week" ? 
  "Typical congestion over the last week" : 
  "Typical congestion over the last month";

  const maxDate = getLocalISODate();

  return (
    <div className="card">
      <div className="graph-label">
        {graphTitle}
      </div>

      <div className="chart-controls"> 
        <select 
          value={graphRange} 
          onChange={(event) => setGraphRange( event.target .value as HistoryRange ) } 
          aria-label="Congestion history range" > {
            ( [ "today", "yesterday", "last_week", "last_month", "date", ] as HistoryRange[] )
            .map((value) => ( 
              <option key={value} value={value} > 
                {rangeLabel[value]} 
              </option> ))} 
          </select> 
          {graphRange === "date" && ( 
            <input 
              type="date" 
              value={date} 
              max={maxDate} 
              onChange={(event) => setDate( 
                event.target.value 
                ) } 
                aria-label="Select congestion date" /> 
                )} 
        </div>

      {loading && (
        <p className="chart-status">
          Loading…
        </p>
      )}

      {error && (
        <p className="chart-status chart-error">
          {error}
        </p>
      )}

      {!loading && 
        !error && 
        data && 
        path === "" && 
        ( <p className="chart-status"> 
          No data available for this selection. 
        </p> 
      )}

      {!loading && 
        !error && 
        data && 
        path && 
        ( <svg 
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`} 
          className="congestion-svg" 
          role="img" 
          aria-label={`Congestion level for ${data.city}`} 
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--accent-red)"
                  stopOpacity="0.25"
                />

                <stop
                  offset="100%"
                  stopColor="var(--accent-red)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* Y-axis grid and labels */}
            {yTicks.map((tick, index) => (
              <g key={`${tick.label}-${index}`}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="var(--line)"
                  strokeWidth="1"
                />

                <text
                  x={PADDING.left - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted)"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {xLabels.map((label, index) => (
              <text
                key={`${label.label}-${index}`}
                x={label.x}
                y={HEIGHT - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted)"
              >
                {label.label}
              </text>
            ))}

            {/* Area */}

            {/* Line */}
            <path
              d={path}
              fill="none"
              stroke="var(--accent-red)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {graphRange === "last_week" || graphRange === "last_month" ? (
              <>
                <path
                  d={minPath}
                  fill="none"
                  stroke="var(--accent-grey)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="4 2"
                />
                <path
                  d={maxPath}
                  fill="none"
                  stroke="var(--accent-grey)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="4 2"
                />
                <path
                  d={medianPath}
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="4 2"
                />
                <path
                  d={p10Path}
                  fill="none"
                  stroke="var(--accent-green)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray="4 2"
                />
              </>
            ):(<>
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
              />

            </>)}
          </svg>
        )}

          <div className="chart-legend">
            <div className="legend-item">
              <span
                className="legend-line"
                style={{
                  backgroundColor: "var(--accent-red)",
                }}
              />
              <span>Congestion Index</span>
            </div>
            {(graphRange === "last_week" || graphRange === "last_month") && (
            <>
              <div className="legend-item">
                <span
                  className="legend-line legend-dashed"
                  style={{
                    backgroundColor: "var(--accent-grey)",
                  }}
                />
                <span>Minimum</span>
              </div>

              <div className="legend-item">
                <span
                  className="legend-line legend-dashed"
                  style={{
                    backgroundColor: "var(--accent-grey)",
                  }}
                />
                <span>Maximum</span>
              </div>

              <div className="legend-item">
                <span
                  className="legend-line legend-dashed"
                  style={{
                    backgroundColor: "var(--accent-blue)",
                  }}
                />
                <span>Median</span>
              </div>

              <div className="legend-item">
                <span
                  className="legend-line legend-dashed"
                  style={{
                    backgroundColor: "var(--accent-green)",
                  }}
                />
                <span>P10</span>
              </div>
            </>
         )}
          </div>
          
    </div>
  );
}