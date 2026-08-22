import { notFound } from "next/navigation";
import { getAllCitySlugs } from "@/data/cities";
import CitySwitcher from "@/components/CitySwitcher";
import HexMap from "@/components/HexMap";
import MapView from "@/components/MapView";
import StatCards from "@/components/StatCards";
import RushHourPanel from "@/components/RushHourPanel";
import CityMetroToggle from "@/components/CityMetroToggle";
import Image from "next/image";
interface CityDashboardPageProps {
  params: Promise<{
    city: string;
  }>;
}

export function generateStaticParams(): { city: string }[] {
  return getAllCitySlugs().map((slug) => ({
    city: slug,
  }));
}

async function getCityData(citySlug: string) {
  const response = await fetch(
    `http://localhost:8000/city/${encodeURIComponent(citySlug)}`,
    {
      // Remove this if you want Next.js to cache the response.
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}


export default async function CityDashboardPage({
  params,
}: CityDashboardPageProps) {
  const { city: citySlug } = await params;
  const city = await getCityData(citySlug);

  if (!city) {
    notFound();
  }

  console.log("City data:", city);

  return (
    <div className="wrap">
      <CitySwitcher activeSlug={city.slug} />

      <div className="eyebrow">Traffic overview</div>
      <h1 className="title">
        {city.name}, {city.country} <span className="flag" />
      </h1>

      <MapView city_name={city.slug} cords={city.mapCenter} />

      {/* <HexMap seed={city.mapSeed} /> */}

      <div className="section-2025">
        <h2 className="section-title">
          {city.name} traffic in the period from {city.starting_date} to {city.ending_date}
        </h2>

        <p className="section-desc">
          Travel load index values shown here are
          illustrative sample figures for a city-level traffic overview.
        </p>

        {/* <div className="toggle-row">
          <CityMetroToggle />
        </div> */}

        <StatCards
          stats={city.stats}
          // worstDay={city.worstDay}
        />
        <div className="card">
          <div className="graph-label">TLI variation over the day</div>
          <Image 
            className="graph"
            src="/Daily TLI_inv Pattern (Riyadh).png" 
            width={400}
            height={300}
            alt="TLI variation" />
        </div>

      </div>

      {/* <RushHourPanel rushHour={city.rushHour} /> */}
    </div>
  );
}