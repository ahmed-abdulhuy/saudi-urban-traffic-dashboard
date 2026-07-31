import Link from "next/link";
import { getAllCitiesSummary } from "@/data/cities"

interface CitySwitcherProps {
  activeSlug: string;
}

export default function CitySwitcher({
  activeSlug,
}: CitySwitcherProps): React.JSX.Element {
  const cities = getAllCitiesSummary();

  return (
    <div className="city-switcher">
      {cities.map((city) => (
        <Link
          key={city.slug}
          href={`/${city.slug}`}
          className={city.slug === activeSlug ? "active" : ""}
        >
          {city.name}
        </Link>
      ))}
    </div>
  );
}