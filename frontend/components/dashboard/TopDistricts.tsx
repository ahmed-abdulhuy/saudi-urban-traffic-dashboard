import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, MapPin } from "lucide-react";
type Trend = "up" | "down";
export interface District {
  id: string | number;
  en: string;
  ar: string;
  trend: Trend;
  trendPct: number;
  congestion: number;
  speed: number;
  delay: number;
}
interface TopDistrictsProps {
  districts: District[];
  search?: string;
}
const levelColor = (value: number): string => {
  if (value < 26) return "bg-emerald-500";
  if (value < 51) return "bg-amber-500";
  if (value < 76) return "bg-orange-500";
  return "bg-red-600";
};
export default function TopDistricts({ districts, search }: TopDistrictsProps) {
  const query = (search ?? "").toLowerCase();
  const filtered = query
    ? districts.filter(
        (district) =>
          district.en.toLowerCase().includes(query) ||
          district.ar.includes(query),
      )
    : districts;
  return (
    <Card
      data-testid="top-districts-list"
      className="bg-card/70 glass sand-border card-elev p-5 h-full"
    >
      {" "}
      <div className="flex items-center justify-between mb-4">
        {" "}
        <div>
          {" "}
          <h2 className="font-display font-semibold text-base">
            {" "}
            Top Congested Districts{" "}
          </h2>{" "}
          <p className="text-[11px] text-muted-foreground">
            {" "}
            Ranked by average congestion index{" "}
          </p>{" "}
        </div>{" "}
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {" "}
          {filtered.length} zones{" "}
        </span>{" "}
      </div>{" "}
      <div className="space-y-3">
        {" "}
        {filtered.slice(0, 6).map((district, index) => (
          <div
            key={district.id}
            className="fade-in-up group"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            {" "}
            <div className="flex items-center justify-between mb-1.5">
              {" "}
              <div className="flex items-center gap-2 min-w-0">
                {" "}
                <span className="font-mono text-[10px] text-muted-foreground w-5">
                  {" "}
                  #{index + 1}{" "}
                </span>{" "}
                <MapPin className="w-3.5 h-3.5 sand-text shrink-0" />{" "}
                <span className="text-sm font-medium truncate">
                  {" "}
                  {district.en}{" "}
                </span>{" "}
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  {" "}
                  {district.ar}{" "}
                </span>{" "}
              </div>{" "}
              <div className="flex items-center gap-2">
                {" "}
                <span
                  className={`flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${district.trend === "up" ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10"}`}
                >
                  {" "}
                  {district.trend === "up" ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}{" "}
                  {district.trendPct}%{" "}
                </span>{" "}
                <span className="font-mono text-sm font-semibold w-8 text-right">
                  {" "}
                  {district.congestion}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div className="relative h-1.5 rounded-full overflow-hidden bg-muted/50">
              {" "}
              <div
                className={`absolute inset-y-0 left-0 ${levelColor(district.congestion)} transition-all duration-700`}
                style={{ width: `${district.congestion}%` }}
              />{" "}
            </div>{" "}
            <div className="flex items-center gap-4 mt-1 text-[10px] font-mono text-muted-foreground">
              {" "}
              <span>{district.speed} km/h</span> <span>·</span>{" "}
              <span>+{district.delay} min delay</span>{" "}
            </div>{" "}
          </div>
        ))}{" "}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {" "}
            No districts match your search.{" "}
          </div>
        )}{" "}
      </div>{" "}
    </Card>
  );
}
