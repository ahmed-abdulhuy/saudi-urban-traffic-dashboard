import type {
  CityInfo,
  CongestionRun,
  HexagonCollection,
  HistoryResponse,
  HistoryRange,
} from "./types";


async function getJSON<T>(
  path: string, 
  componentType: "client" | "server" = "client",
  revalidateSeconds = 60
): Promise<T> {

    const API_BASE = 
      componentType == "server" ?
        process.env.API_URL: 
        process.env.NEXT_PUBLIC_API_URL ?? "api";
    if (!API_BASE) {
      throw new Error(
        `API URL is not configured for ${componentType} component`
      );
    }

  const res = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getCity(slug = "riyadh", componentType: "client" | "server" = "client") {
  return getJSON<CityInfo>(`/city/${slug}`, componentType, 300);
}

/** Metadata for the latest congestion run (index, legend, tile info). */
export function getLatestTraffic(slug = "riyadh", componentType: "client" | "server" = "client") {
  return getJSON<CongestionRun>(`/city/${slug}/traffic/latest`, componentType, 60);
}

/** Hexagon grid geometries with per-cell congestion for the map. */
export function getLatestHexagons(slug = "riyadh", componentType: "client" | "server" = "client") {
  return getJSON<HexagonCollection>(
    `/city/${slug}/traffic/latest/hexagons`,
    componentType,
    60
  );
}

/**
 * Historical congestion. "today"/"yesterday" return raw timestamped points.
 * "last_week"/"last_month" return an aggregated time-of-day profile.
 */
export function getHistory(range: HistoryRange, city = "Riyadh", componentType: "client" | "server" = "client") {
  return getJSON<HistoryResponse>(
    `/city/${city}/traffic/history?range=${range}`,
    componentType,
    300
  );
}
