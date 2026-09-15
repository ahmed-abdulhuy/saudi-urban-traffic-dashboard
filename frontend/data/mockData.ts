// Realistic synthetic Riyadh traffic data
// Congestion index 0-100 across 24 hours for 4 periods and 8 districts
export type Period = "today" | "yesterday" | "last_week" | "last_month";
export type Trend = "up" | "down";
export type IncidentType =
  | "Roadwork"
  | "Accident"
  | "Event"
  | "Metro Work"
  | "Hazard";
export type IncidentSeverity = "low" | "moderate" | "heavy";
export type IncidentStatus =
  | "In Progress"
  | "Clearing"
  | "Scheduled"
  | "Reported";
export interface District {
  id: string;
  en: string;
  ar: string;
  lat: number;
  lng: number;
  congestion: number;
  speed: number;
  delay: number;
  trend: Trend;
  trendPct: number;
}
export interface BaseDistrict {
  id: string;
  en: string;
  ar: string;
  lat: number;
  lng: number;
}
export interface HourlyDataPoint {
  hour: number;
  label: string;
  congestion: number;
  speed: number;
}
export interface Incident {
  id: number;
  type: IncidentType;
  street: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  eta: string;
}
export interface PeakBuckets {
  morning: number;
  midday: number;
  evening: number;
  night: number;
}
export interface TrafficData {
  hourly: HourlyDataPoint[];
  districts: District[];
  peakHour: string;
  peakValue: number;
  avgCongestion: number;
  avgSpeed: number;
  incidents: Incident[];
  activeIncidents: number;
  buckets: PeakBuckets;
}
export interface TrafficInsight {
  headline: string;
  bottleneck: string;
  rootCause: string;
  recommendation: string;
}
export const DISTRICTS: BaseDistrict[] = [
  { id: "olaya", en: "Al Olaya", ar: "العليا", lat: 24.6892, lng: 46.6853 },
  { id: "nakheel", en: "An Nakheel", ar: "النخيل", lat: 24.7627, lng: 46.6357 },
  { id: "malaz", en: "Al Malaz", ar: "الملز", lat: 24.6624, lng: 46.7513 },
  { id: "kfahd", en: "King Fahd", ar: "الملك فهد", lat: 24.7136, lng: 46.6753 },
  { id: "yasmin", en: "Al Yasmin", ar: "الياسمين", lat: 24.842, lng: 46.6412 },
  {
    id: "sulaimaniyah",
    en: "Al Sulaimaniyah",
    ar: "السليمانية",
    lat: 24.7051,
    lng: 46.7079,
  },
  {
    id: "diplomatic",
    en: "Diplomatic Quarter",
    ar: "الحي الدبلوماسي",
    lat: 24.682,
    lng: 46.6183,
  },
  { id: "murabba", en: "Al Murabba", ar: "المربع", lat: 24.6535, lng: 46.7108 },
];

// Deterministic pseudo-random helper
// so numbers are stable per period.
const seeded = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

// Generate a 24-hour congestion curve
// with morning & evening peaks.
const generateHourlyCurve = (
  seed: number,
  peakOffset = 0,
  amplitude = 1,
): HourlyDataPoint[] => {
  const rand = seeded(seed);
  const hours: HourlyDataPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const morningPeak = 90 * Math.exp(-Math.pow(h - (8 + peakOffset), 2) / 3.5);
    const eveningPeak =
      95 * Math.exp(-Math.pow(h - (17.5 + peakOffset), 2) / 4);
    const lunchBump = 40 * Math.exp(-Math.pow(h - 13, 2) / 4);
    const base = 12 + rand() * 8;
    const noise = (rand() - 0.5) * 6;
    const value = Math.max(
      5,
      Math.min(
        100,
        (base + morningPeak + eveningPeak + lunchBump * 0.5) * amplitude +
          noise,
      ),
    );
    hours.push({
      hour: h,
      label: `${h.toString().padStart(2, "0")}:00`,
      congestion: Math.round(value),
      speed: Math.round(Math.max(15, 85 - value * 0.65)),
    });
  }
  return hours;
};
const generatePeriodData = (seed: number, amp: number): TrafficData => {
  const hourly = generateHourlyCurve(seed, 0, amp);
  const rand = seeded(seed + 42);
  const districts: District[] = DISTRICTS.map((district): District => {
    const baseCongestion = 45 + rand() * 45 * amp;
    return {
      ...district,
      congestion: Math.round(baseCongestion),
      speed: Math.round(Math.max(18, 75 - baseCongestion * 0.55)),
      delay: Math.round(baseCongestion * 0.35),
      trend: rand() > 0.5 ? "up" : "down",
      trendPct: Number((rand() * 12).toFixed(1)),
    };
  }).sort((a, b) => b.congestion - a.congestion);
  const peakEntry = hourly.reduce((a, b) =>
    b.congestion > a.congestion ? b : a,
  );
  const avg = Math.round(
    hourly.reduce((sum, item) => sum + item.congestion, 0) / hourly.length,
  );
  const buckets: PeakBuckets = {
    morning: Math.round(
      hourly.slice(6, 11).reduce((sum, item) => sum + item.congestion, 0) / 5,
    ),
    midday: Math.round(
      hourly.slice(11, 15).reduce((sum, item) => sum + item.congestion, 0) / 4,
    ),
    evening: Math.round(
      hourly.slice(15, 21).reduce((sum, item) => sum + item.congestion, 0) / 6,
    ),
    night: Math.round(
      (hourly.slice(0, 6).reduce((sum, item) => sum + item.congestion, 0) +
        hourly.slice(21).reduce((sum, item) => sum + item.congestion, 0)) /
        9,
    ),
  };
  const incidents = ([
    {
      id: 1,
      type: "Roadwork",
      street: "King Fahd Rd — Northbound",
      severity: "moderate",
      status: "In Progress",
      eta: "~35 min",
    },
    {
      id: 2,
      type: "Accident",
      street: "Northern Ring Rd exit 5",
      severity: "heavy",
      status: "Clearing",
      eta: "~12 min",
    },
    {
      id: 3,
      type: "Event",
      street: "Boulevard World zone",
      severity: "moderate",
      status: "Scheduled",
      eta: "18:00",
    },
    {
      id: 4,
      type: "Metro Work",
      street: "Olaya St. — Lane 3",
      severity: "low",
      status: "In Progress",
      eta: "ongoing",
    },
    {
      id: 5,
      type: "Hazard",
      street: "Khurais Rd @ Exit 12",
      severity: "heavy",
      status: "Reported",
      eta: "~8 min",
    },
  ] as Incident[]).slice(0, Math.max(3, Math.floor(3 + amp * 3)));
  return {
    hourly,
    districts,
    peakHour: peakEntry.label,
    peakValue: peakEntry.congestion,
    avgCongestion: avg,
    avgSpeed: Math.round(
      hourly.reduce((sum, item) => sum + item.speed, 0) / hourly.length,
    ),
    incidents,
    activeIncidents: incidents.length,
    buckets,
  };
};
export const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_week: "Last Week",
  last_month: "Last Month",
};
export const TRAFFIC_DATA: Record<Period, TrafficData> = {
  today: generatePeriodData(7, 1.05),
  yesterday: generatePeriodData(13, 0.95),
  last_week: generatePeriodData(31, 1.0),
  last_month: generatePeriodData(97, 0.88),
};

// AI insights per period
export const AI_INSIGHTS: Record<Period, TrafficInsight> = {
  today: {
    headline:
      "Elevated evening congestion driven by school dismissals overlapping metro closures.",
    bottleneck: "King Fahd Rd Southbound near Kingdom Tower",
    rootCause:
      "Metro construction lane closures + school dismissal overlap at 14:00–15:00; compounded by 17:30 evening rush.",
    recommendation:
      "Adaptive signal timing on Olaya St. north junctions; encourage Northern Ring Rd for outbound traffic between 16:30–19:00.",
  },
  yesterday: {
    headline:
      "Smoother midday flow with a sharper-than-usual evening spike after 18:00.",
    bottleneck: "Northern Ring Rd exit 5 (Al Nakheel)",
    rootCause:
      "A cleared accident at 17:45 caused residual queuing lasting ~40 minutes downstream.",
    recommendation:
      "Increase incident-response dispatch priority on Northern Ring during PM window; broadcast alternate exit guidance.",
  },
  last_week: {
    headline:
      "Consistent bimodal peaks with Wednesday evening emerging as the weekly worst window.",
    bottleneck: "Al Olaya business district corridor",
    rootCause:
      "Post-holiday commuter volume returning to baseline; combined with retail activity peaks on Wed/Thu evenings.",
    recommendation:
      "Deploy dynamic pricing for downtown parking Wed–Thu 16:00–20:00 and expand shuttle service from park-and-ride hubs.",
  },
  last_month: {
    headline:
      "Overall improved flow versus the previous month; morning peaks softened by 6.2%.",
    bottleneck: "Al Malaz corridor near Prince Abdulaziz Ibn Musaid Rd",
    rootCause:
      "New adaptive signal deployment on King Abdullah Rd contributed to sustained morning peak reduction.",
    recommendation:
      "Roll out the same adaptive signal profile to the Al Malaz corridor to compress its 08:00–09:15 window further.",
  },
};
