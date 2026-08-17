// data/cities.ts

export interface Stat {
  value: string;
}

export interface Stats {
  minTLI: Stat;
  avgTLI: Stat;
  maxTLI: Stat;
}

export interface WorstDay {
  date: string;
  avgTLI: string;
  maxTLI: string;
  minTLI: string;
}

export interface RushHourPeriod {
  avgTLI: string;
}

export interface RushHour {
  morning: RushHourPeriod;
  evening: RushHourPeriod;
}

export interface City {
  slug: string;
  name: string;
  country: string;
  starting_date: string;
  ending_date: string;
  stats: Stats;
  // worstDay: WorstDay;
  // rushHour: RushHour;
  mapSeed: number;
}

export interface CitySummary {
  slug: string;
  name: string;
  country: string;
  avgTLI: string;
}

const cities = {
  riyadh: {
    slug: "riyadh",
    name: "Riyadh",
    country: "Saudi Arabia",
    starting_date: "01/04/2026",
    ending_date: "15/04/2026",
    stats: {
      // minTLI: { value: "1.0105" },
      // avgTLI: { value: "1.0562" },
      // maxTLI: { value: "1.1136" },
      minTLI: { value: "0.99" },
      avgTLI: { value: "0.95" },
      maxTLI: { value: "0.90" },
    },
    // worstDay: {
    //   date: "February 13, Thursday",
    //   avgTLI: "1.0562",
    //   maxTLI: "1.1136",
    //   minTLI: "1.0105",
    // },
    // rushHour: {
    //   morning: { baseSpeedKmh: 33.5, congestion: "50.2%" },
    //   evening: { baseSpeedKmh: 24.8, congestion: "90.4%" },
    // },
    mapSeed: 42,
  },
} satisfies Record<string, City>;

export function getAllCitySlugs(): string[] {
  return Object.keys(cities);
}

export function getCityData(slug: string): City | null {
  return cities[slug as keyof typeof cities] ?? null;
}

export function getAllCitiesSummary(): CitySummary[] {
  return Object.values(cities).map((city) => ({
    slug: city.slug,
    name: city.name,
    country: city.country,
    avgTLI: city.stats.avgTLI.value,
  }));
}