"use client";

import { useEffect, useState } from "react";
import RangeTabs from "./RangeTabs";
import TrendChart from "./TrendChart";
import TimeOfDayChart from "./TimeOfDayChart";
import { getHistory } from "@/lib/api";
import { isAggregateHistory } from "@/lib/types";
import type { HistoryRange, HistoryResponse } from "@/lib/types";

export default function HistoryPanel({
  initialRange = "today",
  initialData,
}: {
  initialRange?: HistoryRange;
  initialData?: HistoryResponse;
}) {
  const [range, setRange] = useState<HistoryRange>(initialRange);
  const [data, setData] = useState<HistoryResponse | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getHistory(range)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load history for this range.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl text-stone-900">
          Congestion over time
        </h2>
        <RangeTabs active={range} onChange={setRange} />
      </div>

      <p className="mt-2 text-sm text-stone-500 max-w-xl">
        {range === "today" || range === "yesterday"
          ? "Each reading is a snapshot from a completed monitoring run."
          : "Readings are grouped by time of day across the period, showing the typical level and its observed range."}
      </p>

      <div className="mt-4 border border-stone-900/10 p-4">
        {loading && (
          <div className="h-64 flex items-center justify-center text-stone-500 text-sm">
            Loading&hellip;
          </div>
        )}
        {!loading && error && (
          <div className="h-64 flex items-center justify-center text-clay text-sm">
            {error}
          </div>
        )}
        {!loading && !error && data && (
          <>
            {isAggregateHistory(data) ? (
              <TimeOfDayChart slots={data.time_of_day} />
            ) : (
              <TrendChart points={data.points} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
