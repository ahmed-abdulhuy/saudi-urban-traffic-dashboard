"use client";
import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Sunrise, Sunset } from "lucide-react";
import { useEffect, useId, useState } from "react";
interface HourlyDataPoint {
  label: string;
  congestion: number;
  speed: number;
}
interface HourlyChartProps {
  data: HourlyDataPoint[];
  period: string;
  peakHour: string;
}
type TooltipPayload = Array<{
  payload?: HourlyDataPoint;
}>;
interface TooltipBoxProps {
  active?: boolean;
  payload?: TooltipPayload;
  label?: string | number;
}
function TooltipBox({ active, payload, label }: TooltipBoxProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const data = payload[0]?.payload as HourlyDataPoint | undefined;
  if (!data) {
    return null;
  }
  return (
    <div className="bg-card/95 glass border border-border/60 rounded-lg px-3 py-2 text-xs font-mono shadow-xl">
      {" "}
      <div className="text-muted-foreground uppercase text-[10px] tracking-widest">
        {" "}
        {label}{" "}
      </div>{" "}
      <div className="text-foreground mt-1">
        {" "}
        Congestion{" "}
        <span className="sand-text font-semibold"> {data.congestion} </span> /
        100{" "}
      </div>{" "}
      <div className="text-muted-foreground">
        {" "}
        Speed {data.speed} km/h{" "}
      </div>{" "}
    </div>
  );
}

function getLocalISODate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

interface ProfilePoint { 
  time: string; 
  congestion_index: number | null; 
  mean_congestion_index: number | null;
  min_congestion_index: number | null;
  max_congestion_index: number | null;
  median_congestion_index: number | null;
  p10_congestion_index: number | null;
}

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

export function isProfileResponse( 
  response: ApiResponse 
  ): response is ProfileResponse { 
    return ( 
      "time_of_day" in response && 
      Array.isArray(response.time_of_day) 
    ); 
}

export function isPointResponse( 
    response: ApiResponse 
  ): response is CongestionResponse { 
  return "points" in response && Array.isArray(response.points); 
}


type ApiResponse = CongestionResponse | ProfileResponse;


export default function HourlyChart({
  data,
  period,
  peakHour,
}: HourlyChartProps) {
  const [date, setDate] = useState<string>(getLocalISODate);
    const [graphRange, setGraphRange] = useState<HistoryRange>("today");
    const [dataV2, setData] = useState<ApiResponse | null>(null);
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
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL ?? "/api";

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





  return (
    <Card
      data-testid="hourly-congestion-chart"
      className="bg-card/70 glass sand-border card-elev p-5 h-full flex flex-col"
    >
      {" "}
      <div className="flex items-start justify-between mb-3">
        {" "}
        <div>
          {" "}
          <h2 className="font-display font-semibold text-base">
            {" "}
            Hourly Congestion Curve{" "}
          </h2>{" "}
          <p className="text-[11px] text-muted-foreground">
            {" "}
            24-hour congestion index · updates with period{" "}
          </p>{" "}
        </div>{" "}
        <div className="text-right">
          {" "}
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {" "}
            Peak{" "}
          </div>{" "}
          <div className="font-mono font-semibold sand-text">
            {" "}
            {peakHour}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 min-h-[280px] fade-in-up" key={period}>
        {" "}
        <ResponsiveContainer width="100%" height={300}>
          {" "}
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            {" "}
            <defs>
              {" "}
              <linearGradient id="sandFill" x1="0" y1="0" x2="0" y2="1">
                {" "}
                <stop
                  offset="0%"
                  stopColor="hsl(var(--sand))"
                  stopOpacity={0.55}
                />{" "}
                <stop
                  offset="100%"
                  stopColor="hsl(var(--sand))"
                  stopOpacity={0.02}
                />{" "}
              </linearGradient>{" "}
            </defs>{" "}
            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              vertical={false}
              opacity={0.5}
            />{" "}
            <XAxis
              dataKey="label"
              tickFormatter={(value, index) => (index % 3 === 0 ? value : "")}
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
              }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />{" "}
            <YAxis
              domain={[0, 100]}
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 10,
                fontFamily: "JetBrains Mono",
              }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              width={40}
            />{" "}
            <ReferenceArea
              x1="07:00"
              x2="09:00"
              fill="hsl(var(--sand))"
              fillOpacity={0.06}
            />{" "}
            <ReferenceArea
              x1="16:00"
              x2="19:00"
              fill="hsl(var(--sand))"
              fillOpacity={0.06}
            />{" "}
            <ReferenceLine
              x={peakHour}
              stroke="hsl(var(--sand))"
              strokeDasharray="4 4"
              strokeOpacity={0.8}
            />{" "}
            <Tooltip
              content={<TooltipBox />}
              cursor={{
                stroke: "hsl(var(--sand))",
                strokeOpacity: 0.4,
                strokeWidth: 1,
              }}
            />{" "}
            <Area
              type="monotone"
              dataKey="congestion"
              stroke="hsl(var(--sand))"
              strokeWidth={2.5}
              fill="url(#sandFill)"
              animationDuration={700}
            />{" "}
          </AreaChart>{" "}
        </ResponsiveContainer>{" "}
      </div>{" "}
      <div className="flex items-center gap-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
        {" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <Sunrise className="w-3.5 h-3.5 sand-text" /> Morning peak
          07:30–09:30{" "}
        </div>{" "}
        <div className="flex items-center gap-1.5">
          {" "}
          <Sunset className="w-3.5 h-3.5 sand-text" /> Evening rush
          16:30–19:30{" "}
        </div>{" "}
      </div>{" "}
    </Card>
  );
}
