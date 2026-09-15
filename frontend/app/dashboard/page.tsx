"use client";

import { useMemo, useState } from "react";
import Header from "@/components/dashboard/Header";
import PeriodSelector, { Period } from "@/components/dashboard/PeriodSelector";
import KpiCards from "@/components/dashboard/KpiCards";
import HexagonMap, { HexagonMapV2 } from "@/components/dashboard/HexagonMap";
import HourlyChart from "@/components/dashboard/HourlyChart";
import TopDistricts from "@/components/dashboard/TopDistricts";
import AiInsights from "@/components/dashboard/AiInsights";
import PeakDistribution from "@/components/dashboard/PeakDistribution";
import IncidentsFeed from "@/components/dashboard/IncidentsFeed";
import { TRAFFIC_DATA, AI_INSIGHTS, PERIOD_LABELS } from "@/data/mockData";

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const [search, setSearch] = useState<string>("");

  const data = useMemo(() => {
    return TRAFFIC_DATA[period];
  }, [period]);

  const insight = useMemo(() => {
    return AI_INSIGHTS[period];
  }, [period]);
  return <div>
    <h1>Under Construction</h1>
  </div>
  // return (
  //   <div className="relative min-h-screen">
  //     {" "}
  //     <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-5 space-y-5">
  //       {" "}
  //       <Header search={search} setSearch={setSearch} />{" "}
  //       <PeriodSelector
  //         period={period}
  //         setPeriod={setPeriod}
  //         label={PERIOD_LABELS[period]}
  //       />{" "}
  //       <KpiCards data={data} period={period} />{" "}
  //       <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
  //         {" "}
  //         <div className="lg:col-span-7">
  //           {" "}
  //           <HexagonMapV2
  //             search={search}
  //             city_name="riyadh"
  //             cords={[46.6753, 24.7136]}
  //           />{" "}
  //           {/* <HexagonMap
  //             search={search}
  //             city_name="riyadh"
  //             cords={[46.6753, 24.7136]}
  //           />{" "} */}
  //         </div>{" "}
  //         <div className="lg:col-span-5">
  //           {" "}
  //           <HourlyChart
  //             data={data.hourly}
  //             period={period}
  //             peakHour={data.peakHour}
  //           />{" "}
  //         </div>{" "}
  //       </div>{" "}
  //       <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
  //         {" "}
  //         <div className="lg:col-span-5">
  //           {" "}
  //           <TopDistricts districts={data.districts} search={search} />{" "}
  //         </div>{" "}
  //         <div className="lg:col-span-4">
  //           {" "}
  //           <PeakDistribution buckets={data.buckets} />{" "}
  //         </div>{" "}
  //         <div className="lg:col-span-3">
  //           {" "}
  //           <IncidentsFeed incidents={data.incidents} />{" "}
  //         </div>{" "}
  //       </div>{" "}
  //       <AiInsights insight={insight} period={PERIOD_LABELS[period]} />{" "}
  //       <footer className="pt-4 pb-6 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60">
  //         {" "}
  //         <div>
  //           {" "}
  //           Riyadh Traffic Congestion Intelligence System · RTCIS v1.0{" "}
  //         </div>{" "}
  //         <div className="font-mono">
  //           {" "}
  //           Sensor grid: 1,248 hexagons · uptime 99.94%{" "}
  //         </div>{" "}
  //       </footer>{" "}
  //     </div>{" "}
  //   </div>
  // );
}
