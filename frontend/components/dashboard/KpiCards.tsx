import {
  Activity,
  AlertTriangle,
  Gauge,
  Timer,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { TRAFFIC_DATA } from "@/data/mockData";

interface KpiCardProps {
  testId: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  sub: string;
  delta?: number;
  tone?: "sand" | "red" | "green" | "blue";
}
interface KpiData {
  avgCongestion: number;
  avgSpeed: number;
  peakHour: string | number;
  peakValue: string | number;
  activeIncidents: number;
}
interface KpiCardsProps {
  data: KpiData;
  period: string;
}
const KpiCard = ({
  testId,
  icon: Icon,
  label,
  value,
  unit,
  sub,
  delta,
}: KpiCardProps) => (
  <Card
    data-testid={testId}
    className="relative overflow-hidden p-5 bg-card/70 glass sand-border card-elev group hover:-translate-y-0.5 transition-transform duration-300 fade-in-up"
  >
    {" "}
    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full sand-bg/10 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />{" "}
    <div className="relative flex items-start justify-between">
      {" "}
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {" "}
        <Icon className="w-3.5 h-3.5 sand-text" /> {label}{" "}
      </div>{" "}
      {delta !== undefined && (
        <div
          className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full ${delta >= 0 ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"}`}
        >
          {" "}
          {delta >= 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}{" "}
          {delta >= 0 ? "+" : ""} {delta}%{" "}
        </div>
      )}{" "}
    </div>{" "}
    <div className="relative mt-4 flex items-baseline gap-1.5">
      {" "}
      <span className="font-display text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums">
        {" "}
        {value}{" "}
      </span>{" "}
      {unit && (
        <span className="text-sm text-muted-foreground font-mono">
          {" "}
          {unit}{" "}
        </span>
      )}{" "}
    </div>{" "}
    <p className="relative mt-1 text-xs text-muted-foreground"> {sub} </p>{" "}
  </Card>
);

// Compute delta vs. "last_month" baseline
const baseline = TRAFFIC_DATA.last_month;
export default function KpiCards({ data, period }: KpiCardsProps) {
  const deltaCong =
    period === "last_month"
      ? 0
      : Math.round(
          ((data.avgCongestion - baseline.avgCongestion) /
            baseline.avgCongestion) *
            100,
        );
  const deltaSpeed =
    period === "last_month"
      ? 0
      : Math.round(
          ((data.avgSpeed - baseline.avgSpeed) / baseline.avgSpeed) * 100,
        );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {" "}
      <KpiCard
        testId="kpi-card-avg-congestion"
        icon={Activity}
        label="Average Congestion"
        value={data.avgCongestion}
        unit="/ 100"
        sub="Citywide hex average"
        delta={deltaCong}
      />{" "}
      <KpiCard
        testId="kpi-card-peak-hour"
        icon={Timer}
        label="Peak Congestion Hour"
        value={data.peakHour}
        unit={`· ${data.peakValue}`}
        sub="Highest grid strain window"
      />{" "}
      <KpiCard
        testId="kpi-card-active-incidents"
        icon={AlertTriangle}
        label="Active Incidents"
        value={data.activeIncidents}
        unit="events"
        sub="Roadworks · accidents · hazards"
      />{" "}
      <KpiCard
        testId="kpi-card-avg-speed"
        icon={Gauge}
        label="Average Arterial Speed"
        value={data.avgSpeed}
        unit="km/h"
        sub="Vs. free-flow 80 km/h"
        delta={-deltaSpeed}
      />{" "}
    </div>
  );
}
