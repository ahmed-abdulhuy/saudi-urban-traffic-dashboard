export interface CityInfo {
  slug: string;
  name: string;
  country: string;
  starting_date: string;
  ending_date: string;
  stats: {
    minTLI: { value: string };
    avgTLI: { value: string };
    maxTLI: { value: string };
  };
  mapSeed: number;
  geojsonFile: string;
  mapCenter: [number, number]; // [lon, lat]
}

export interface CongestionRun {
  city: string;
  run_index: string;
  timestamp: string;
  center_lat: number;
  center_lon: number;
  center_tile: { x: number; y: number };
  zoom: number;
  radius: number;
  style: string;
  tile_grid_size: [number, number];
  tiles_requested: number;
  tiles_failed: number;
  failed_tiles: unknown[];
  geotiff_size: { width: number; height: number };
  crs: string;
  category_codes: Record<string, number>;
  legend_rgb: Record<string, [number, number, number]>;
  congestion_index: number;
  api: string;
  download_url: string;
  hexagons_url: string;
}

export type CongestionLevel =
  | "no_data"
  | "free_flow"
  | "moderate"
  | "heavy"
  | "severe";

export interface HexagonFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    congestion_score: number;
    congestion_level: CongestionLevel;
    color: string;
    road_pixel_count: number;
  };
}

export interface HexagonCollection {
  type: "FeatureCollection";
  features: HexagonFeature[];
}

export interface HistoryPoint {
  timestamp: string;
  congestion_index: number;
  run_index: string;
}

export interface PointHistoryResponse {
  city: string;
  range: string;
  date: string;
  points: HistoryPoint[];
}

export interface TimeOfDaySlot {
  time: string; // "HH:MM"
  mean_congestion_index: number | null;
  median_congestion_index: number | null;
  p10_congestion_index: number | null;
  min_congestion_index: number | null;
  max_congestion_index: number | null;
  sample_count: number;
}

export interface AggregateHistoryResponse {
  city: string;
  range: "last_week" | "last_month";
  start_date: string;
  end_date: string;
  slot_minutes: number;
  time_of_day: TimeOfDaySlot[];
}

export type HistoryRange = "today" | "yesterday" | "last_week" | "last_month";

export type HistoryResponse = PointHistoryResponse | AggregateHistoryResponse;

export function isAggregateHistory(
  data: HistoryResponse
): data is AggregateHistoryResponse {
  return (data as AggregateHistoryResponse).time_of_day !== undefined;
}
