"use client";
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock3,
  type LucideIcon,
} from "lucide-react";

export type Period = "today" | "yesterday" | "last_week" | "last_month";
interface PeriodOption {
  key: Period;
  label: string;
  icon: LucideIcon;
}
interface PeriodSelectorProps {
  period: string;
  setPeriod: (period: Period) => void;
  label: string;
}
const OPTIONS: PeriodOption[] = [
  { key: "today", label: "Today", icon: Clock3 },
  { key: "yesterday", label: "Yesterday", icon: CalendarDays },
  { key: "last_week", label: "Last Week", icon: CalendarRange },
  { key: "last_month", label: "Last Month", icon: CalendarClock },
];
export default function PeriodSelector({
  period,
  setPeriod,
  label,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-between">
      {" "}
      <div className="flex items-center gap-2">
        {" "}
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {" "}
          Analysis Period{" "}
        </span>{" "}
        <span className="h-px w-8 bg-border" />{" "}
        <span className="font-display font-semibold text-sm sand-text">
          {" "}
          {label}{" "}
        </span>{" "}
      </div>{" "}
      <div
        role="tablist"
        className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border/60"
      >
        {" "}
        {OPTIONS.map(({ key, label: optionLabel, icon: Icon }) => {
          const active = period === key;
          return (
            <button
              key={key}
              type="button"
              data-testid={`period-selector-${key.replace("_", "-")}`}
              role="tab"
              aria-selected={active}
              onClick={() => setPeriod(key)}
              className={[
                "relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300",
                active
                  ? "bg-[hsl(var(--sand))] text-black shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60",
              ].join(" ")}
            >
              {" "}
              <Icon className="w-3.5 h-3.5" /> {optionLabel}{" "}
            </button>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
}
