import Masthead from "@/components/Masthead";
import HeroStat from "@/components/HeroStat";
import MapPanel from "@/components/MapPanel";
import Legend from "@/components/Legend";
import StatCards from "@/components/StatCards";
import HistoryPanel from "@/components/HistoryPanel";
import Footer from "@/components/Footer";
import { getCity, getLatestTraffic, getLatestHexagons, getHistory } from "@/lib/api";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function Page() {
  const [city, run, hexagons, todayHistory] = await Promise.all([
    getCity("riyadh", "server"),
    getLatestTraffic("riyadh", "server"),
    getLatestHexagons("riyadh", "server"),
    getHistory("today", "Riyadh", "server"),
  ]);

  return (
    <main className="min-h-screen bg-sand-50">
      <Masthead startDate={city.starting_date} endDate={city.ending_date} />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-8">
          <HeroStat run={run} />
          <div className="h-80 lg:h-auto border border-stone-900/10 overflow-hidden">
            <MapPanel hexagons={hexagons} center={city.mapCenter} />
          </div>
        </div>
        <div className="mt-4">
          <Legend />
        </div>
      </section>

      {/* <section className="mx-auto max-w-6xl px-6 py-4">
        <h2 className="font-display text-2xl text-stone-900 mb-3">
          Reporting-window summary
        </h2>
        <StatCards city={city} />
      </section> */}

      <section className="mx-auto max-w-6xl px-6 py-10">
        <HistoryPanel initialRange="today" initialData={todayHistory} />
      </section>

      <Footer />
    </main>
  );
}
