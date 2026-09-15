import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  Wrench,
  CalendarClock,
  Zap,
  type LucideIcon,
} from "lucide-react";

type IncidentType = "Accident" | "Roadwork" | "Metro Work" | "Event" | string;
type IncidentSeverity = "low" | "moderate" | "high" | string;
type IncidentStatus = "In Progress" | "Clearing" | "Scheduled" | string;

export interface Incident {
  id: string | number;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  street: string;
  eta: string;
}

interface IncidentsFeedProps {
  incidents: Incident[];
}

const typeIcon = (type: IncidentType): LucideIcon => {
  if (type === "Accident") return AlertCircle;
  if (type === "Roadwork" || type === "Metro Work") return Wrench;
  if (type === "Event") return CalendarClock;
  return Zap;
};

const severityDot = (severity: IncidentSeverity): string => {
  if (severity === "low") return "bg-emerald-500";
  if (severity === "moderate") return "bg-amber-500";
  return "bg-red-500";
};

const statusStyle = (status: IncidentStatus): string => {
  if (status === "In Progress") {
    return "text-amber-500 bg-amber-500/10";
  }
  if (status === "Clearing") {
    return "text-emerald-500 bg-emerald-500/10";
  }
  if (status === "Scheduled") {
    return "text-sky-500 bg-sky-500/10";
  }
  return "text-red-500 bg-red-500/10";
};

export default function IncidentsFeed({ incidents }: IncidentsFeedProps) {
  return (
    <Card
      data-testid="active-incidents-feed"
      className="bg-card/70 glass sand-border card-elev p-5 h-full"
    >
      {" "}
      <div className="mb-4">
        {" "}
        <h2 className="font-display font-semibold text-base">
          {" "}
          Live Incidents{" "}
        </h2>{" "}
        <p className="text-[11px] text-muted-foreground">
          {" "}
          Filtered to selected period{" "}
        </p>{" "}
      </div>{" "}
      <div className="space-y-2.5">
        {" "}
        {incidents.map((incident, index) => {
          const Icon = typeIcon(incident.type);
          return (
            <div
              key={incident.id}
              className="p-2.5 rounded-lg border border-border/60 hover:border-[hsl(var(--sand))]/40 hover:bg-muted/30 transition-all fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {" "}
              <div className="flex items-start justify-between gap-2">
                {" "}
                <div className="flex items-start gap-2 min-w-0">
                  {" "}
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 ${severityDot(incident.severity)} pulse-dot`}
                  />{" "}
                  <div className="min-w-0">
                    {" "}
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {" "}
                      <Icon className="w-3 h-3 sand-text" />{" "}
                      {incident.type}{" "}
                    </div>{" "}
                    <div className="text-[11px] text-muted-foreground truncate">
                      {" "}
                      {incident.street}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <span
                  className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${statusStyle(incident.status)}`}
                >
                  {" "}
                  {incident.status}{" "}
                </span>{" "}
              </div>{" "}
              <div className="text-[10px] font-mono text-muted-foreground mt-1 pl-3.5">
                {" "}
                ETA {incident.eta}{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </Card>
  );
}
