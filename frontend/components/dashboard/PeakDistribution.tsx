import { Card } from "@/components/ui/card";
import { Coffee, Moon, Sun, Sunset, type LucideIcon } from "lucide-react";
type TimePeriod = "morning" | "midday" | "evening" | "night";
interface PeakItem {
  key: TimePeriod;
  label: string;
  range: string;
  icon: LucideIcon;
}
export interface PeakBuckets {
  morning?: number;
  midday?: number;
  evening?: number;
  night?: number;
}
interface PeakDistributionProps {
  buckets: PeakBuckets;
}
const ITEMS: PeakItem[] = [
  { key: "morning", label: "Morning", range: "06–11", icon: Sun },
  { key: "midday", label: "Midday", range: "11–15", icon: Coffee },
  { key: "evening", label: "Evening", range: "15–21", icon: Sunset },
  { key: "night", label: "Night", range: "21–06", icon: Moon },
];
export default function PeakDistribution({ buckets }: PeakDistributionProps) {
  const total =
    ITEMS.reduce((sum, item) => sum + (buckets[item.key] ?? 0), 0) || 1;
  return (
    <Card className="bg-card/70 glass sand-border card-elev p-5 h-full">
      {" "}
      <div className="mb-4">
        {" "}
        <h2 className="font-display font-semibold text-base">
          {" "}
          Peak Hour Distribution{" "}
        </h2>{" "}
        <p className="text-[11px] text-muted-foreground">
          {" "}
          Share of daily congestion by window{" "}
        </p>{" "}
      </div>{" "}
      <div className="space-y-4">
        {" "}
        {ITEMS.map((item, index) => {
          const value = buckets[item.key] ?? 0;
          const percentage = Math.round((value / total) * 100);
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="fade-in-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {" "}
              <div className="flex items-center justify-between mb-1.5">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Icon className="w-3.5 h-3.5 sand-text" />{" "}
                  <span className="text-sm font-medium"> {item.label} </span>{" "}
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {" "}
                    {item.range}{" "}
                  </span>{" "}
                </div>{" "}
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {" "}
                  {percentage}%{" "}
                </span>{" "}
              </div>{" "}
              <div className="relative h-2 rounded-full overflow-hidden bg-muted/40">
                {" "}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${percentage}%`,
                    background:
                      "linear-gradient(90deg, hsl(var(--sand)/0.55), hsl(var(--sand)))",
                  }}
                />{" "}
              </div>{" "}
              <div className="text-[10px] font-mono text-muted-foreground mt-1">
                {" "}
                avg index {value}{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </Card>
  );
}
