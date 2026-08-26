"""FastAPI app with the traffic collector running in-process via
AsyncIOScheduler.

IMPORTANT -- read before deploying with more than one worker:
This starts the scheduler inside `lifespan`, which runs once per Python
*process*. If you run this with `uvicorn ... --workers 4` or behind
gunicorn with multiple workers, each worker starts its own copy of the
scheduler -- you'd hit the TomTom API N times concurrently for every
city/tick, N times the cost, N times the rate-limit pressure, and
duplicate/overwritten output files.

If you need multiple workers for request throughput, don't run the
collector in-process at all: run `python -m tomtom_pipeline.scheduler` as
its own separate process/container (one instance, full stop), and have
this API only ever *read* whatever it writes to `cfg.output_dir` /
your database. That decoupling also means a slow collection run (network
stalls, a big GeoTIFF write) can never add latency to API requests, and
a crash in one doesn't take down the other. See ENABLE_SCHEDULER below
for a quick single-process/single-worker way to toggle this without a
second codebase, but a separate process is the more robust setup.
"""
from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .core.config import CITY_COORDS, ConfigError, PipelineConfig, get_output_dir
from .services.rasters_collector.scheduler import CITIES, build_scheduler

log = logging.getLogger("tomtom_pipeline.api")

cities_file_path = Path(__file__).parent / "data" / "cities.json"
cities_data: dict = {}

# Explicit opt-in so a second worker/replica can be started with the
# collector disabled instead of silently duplicating it. Set this to
# "true" on exactly one process in any multi-worker/multi-replica setup.
ENABLE_SCHEDULER = os.environ.get("ENABLE_SCHEDULER", "true").lower() == "true"

traffic_scheduler: Optional[AsyncIOScheduler] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cities_data, traffic_scheduler

    if cities_file_path.exists():
        with open(cities_file_path, "r") as f:
            cities_data = json.load(f)
    else:
        cities_data = {}

    if ENABLE_SCHEDULER:
        try:
            pipeline_cfg = PipelineConfig.from_env()
        except ConfigError as exc:
            # Fail loudly but don't take the whole API down over a missing
            # collector key -- /city and /health should still work. Flip
            # this to `raise` if you'd rather the process refuse to boot.
            log.error("Traffic collector disabled: %s", exc)
            pipeline_cfg = None

        if pipeline_cfg is not None:
            configured_cities = [c for c in CITIES if c in CITY_COORDS]
            traffic_scheduler = build_scheduler(
                pipeline_cfg, configured_cities, scheduler_cls=AsyncIOScheduler
            )
            traffic_scheduler.start()  # non-blocking: hooks into the running loop
            log.info("Traffic collector started for cities=%s", configured_cities)
    else:
        log.info("Traffic collector disabled (ENABLE_SCHEDULER=false)")

    yield

    if traffic_scheduler is not None:
        # wait=True: let an in-flight snapshot finish rather than cut it off
        # mid-write. Tile/GeoTIFF writes are already atomic (temp file +
        # rename), so wait=False is also safe if your deployment's shutdown
        # grace period is too short to wait out a full snapshot.
        traffic_scheduler.shutdown(wait=True)
        log.info("Traffic collector stopped")


app = FastAPI(title="Minimal FastAPI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Hello, World!"}


@app.get("/health")
def health():
    return {"status": "ok", "collector_running": traffic_scheduler is not None}


@app.get("/city/{city_name}")
def get_city(city_name: str):
    city_info = cities_data.get(city_name)
    if not city_info:
        raise HTTPException(status_code=404, detail="City not found")
    return city_info


@app.get("/city/{city_name}/congestion_graph")
def get_congestion_graph(city_name: str):
    city_info = cities_data.get(city_name)
    if not city_info:
        raise HTTPException(status_code=404, detail="City not found")

    congestion_graph_file = (
        Path(__file__).parent / "data" / f"congestion_hexagon_{city_info.get('name')}.geojson"
    )
    if not congestion_graph_file.exists():
        raise HTTPException(status_code=404, detail="Congestion graph file not found")

    with open(congestion_graph_file, "r") as f:
        return json.load(f)


def _latest_snapshot_metadata(city_name: str) -> dict:
    """Reads `{output_dir}/{city}/latest.json`, an O(1) pointer the
    collector atomically rewrites after every successful run -- avoids
    listing/sorting a metadata directory that grows by thousands of files
    over time just to find the newest one."""
    city_info = cities_data.get(city_name)
    if not city_info:
        raise HTTPException(status_code=404, detail="City not found")

    meta_path = Path(get_output_dir()) / city_info.get("name") / "latest.json"
    if not meta_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No traffic snapshot has been collected yet for this city",
        )
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/city/{city_name}/traffic/latest")
def get_latest_traffic_metadata(city_name: str):
    """Metadata for the most recent snapshot: timestamp, congestion index,
    tile success rate, etc. Use /traffic/latest.tif to fetch the raster
    itself."""
    metadata = _latest_snapshot_metadata(city_name)
    # geotiff_path/hexagon_geojson_path are server-local filesystem paths --
    # don't leak them, point at the sibling endpoints instead.
    metadata = {k: v for k, v in metadata.items() if k not in ("geotiff_path", "hexagon_geojson_path")}
    metadata["download_url"] = f"/city/{city_name}/traffic/latest.tif"
    metadata["hexagons_url"] = f"/city/{city_name}/traffic/latest/hexagons"
    return metadata


@app.get("/city/{city_name}/traffic/latest.tif")
def get_latest_traffic_geotiff(city_name: str):
    """Streams the most recent categorized traffic GeoTIFF for the city.
    Single-band uint8, EPSG:3857, category codes documented at
    /city/{city_name}/traffic/latest (category_codes / legend_rgb)."""
    metadata = _latest_snapshot_metadata(city_name)
    geotiff_path = Path(metadata["geotiff_path"])

    if not geotiff_path.exists():
        # latest.json outlived the file it points to (e.g. manual cleanup) --
        # treat as "nothing available" rather than a 500.
        log.error("latest.json for %s points at a missing file: %s", city_name, geotiff_path)
        raise HTTPException(status_code=404, detail="Latest GeoTIFF is no longer available")

    return FileResponse(
        path=geotiff_path,
        media_type="image/tiff",
        filename=f"traffic_{city_name}_latest.tif",
        headers={
            # snapshots can change every 15 min -- let clients revalidate
            # rather than cache indefinitely. Starlette still sets
            # Last-Modified/ETag from the file's stat, so a client that
            # asks nicely (If-None-Match/If-Modified-Since) still gets a
            # cheap 304 between snapshots instead of a full re-download.
            "Cache-Control": "no-cache",
            "X-Snapshot-Timestamp": metadata.get("timestamp", ""),
        },
    )


@app.get("/city/{city_name}/traffic/latest/hexagons")
def get_latest_traffic_hexagons(city_name: str):
    """Hexagon-grid congestion layer for the most recent snapshot, as a
    GeoJSON FeatureCollection in WGS84 (lon/lat) -- ready to drop onto a
    Leaflet/Mapbox GL/deck.gl map. Each feature carries congestion_score
    (0=gridlock..1=free flow), congestion_level, a display color, and the
    number of road pixels it was averaged from.

    Derived from the GeoTIFF at /traffic/latest.tif, not the raw tiles --
    if hex generation failed for this particular run (logged, non-fatal to
    the snapshot itself), this returns 404 rather than stale data."""
    metadata = _latest_snapshot_metadata(city_name)
    hexagon_path_str = metadata.get("hexagon_geojson_path")
    if not hexagon_path_str:
        raise HTTPException(
            status_code=404,
            detail="Hexagon layer was not generated for the latest snapshot",
        )

    hexagon_path = Path(hexagon_path_str)
    if not hexagon_path.exists():
        log.error("latest.json for %s points at a missing hexagon file: %s", city_name, hexagon_path)
        raise HTTPException(status_code=404, detail="Latest hexagon layer is no longer available")

    with open(hexagon_path, "r", encoding="utf-8") as f:
        return json.load(f)