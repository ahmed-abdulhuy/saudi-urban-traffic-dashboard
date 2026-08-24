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
from fastapi.responses import JSONResponse

from .core.config import CITY_COORDS, ConfigError, PipelineConfig
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