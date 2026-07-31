export interface Stat {
  value: string;
  sub: string;
}

export interface Stats {
  avgCongestion: Stat;
  avgDistance: Stat;
  avgTravelTime: Stat;
  avgRushSpeed: Stat;
  highwayTripRatio: Stat;
  avgHighwaySpeed: Stat;
}

export interface WorstDay {
  date: string;
  avgCongestion: string;
  congestionAt5pm: string;
  distanceIn15minAt5pm: string;
}

export interface MonthlyChartData {
  months: string[];
  y2025: number[];
  y2024: number[];
}

export interface RushHourPeriod {
  congestion: string;
  baseSpeedKmh: number;
}

export interface RushHour {
  morning: RushHourPeriod;
  evening: RushHourPeriod;
}