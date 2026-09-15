import type { CongestionLevel } from "./types";

export const LEVEL_LABEL: Record<CongestionLevel, string> = {
  no_data: "No data",
  free_flow: "Free flow",
  moderate: "Moderate",
  heavy: "Heavy",
  severe: "Severe",
};

export const LEVEL_HEX: Record<CongestionLevel, string> = {
  no_data: "#B8B0A0",
  free_flow: "rgb(43,200,43)",
  moderate: "rgb(214,190,20)",
  heavy: "rgb(214,60,60)",
  severe: "rgb(119,119,119)",
};

/** The backend's Traffic Level Index runs ~0 (gridlocked) to 1 (free-flowing). */
export function tliToPercent(index: number): number {
  return Math.round(index * 100);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

export function formatDDMMYYYY(iso: string): string {
  // input like "01/04/2026" already dd/mm/yyyy — pass through, else format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat("en-GB").format(new Date(iso));
}
