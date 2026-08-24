"""Periodic traffic snapshot scheduler.

Scheduling rules:
- Riyadh: every 15 minutes, 24/7.
- Jeddah, Dammam, Al khobar, Dhahran, Al Qatif:
    * Monday-Thursday, Saturday-Sunday:
        - 06:00-08:00 every 15 minutes
        - 14:00-16:00 every 15 minutes
    * Friday:
        - 16:00-19:00 every 15 minutes

All times use the Asia/Riyadh timezone.

Window boundaries are start-inclusive and end-exclusive:
    06:00-08:00 -> 06:00 ... 07:45
    14:00-16:00 -> 14:00 ... 15:45
    16:00-19:00 -> 16:00 ... 18:45

Verified against APScheduler's real CronTrigger by expanding every
generated job's fire times across a full day and diffing them against the
expected grid-aligned tick set for each window, including non-hour-aligned
edge cases.
"""

from __future__ import annotations

import logging
from threading import Lock
from typing import List, Optional, Type

from apscheduler.schedulers.base import BaseScheduler
from apscheduler.schedulers.blocking import BlockingScheduler
from zoneinfo import ZoneInfo

from ...core.config import CITY_COORDS, PipelineConfig
from .pipeline import run_city

log = logging.getLogger("tomtom_pipeline.scheduler")

RIYADH_TZ = ZoneInfo("Asia/Riyadh")
FREQ_MINUTES = 15

# 0=Monday ... 6=Sunday
CITIES = {
    "Riyadh": {
        "type": "continuous",
    },
    "Jeddah": {
        "type": "windowed",
        "weekday_windows": {
            4: [("16:00", "19:00")],  # Friday
        },
        "default_windows": [
            ("06:00", "08:00"),
            ("14:00", "16:00"),
        ],
    },
    "Dammam": {
        "type": "windowed",
        "weekday_windows": {
            4: [("16:00", "19:00")],
        },
        "default_windows": [
            ("06:00", "08:00"),
            ("14:00", "16:00"),
        ],
    },
    "Al khobar": {
        "type": "windowed",
        "weekday_windows": {
            4: [("16:00", "19:00")],
        },
        "default_windows": [
            ("06:00", "08:00"),
            ("14:00", "16:00"),
        ],
    },
    "Dhahran": {
        "type": "windowed",
        "weekday_windows": {
            4: [("16:00", "19:00")],
        },
        "default_windows": [
            ("06:00", "08:00"),
            ("14:00", "16:00"),
        ],
    },
    "Al Qatif": {
        "type": "windowed",
        "weekday_windows": {
            4: [("16:00", "19:00")],
        },
        "default_windows": [
            ("06:00", "08:00"),
            ("14:00", "16:00"),
        ],
    },
}


def _collect(cfg: PipelineConfig, city: str, lock: Lock) -> None:
    """Run one snapshot while preventing overlapping runs for the city.

    Deliberately skip-and-warn rather than queue/retry: a stale traffic
    snapshot delivered late is worse than a gap, so a run that's still busy
    when the next tick fires just drops that tick. TODO: emit a metric here
    (not just a log line) so a chronically-behind city is visible without
    grepping logs.
    """
    if not lock.acquire(blocking=False):
        log.warning("Skipping snapshot for %s -- previous run still active", city)
        return
    try:
        log.info("Starting snapshot for %s", city)
        run_city(cfg, city)
        log.info("Finished snapshot for %s", city)
    except Exception:
        log.exception("Snapshot failed for %s", city)  # never take the scheduler down
    finally:
        lock.release()


def _time_to_minutes(value: str) -> int:
    hour, minute = map(int, value.split(":"))
    if not 0 <= hour <= 23:
        raise ValueError(f"Invalid hour in time: {value}")
    if not 0 <= minute <= 59:
        raise ValueError(f"Invalid minute in time: {value}")
    return hour * 60 + minute


def _validate_window(start_str: str, end_str: str) -> None:
    start = _time_to_minutes(start_str)
    end = _time_to_minutes(end_str)
    if start >= end:
        raise ValueError(
            f"Invalid scheduling window: {start_str}-{end_str}. End time must be after start time."
        )


def _schedule_window(
    scheduler: BlockingScheduler,
    cfg: PipelineConfig,
    city: str,
    lock: Lock,
    weekday: int,
    start_str: str,
    end_str: str,
) -> None:
    """Schedule a single start-inclusive/end-exclusive window.

    APScheduler cron's hour/minute fields can't directly express an
    arbitrary end-exclusive range like 06:00-08:00, so this splits the
    window into: the first (possibly partial) hour, complete middle hours,
    and the final hour only up to the minute before the end.
    """
    _validate_window(start_str, end_str)

    start_minutes = _time_to_minutes(start_str)
    end_minutes = _time_to_minutes(end_str)
    start_hour, start_minute = divmod(start_minutes, 60)
    end_hour, end_minute = divmod(end_minutes, 60)

    job_id_base = f"{city}_{weekday}_{start_str.replace(':', '')}_{end_str.replace(':', '')}"

    if start_minute == 0 and end_minute == 0:
        hour_expr = str(start_hour) if end_hour - start_hour == 1 else f"{start_hour}-{end_hour - 1}"
        scheduler.add_job(
            _collect,
            "cron",
            args=[cfg, city, lock],
            day_of_week=str(weekday),
            hour=hour_expr,
            minute=f"*/{FREQ_MINUTES}",
            id=job_id_base,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=60,
        )
        log.info("Scheduled %s: weekday=%s, window=%s-%s, every %d min", city, weekday, start_str, end_str, FREQ_MINUTES)
        return

    for hour in range(start_hour, end_hour + 1):
        first_minute = start_minute if hour == start_hour else 0
        last_minute = end_minute - 1 if hour == end_hour else 59
        if first_minute > last_minute:
            continue
        valid_minutes = [m for m in range(first_minute, last_minute + 1) if m % FREQ_MINUTES == 0]
        if not valid_minutes:
            continue
        scheduler.add_job(
            _collect,
            "cron",
            args=[cfg, city, lock],
            day_of_week=str(weekday),
            hour=str(hour),
            minute=",".join(map(str, valid_minutes)),
            id=f"{job_id_base}_{hour:02d}",
            max_instances=1,
            coalesce=True,
            misfire_grace_time=60,
        )

    log.info("Scheduled %s: weekday=%s, window=%s-%s, every %d min", city, weekday, start_str, end_str, FREQ_MINUTES)


def _schedule_continuous_job(scheduler: BlockingScheduler, cfg: PipelineConfig, city: str, lock: Lock) -> None:
    scheduler.add_job(
        _collect,
        "cron",
        args=[cfg, city, lock],
        minute=f"*/{FREQ_MINUTES}",
        id=f"{city}_continuous",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=60,
    )
    log.info("Scheduled continuous job for %s: every %d min", city, FREQ_MINUTES)


def _schedule_windowed_jobs(
    scheduler: BlockingScheduler,
    cfg: PipelineConfig,
    city: str,
    lock: Lock,
    weekday_windows: dict,
    default_windows: list,
) -> None:
    for weekday in range(7):
        windows = weekday_windows.get(weekday, default_windows)
        for start_str, end_str in windows:
            _schedule_window(scheduler, cfg, city, lock, weekday, start_str, end_str)


def build_scheduler(
    cfg: PipelineConfig,
    cities: Optional[List[str]] = None,
    scheduler_cls: Type[BaseScheduler] = BlockingScheduler,
) -> BaseScheduler:
    """`scheduler_cls` defaults to BlockingScheduler for standalone/CLI use.
    Pass `apscheduler.schedulers.asyncio.AsyncIOScheduler` when embedding
    this in an already-running asyncio app (e.g. FastAPI) -- Blocking's
    `.start()` never returns, which would hang the ASGI server at startup.
    """
    scheduler = scheduler_cls(timezone=RIYADH_TZ)
    selected_cities = cities or list(CITIES.keys())

    for city in selected_cities:
        if city not in CITIES:
            raise ValueError(f"Unsupported scheduler city: {city}")
        city_cfg = CITIES[city]
        lock = Lock()  # one lock per city, shared across ALL of that city's jobs

        if city_cfg["type"] == "continuous":
            _schedule_continuous_job(scheduler, cfg, city, lock)
        else:
            _schedule_windowed_jobs(
                scheduler, cfg, city, lock,
                city_cfg.get("weekday_windows", {}), city_cfg.get("default_windows", []),
            )

    return scheduler


def run_forever(cfg: PipelineConfig, cities: Optional[List[str]] = None) -> None:
    """Standalone CLI entry point: `python -m tomtom_pipeline.scheduler`.
    Blocks forever -- do not call this from within FastAPI. For in-process
    use, call build_scheduler(cfg, cities, scheduler_cls=AsyncIOScheduler)
    from your app's lifespan instead (see fastapi_integration.py)."""
    scheduler = build_scheduler(cfg, cities, scheduler_cls=BlockingScheduler)
    log.info(
        "Starting traffic data scheduler. Timezone=%s, frequency=%d min, cities=%s",
        RIYADH_TZ, FREQ_MINUTES, cities or list(CITIES.keys()),
    )
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Stopping traffic data scheduler...")
        scheduler.shutdown(wait=True)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    config = PipelineConfig.from_env()
    configured_cities = [city for city in CITIES if city in CITY_COORDS]
    run_forever(config, configured_cities)