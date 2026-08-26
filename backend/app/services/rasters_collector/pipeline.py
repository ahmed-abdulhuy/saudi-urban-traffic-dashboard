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
import os
import secrets
from datetime import datetime, timedelta, timezone
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
    tmp_path = f"{path}.{os.getpid()}.part"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
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


def run_snapshot(
    cfg: PipelineConfig,
    city_name: str,
    lat: float,
    lon: float,
    index: Optional[str] = None,
    hex_cfg: HexGridConfig = HexGridConfig(),
) -> Dict:
    """One full ETL pass: fetch tiles, calibrate + mask each, stitch,
    write GeoTIFF, build the hexagon congestion layer, write metadata.
    Returns the metadata dict."""
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
        "congestion_index": congestion_index(categories),  # 0 (gridlock) - 1 (free flow)
        "api": "TomTom Traffic Flow Raster v4",
    }

    meta_path = save_metadata(output_dir, index, metadata)
    save_latest_pointer(output_dir, metadata)
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