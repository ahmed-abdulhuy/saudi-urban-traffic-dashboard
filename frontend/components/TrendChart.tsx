"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { HistoryPoint } from "@/lib/types";
import { formatTime } from "@/lib/format";

export default function TrendChart({ points }: { points: HistoryPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-stone-500 text-sm">
        No readings recorded for this period yet.
      </div>
    );
  }

  const data = points.map((p) => ({
    time: formatTime(p.timestamp),
    index: Number(p.congestion_index?.toFixed(4)),
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#21201B" strokeOpacity={0.08} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "#020202" }}
            axisLine={{ stroke: "#21201B", strokeOpacity: 0.15 }}
            tickLine={false}
            minTickGap={24}
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
            formatter={(value) => [Number(value).toFixed(3), "Traffic level index"]}
          />
          <Line
            type="monotone"
            dataKey="index"
            stroke="#0B5D3A"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
