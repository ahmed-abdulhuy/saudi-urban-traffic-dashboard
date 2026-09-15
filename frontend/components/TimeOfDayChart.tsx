"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { TimeOfDaySlot } from "@/lib/types";

export default function TimeOfDayChart({ slots }: { slots: TimeOfDaySlot[] }) {
  const data = slots
    .filter((s) => s.sample_count > 0)
    .map((s) => ({
      time: s.time,
      mean: s.mean_congestion_index,
      band: [s.min_congestion_index, s.max_congestion_index],
    }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-stone-500 text-sm">
        No readings recorded for this period yet.
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#21201B" strokeOpacity={0.08} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "#4A463D" }}
            axisLine={{ stroke: "#21201B", strokeOpacity: 0.15 }}
            tickLine={false}
            interval={7}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 11, fill: "#4A463D" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#211F1A",
              border: "none",
              borderRadius: 2,
              fontSize: 12,
              color: "#F7F2E7",
            }}
            labelStyle={{ color: "#EEE4CF" }}
            formatter={(value, name) =>
              name === "band" && Array.isArray(value)
                ? [`${value[0]?.toFixed(3)} – ${value[1]?.toFixed(3)}`, "Min–max range"]
                : [Number(value).toFixed(3), "Typical (mean)"]
            }
          />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="#A85C2E"
            fillOpacity={0.12}
          />
          <Line
            type="monotone"
            dataKey="mean"
            stroke="#0B5D3A"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
