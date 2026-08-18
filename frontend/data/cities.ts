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
  geojsonFile: string;
  mapCenter: [number, number];
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
    geojsonFile: "congestion_hexagon_Riyadh.geojson",
    mapCenter: [46.6753, 24.7136],
  },
  jeddah: {
    slug: "jeddah",
    name: "Jeddah",
    country: "Saudi Arabia",
    starting_date: "01/04/2026",
    ending_date: "15/04/2026",
    stats: {
      // minTLI: { value: "1.0069" },
      // avgTLI: { value: "1.0359" },
      // maxTLI: { value: "1.0876" },
      minTLI: { value: "0.99" },
      avgTLI: { value: "0.96" },
      maxTLI: { value: "0.91" },
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
    geojsonFile: "congestion_hexagon_Jeddah.geojson",
    mapCenter: [39.1611, 21.5294],
  },
    dammam: {
    slug: "dammam",
    name: "Dammam",
    country: "Saudi Arabia",
    starting_date: "01/04/2026",
    ending_date: "15/04/2026",
    stats: {
      // minTLI: { value: "1.0093" },
      // avgTLI: { value: "1.0277" },
      // maxTLI: { value: "1.0504" },
      minTLI: { value: "0.99" },
      avgTLI: { value: "0.97" },
      maxTLI: { value: "0.95" },
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
    geojsonFile: "congestion_hexagon_Dammam.geojson",
    mapCenter: [50.0905, 26.4241],
  },
    al_khobar: {
    slug: "al_khobar",
    name: "Al Khobar",
    country: "Saudi Arabia",
    starting_date: "01/04/2026",
    ending_date: "15/04/2026",
    stats: {
      // minTLI: { value: "1.0075" },
      // avgTLI: { value: "1.0252" },
      // maxTLI: { value: "1.0652" },
      minTLI: { value: "0.99" },
      avgTLI: { value: "0.97" },
      maxTLI: { value: "0.94" },
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
    geojsonFile: "congestion_hexagon_Al khobar.geojson",
    mapCenter: [50.1932, 26.2199],
  },
    dhahran: {
    slug: "dhahran",
    name: "Dhahran",
    country: "Saudi Arabia",
    starting_date: "01/04/2026",
    ending_date: "15/04/2026",
    stats: {
      // minTLI: { value: "1.0114" },
      // avgTLI: { value: "1.0215" },
      // maxTLI: { value: "1.0425" },
      minTLI: { value: "0.99" },
      avgTLI: { value: "0.98" },
      maxTLI: { value: "0.96" },
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
    geojsonFile: "congestion_hexagon_Dhahran.geojson",
    mapCenter: [50.043, 26.2381],
  },
  al_qatif: {
    slug: "al_qatif",
    name: "Al Qatif",
    country: "Saudi Arabia",
    starting_date: "01/04/2026",
    ending_date: "15/04/2026",
    stats: {
      // minTLI: { value: "1.0140" },
      // avgTLI: { value: "1.0258" },
      // maxTLI: { value: "1.0397" },
      minTLI: { value: "0.98" },
      avgTLI: { value: "0.97" },
      maxTLI: { value: "0.96" },
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
    geojsonFile: "congestion_hexagon_Al Qatif.geojson",
    mapCenter: [49.9985, 26.5781],
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