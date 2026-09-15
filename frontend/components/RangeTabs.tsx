"use client";

import clsx from "clsx";
import type { HistoryRange } from "@/lib/types";

const RANGES: { key: HistoryRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last_week", label: "Last 7 days" },
  { key: "last_month", label: "Last 30 days" },
];

export default function RangeTabs({
  active,
  onChange,
}: {
  active: HistoryRange;
  onChange: (range: HistoryRange) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="History range"
      className="inline-flex border border-stone-900/15"
    >
      {RANGES.map((r) => (
        <button
          key={r.key}
          role="tab"
          aria-selected={active === r.key}
          onClick={() => onChange(r.key)}
          className={clsx(
            "px-4 py-2 text-sm transition-colors",
            active === r.key
              ? "bg-najdi text-sand-50"
              : "text-stone-700 hover:bg-sand-100"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
