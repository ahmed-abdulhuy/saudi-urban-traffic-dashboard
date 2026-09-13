import { notFound } from "next/navigation";
// import { getAllCitySlugs } from "@/data/cities";
import MapView from "@/components/MapView";
import CongestionChart from "@/components/CongestionChart";
interface CityDashboardPageProps {
  params: Promise<{
    city: string;
  }>;
}

// export function generateStaticParams(): { city: string }[] {
//   return getAllCitySlugs().map((slug) => ({
//     city: slug,
//   }));
// }

async function getCityData(citySlug: string, apiUrl: string = "http://backend:8000") {
  const response = await fetch(
    `${apiUrl}/city/${encodeURIComponent(citySlug)}`,
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
  const apiUrl = process.env.API_URL;
  const city = await getCityData(citySlug, apiUrl);

  if (!city) {
    notFound();
  }

  return (
    <div className="wrap">

      <div className="eyebrow">Traffic overview</div>
      <h1 className="title">
        {city.name}, {city.country} <span className="flag" />
      </h1>

      <MapView city_name={city.slug} cords={city.mapCenter} />

      <CongestionChart />
    </div>
  );
}