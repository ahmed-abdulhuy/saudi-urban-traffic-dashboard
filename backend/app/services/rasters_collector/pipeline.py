"""End-to-end TomTom Traffic ETL for one city/snapshot.

Fixes vs. the original scripts:
- `sys.exit()` is gone. In the original, `collect()` called `sys.exit(2)` on
  a missing API key -- inside a worker thread that only raises SystemExit in
  that thread, not the process, so a background scheduler would silently
  keep running broken jobs forever. This now raises PipelineError, which the
  caller (or scheduler) can catch and act on.
- Run IDs are timestamp+random based, not a resettable in-memory counter.
  The earlier design cached tiles at `{output_dir}/tiles/{zoom}/{index}_{x}_{y}.png`
  and treated an existing file at that path as a cache hit -- but `index`
  came from a counter that resets to 1 on every process restart. After a
  restart, a stale tile from a run days ago at path `00001_x_y.png` would
  be silently reused as "fresh" data for the new run, because the cache
  check only looks at file existence, not age. Traffic tiles are
  time-varying: there's never a valid reason to reuse one across two
  different snapshot times, only to resume a partially-failed *same* run.
  A collision-proof run id (millisecond timestamp + short random suffix)
  removes the possibility entirely, while still letting a genuinely
  interrupted run resume from its own partial tile cache.
- Calibration/masking happens per-tile (512x512) before compositing, not on
  the full stitched mosaic, to keep the nearest-neighbour classification's
  memory use small regardless of `radius`.
- A tile that failed to download degrades to a nodata block instead of
  crashing the whole run.
"""
from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

import numpy as np
from PIL import Image

from .color_processing import CATEGORY_CODES, LEGEND, calibrate_and_mask, congestion_index
from ...core.config import CITY_COORDS, PipelineConfig
from .downloader import TileResult, download_tiles_for_grid
from .geotiff_writer import write_categorized_geotiff
from ...services.congestion_geojson.hex_congestion import HexGridConfig, build_hexagon_geojson
from .tile_math import latlon_to_tile

log = logging.getLogger("tomtom_pipeline")

KSA_TZ = timezone(timedelta(hours=3))


class PipelineError(RuntimeError):
    pass


def _generate_run_id() -> str:
    """Collision-proof across processes and restarts -- unlike an in-memory
    counter, this can never point at a tile cached by an earlier, unrelated
    run."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    return f"{stamp}_{secrets.token_hex(3)}"


def _json_safe_float(value: float) -> Optional[float]:
    """NaN/Infinity round-trip fine through Python's own json module (it
    accepts them as a non-standard extension) but are not valid JSON per
    RFC 8259 -- a JS frontend's JSON.parse() will throw on a literal NaN
    token. Anything serialized over the API (or written to a file another
    process/language might read) must convert these to null instead."""
    if value is None:
        return None
    if math.isnan(value) or math.isinf(value):
        return None
    return value


def _load_tile_categories(tile: TileResult, tile_size: int) -> np.ndarray:
    if not tile.success:
        return np.zeros((tile_size, tile_size), dtype=np.uint8)
    try:
        img = np.array(Image.open(tile.path).convert("RGBA"))
        return calibrate_and_mask(img)
    except Exception as exc:  # noqa: BLE001 -- one bad tile shouldn't kill the run
        log.warning("Failed to process tile %s: %s", tile.path, exc)
        return np.zeros((tile_size, tile_size), dtype=np.uint8)


def stitch_categorized(
    tiles: List[TileResult], center_x: int, center_y: int, radius: int, tile_size: int
) -> np.ndarray:
    size = 2 * radius + 1
    canvas = np.zeros((size * tile_size, size * tile_size), dtype=np.uint8)
    by_coord = {(t.x, t.y): t for t in tiles}

    for dx in range(-radius, radius + 1):
        for dy in range(-radius, radius + 1):
            x, y = center_x + dx, center_y + dy
            tile = by_coord.get((x, y))
            if tile is None:
                continue
            row0 = (dy + radius) * tile_size
            col0 = (dx + radius) * tile_size
            canvas[row0 : row0 + tile_size, col0 : col0 + tile_size] = _load_tile_categories(
                tile, tile_size
            )
    return canvas


def save_metadata(output_dir: str, index: str, metadata: Dict) -> str:
    idx_dir = os.path.join(output_dir, "metadata")
    os.makedirs(idx_dir, exist_ok=True)
    short_ts = metadata["timestamp"].replace(":", "-")
    hashid = hashlib.sha1(json.dumps(metadata, sort_keys=True, default=str).encode()).hexdigest()[:8]
    fname = os.path.join(idx_dir, f"{index}_{short_ts}_{hashid}.json")
    _write_json_atomic(fname, metadata)
    return fname


def _write_json_atomic(path: str, data: Dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp_path = f"{path}.{os.getpid()}.part"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str, allow_nan=False)
    os.replace(tmp_path, path)


def save_latest_pointer(output_dir: str, metadata: Dict) -> str:
    """Atomically point `{output_dir}/latest.json` at the run that just
    finished, so 'give me the latest snapshot' is an O(1) file read instead
    of listing (and sorting) a metadata directory that grows by thousands
    of files over time. Written last, after the GeoTIFF itself is already
    final -- so the moment this pointer is visible, the file it points to
    is guaranteed complete."""
    path = os.path.join(output_dir, "latest.json")
    _write_json_atomic(path, metadata)
    return path


def append_timeseries_point(output_dir: str, timestamp_iso: str, run_index: str,
                             congestion_idx: Optional[float]) -> str:
    """Appends one {timestamp, congestion_index, run_index} line to
    `{output_dir}/timeseries/{YYYY-MM-DD}.jsonl` (date bucketed by the
    timestamp's own calendar day, which is already Asia/Riyadh local since
    every snapshot's timestamp is recorded in KSA_TZ). `output_dir` here is
    already the per-city directory (as everywhere else in this module).

    Why a separate per-day JSONL file instead of reading congestion_index
    back out of the metadata JSON files: metadata files accumulate one per
    snapshot forever (6 cities x every 15 min = tens of thousands of files
    a year), and a "give me today's chart" query has no way to find just
    today's files without listing and opening a large fraction of that
    directory. Bucketing by day means a query for one day opens exactly one
    small file, and the file it opens never grows past what one day's
    snapshots produce (a few hundred lines at most).

    Appends rather than read-modify-atomic-replace: each city's snapshots
    are serialized by the scheduler's per-city lock, so within one process
    there's exactly one writer at a time; and POSIX guarantees an
    O_APPEND write of less than PIPE_BUF (4KB on Linux) -- this line is a
    few dozen bytes -- won't interleave with a concurrent writer even
    across processes, so this is safe even if the collector is ever run in
    more than one process by mistake.
    """
    day = datetime.fromisoformat(timestamp_iso).date().isoformat()
    ts_dir = os.path.join(output_dir, "timeseries")
    os.makedirs(ts_dir, exist_ok=True)
    path = os.path.join(ts_dir, f"{day}.jsonl")
    line = json.dumps(
        {
            "timestamp": timestamp_iso,
            "congestion_index": _json_safe_float(congestion_idx),
            "run_index": run_index,
        },
        allow_nan=False,
    )
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    return path


def read_day_points(city_output_dir: str, day: date) -> List[Dict]:
    """Raw {timestamp, congestion_index, run_index} points collected for one
    calendar day, read from that day's JSONL append log. Returns [] for a
    day with no snapshots (not yet started, city paused for the day,
    outside a windowed city's collection hours, etc.) rather than raising --
    an empty day is a valid, expected state, not an error."""
    path = os.path.join(city_output_dir, "timeseries", f"{day.isoformat()}.jsonl")
    points: List[Dict] = []
    if not os.path.exists(path):
        return points
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                points.append(json.loads(line))
            except json.JSONDecodeError:
                log.warning("Skipping malformed line in %s", path)
    return points


def _compute_daily_summary(points: List[Dict], day: date) -> Dict:
    values = [p["congestion_index"] for p in points if p.get("congestion_index") is not None]
    if not values:
        return {
            "date": day.isoformat(),
            "mean_congestion_index": None,
            "min_congestion_index": None,
            "max_congestion_index": None,
            "sample_count": 0,
        }
    return {
        "date": day.isoformat(),
        "mean_congestion_index": round(sum(values) / len(values), 4),
        "min_congestion_index": round(min(values), 4),
        "max_congestion_index": round(max(values), 4),
        "sample_count": len(values),
    }


def _time_of_day_slot(timestamp_iso: str, slot_minutes: int) -> str:
    """Rounds a timestamp to the nearest `slot_minutes` mark and returns it
    as "HH:MM" -- the bucket a reading belongs to when averaging "all the
    01:00 readings together, all the 01:15 readings together", etc.

    Rounds rather than truncates: a snapshot is scheduled exactly on the
    15-minute grid, but actually lands a few seconds (occasionally, under
    misfire_grace_time, up to ~60s) later. Truncating "06:00:47" would still
    correctly floor to "06:00", but rounding is the more robust choice in
    general (e.g. it would also recover a snapshot logged a couple of
    minutes late back onto its intended slot instead of the previous one).
    """
    dt = datetime.fromisoformat(timestamp_iso)
    minutes_since_midnight = dt.hour * 60 + dt.minute + dt.second / 60.0
    slot = round(minutes_since_midnight / slot_minutes) * slot_minutes
    slot = int(slot) % (24 * 60)  # wrap a late-night reading rounding past 23:59 back to 00:00
    hh, mm = divmod(slot, 60)
    return f"{hh:02d}:{mm:02d}"


def get_time_of_day_profile(city_output_dir: str, days: List[date], slot_minutes: int = 15) -> List[Dict]:
    """Averages readings across `days` by time-of-day rather than by day:
    every ~01:00 reading across all the given days goes into one bucket,
    every ~01:15 reading into the next, and so on -- a "typical day" curve
    for that set of days, rather than one number per day.

    Computed fresh from the raw per-day JSONL files on every call rather
    than cached: a trailing window like "last week" shifts by one day
    every day, so unlike a single completed day's summary there's no
    stable, foldable answer to cache -- and reading a week's worth of
    15-minute-interval files (a few hundred lines total) is cheap enough
    that caching wouldn't be worth the invalidation complexity.

    Always returns one entry per slot across the full 24 hours (96 entries
    for the default 15-minute slots), even for slots with zero samples, so
    the response is a fixed-length, evenly-spaced series a chart can plot
    directly on a 00:00-23:45 x-axis without gap-filling itself.
    """
    buckets: Dict[str, List[float]] = {}
    for day in days:
        for point in read_day_points(city_output_dir, day):
            value = point.get("congestion_index")
            if value is None:
                continue
            slot = _time_of_day_slot(point["timestamp"], slot_minutes)
            buckets.setdefault(slot, []).append(value)

    profile = []
    for minute_of_day in range(0, 24 * 60, slot_minutes):
        hh, mm = divmod(minute_of_day, 60)
        slot = f"{hh:02d}:{mm:02d}"
        values = buckets.get(slot, [])
        if values:
            profile.append(
                {
                    "time": slot,
                    "mean_congestion_index": round(sum(values) / len(values), 4),
                    "min_congestion_index": round(min(values), 4),
                    "max_congestion_index": round(max(values), 4),
                    "sample_count": len(values),
                }
            )
        else:
            profile.append(
                {
                    "time": slot,
                    "mean_congestion_index": None,
                    "min_congestion_index": None,
                    "max_congestion_index": None,
                    "sample_count": 0,
                }
            )
    return profile


def _daily_summary_store_path(city_output_dir: str) -> str:
    return os.path.join(city_output_dir, "daily_summary.json")


def _load_daily_summaries(city_output_dir: str) -> Dict[str, Dict]:
    path = _daily_summary_store_path(city_output_dir)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        log.warning("daily_summary.json at %s is unreadable -- rebuilding from scratch", path)
        return {}


def get_daily_summaries_for_range(city_output_dir: str, days: List[date]) -> List[Dict]:
    """Returns one summary (mean/min/max/sample_count) per day in `days`,
    computing and persisting any that aren't already recorded. Loads and
    (if anything changed) rewrites the per-city summary store once per
    call, regardless of how many of the requested days needed computing --
    not once per missing day, which matters for a 30-day range on a
    freshly-deployed city where nothing is cached yet.

    Safe under concurrent callers -- e.g. an API request hitting this at
    the same moment the collector finalizes yesterday's summary after its
    first snapshot of a new day: a completed day's raw points never
    change, so two writers computing the same day's summary independently
    always agree. A lost update in that race just discards one writer's
    redundant (identical) work, not correctness. The one case that would
    matter -- two *different* days written concurrently, where a plain
    read-modify-write could drop one day's entry -- is self-healing: the
    next request for that specific day finds it missing and recomputes it.
    This isn't a source of truth anyway; the raw per-day JSONL files are,
    and this store is just a cache over them.
    """
    summaries = _load_daily_summaries(city_output_dir)
    changed = False
    results = []
    for day in days:
        key = day.isoformat()
        if key not in summaries:
            points = read_day_points(city_output_dir, day)
            summaries[key] = _compute_daily_summary(points, day)
            changed = True
        results.append(summaries[key])
    if changed:
        _write_json_atomic(_daily_summary_store_path(city_output_dir), summaries)
    return results


def ensure_daily_summary(city_output_dir: str, day: date) -> Dict:
    """Finalizes (computes + persists, if not already cached) one day's
    summary. Only call this for a day that's already over -- a day still
    accumulating snapshots would get permanently cached as if complete."""
    return get_daily_summaries_for_range(city_output_dir, [day])[0]


def run_snapshot(
    cfg: PipelineConfig,
    city_name: str,
    lat: float,
    lon: float,
    index: Optional[str] = None,
    hex_cfg: HexGridConfig = HexGridConfig(),
) -> Dict:
    """One full ETL pass: fetch tiles, calibrate + mask each, stitch,
    write GeoTIFF, build the hexagon congestion layer, append the
    time-series point, write metadata. Returns the metadata dict."""
    index = index or _generate_run_id()
    output_dir = os.path.join(cfg.output_dir, city_name)
    os.makedirs(output_dir, exist_ok=True)

    ts = datetime.now(KSA_TZ).isoformat()
    center_x, center_y = latlon_to_tile(lat, lon, cfg.zoom)
    log.info(
        "[%s] snapshot start city=%s center=(%.5f,%.5f) zoom=%d radius=%d",
        index, city_name, lat, lon, cfg.zoom, cfg.radius,
    )

    tiles = download_tiles_for_grid(cfg, lat, lon, output_dir, index)
    failed = [t for t in tiles if not t.success]

    categories = stitch_categorized(tiles, center_x, center_y, cfg.radius, cfg.tile_size)

    geotiff_dir = os.path.join(output_dir, "geotiff")
    os.makedirs(geotiff_dir, exist_ok=True)
    geotiff_path = os.path.join(geotiff_dir, f"traffic_{city_name}_{index}_{ts.replace(':', '-')}.tif")
    write_categorized_geotiff(
        categories, center_x, center_y, cfg.radius, cfg.zoom, geotiff_path, CATEGORY_CODES
    )

    # Derived from the GeoTIFF that was just written, not from the tiles
    # directly -- keeps this a pure post-processing step over the already-
    # calibrated raster. A failure here shouldn't cost the snapshot that
    # already succeeded, so it degrades to "no hex layer this run" rather
    # than raising.
    hexagon_path: Optional[str] = None
    try:
        hex_dir = os.path.join(output_dir, "hexagons")
        os.makedirs(hex_dir, exist_ok=True)
        hexagon_path = os.path.join(hex_dir, f"traffic_hex_{city_name}_{index}_{ts.replace(':', '-')}.geojson")
        hex_geojson = build_hexagon_geojson(geotiff_path, hex_cfg)
        _write_json_atomic(hexagon_path, hex_geojson)
    except Exception:
        log.exception("[%s] hexagon layer generation failed for %s -- continuing without it", index, city_name)
        hexagon_path = None

    congestion_idx = _json_safe_float(congestion_index(categories))  # 0 (gridlock) - 1 (free flow), or None

    metadata = {
        "city": city_name,
        "run_index": index,
        "timestamp": ts,
        "center_lat": lat,
        "center_lon": lon,
        "center_tile": {"x": center_x, "y": center_y},
        "zoom": cfg.zoom,
        "radius": cfg.radius,
        "style": cfg.style,
        "tile_grid_size": [2 * cfg.radius + 1, 2 * cfg.radius + 1],
        "tiles_requested": len(tiles),
        "tiles_failed": len(failed),
        "failed_tiles": [{"x": t.x, "y": t.y, "error": t.error} for t in failed],
        "geotiff_path": geotiff_path,
        "geotiff_size": {"width": int(categories.shape[1]), "height": int(categories.shape[0])},
        "hexagon_geojson_path": hexagon_path,
        "crs": "EPSG:3857",
        "category_codes": CATEGORY_CODES,
        "legend_rgb": LEGEND,
        "congestion_index": congestion_idx,
        "api": "TomTom Traffic Flow Raster v4",
    }

    meta_path = save_metadata(output_dir, index, metadata)
    save_latest_pointer(output_dir, metadata)
    append_timeseries_point(output_dir, ts, index, congestion_idx)

    # Finalize yesterday's daily average the moment today's first snapshot
    # lands -- yesterday can't receive any more points once we're here, so
    # it's safe to compute and cache permanently. Cheap even when already
    # cached (one small JSON file load, no write), so it's fine to just do
    # this on every run rather than detecting "is this the day's first run".
    snapshot_date = datetime.fromisoformat(ts).date()
    ensure_daily_summary(output_dir, snapshot_date - timedelta(days=1))

    log.info(
        "[%s] snapshot complete geotiff=%s metadata=%s (%d/%d tiles ok)",
        index, geotiff_path, meta_path, len(tiles) - len(failed), len(tiles),
    )
    return metadata


def run_city(cfg: PipelineConfig, city_name: str) -> Dict:
    if city_name not in CITY_COORDS:
        raise PipelineError(f"Unknown city '{city_name}'. Known cities: {list(CITY_COORDS)}")
    lat, lon = CITY_COORDS[city_name]
    return run_snapshot(cfg, city_name, lat, lon)