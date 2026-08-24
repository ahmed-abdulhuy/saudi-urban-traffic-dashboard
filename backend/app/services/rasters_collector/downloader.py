"""Concurrent, production-hardened tile downloader for the TomTom Traffic
Flow raster tile API.

Fixes vs. the original script:
- The API key is never written to logs (it was previously logged in full
  via `log.debug("GET %s", url)`).
- A 200 status is no longer trusted blindly -- the body is verified to be a
  decodable image before it's kept.
- Writes are atomic (write to a temp file, then os.replace) so a crash
  mid-download can't leave a corrupt cached tile that later runs treat as
  a cache hit.
- A token-bucket limiter caps requests/sec independent of how many worker
  threads you run, so you can raise MAX_WORKERS for latency without
  exceeding your TomTom plan's rate limit.
"""
from __future__ import annotations

import io
import logging
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import List

import requests
from PIL import Image, UnidentifiedImageError
from requests.adapters import HTTPAdapter, Retry

from ...core.config import PipelineConfig
from .tile_math import latlon_to_tile

log = logging.getLogger("tomtom_pipeline.downloader")

_KEY_RE = re.compile(r"([?&]key=)[^&]+")


def _redact(url: str) -> str:
    return _KEY_RE.sub(r"\1***REDACTED***", url)


def build_session(cfg: PipelineConfig) -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=cfg.total_retries,
        backoff_factor=cfg.backoff_factor,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=["GET", "HEAD"],
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retries, pool_maxsize=cfg.max_workers * 2)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def tile_url(x: int, y: int, zoom: int, cfg: PipelineConfig) -> str:
    return (
        f"https://api.tomtom.com/traffic/map/4/tile/flow/{cfg.style}/"
        f"{zoom}/{x}/{y}.png?tileSize={cfg.tile_size}&key={cfg.api_key}"
    )


class RateLimiter:
    """Thread-safe token-bucket limiter so total request rate stays under
    TomTom's contracted QPS regardless of ThreadPoolExecutor size."""

    def __init__(self, rate_per_sec: float):
        self._interval = 1.0 / rate_per_sec if rate_per_sec > 0 else 0.0
        self._lock = threading.Lock()
        self._next_slot = time.monotonic()

    def wait(self) -> None:
        if self._interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            slot = max(now, self._next_slot)
            self._next_slot = slot + self._interval
        delay = slot - now
        if delay > 0:
            time.sleep(delay)


@dataclass
class TileResult:
    x: int
    y: int
    zoom: int
    path: str
    success: bool
    error: str = ""


def _tile_cache_path(output_dir: str, index: str, zoom: int, x: int, y: int) -> str:
    return os.path.join(output_dir, "tiles", str(zoom), f"{index}_{x}_{y}.png")


def _looks_like_image(content: bytes) -> bool:
    """TomTom can return HTTP 200 with a JSON error body in some failure
    modes -- don't trust the status code alone."""
    try:
        Image.open(io.BytesIO(content)).verify()
        return True
    except (UnidentifiedImageError, OSError):
        return False


def download_tile(
    session: requests.Session,
    x: int,
    y: int,
    zoom: int,
    cfg: PipelineConfig,
    output_dir: str,
    index: str,
    limiter: RateLimiter,
) -> TileResult:
    dst = _tile_cache_path(output_dir, index, zoom, x, y)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return TileResult(x, y, zoom, dst, True)

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    url = tile_url(x, y, zoom, cfg)
    limiter.wait()
    try:
        resp = session.get(url, timeout=cfg.request_timeout)
    except requests.RequestException as exc:
        log.warning("Request failed for %s -> %s", _redact(url), exc)
        return TileResult(x, y, zoom, dst, False, str(exc))

    if resp.status_code != 200:
        log.warning("Tile fetch failed status=%s url=%s", resp.status_code, _redact(url))
        return TileResult(x, y, zoom, dst, False, f"http_{resp.status_code}")

    if not _looks_like_image(resp.content):
        log.warning("Non-image response for %s (len=%d bytes)", _redact(url), len(resp.content))
        return TileResult(x, y, zoom, dst, False, "invalid_image")

    tmp_path = f"{dst}.{os.getpid()}.part"
    with open(tmp_path, "wb") as f:
        f.write(resp.content)
    os.replace(tmp_path, dst)  # atomic on POSIX
    return TileResult(x, y, zoom, dst, True)


def download_tiles_for_grid(
    cfg: PipelineConfig, center_lat: float, center_lon: float, output_dir: str, index: str
) -> List[TileResult]:
    center_x, center_y = latlon_to_tile(center_lat, center_lon, cfg.zoom)
    session = build_session(cfg)
    limiter = RateLimiter(cfg.requests_per_second)

    coords = [
        (center_x + dx, center_y + dy)
        for dx in range(-cfg.radius, cfg.radius + 1)
        for dy in range(-cfg.radius, cfg.radius + 1)
    ]

    results: List[TileResult] = []
    with ThreadPoolExecutor(max_workers=cfg.max_workers) as ex:
        futures = {
            ex.submit(download_tile, session, x, y, cfg.zoom, cfg, output_dir, index, limiter): (x, y)
            for x, y in coords
        }
        for fut in as_completed(futures):
            results.append(fut.result())

    failed = [r for r in results if not r.success]
    if failed:
        log.warning("%d/%d tiles failed to download", len(failed), len(results))
    return results