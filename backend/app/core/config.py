"""Configuration for the TomTom traffic ETL pipeline.

Everything environment-specific (API key, tuning knobs) is read from
environment variables. Nothing depends on Google Colab's `userdata`, so this
runs the same way locally, in a container, or in CI.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, Tuple
from dotenv import load_dotenv

load_dotenv()

class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


def _get_required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ConfigError(
            f"Required environment variable '{name}' is not set. "
            "Set it via your secrets manager / deployment env, not in code."
        )
    return value


@dataclass(frozen=True)
class PipelineConfig:
    api_key: str
    zoom: int = 14
    radius: int = 6
    style: str = "relative"          # relative | absolute | relative-delay | reduced-sensitivity
    tile_size: int = 512
    output_dir: str = "dataset"
    max_workers: int = 8
    request_timeout: int = 30
    requests_per_second: float = 8.0  # keep under your TomTom plan's QPS limit
    total_retries: int = 5
    backoff_factor: float = 0.5

    @classmethod
    def from_env(cls) -> "PipelineConfig":
        return cls(
            api_key=_get_required_env("TOMTOM_API_KEY"),
            zoom=int(os.environ.get("TOMTOM_ZOOM", 14)),
            radius=int(os.environ.get("TOMTOM_RADIUS", 6)),
            style=os.environ.get("TOMTOM_STYLE", "relative"),
            tile_size=int(os.environ.get("TOMTOM_TILE_SIZE", 512)),
            output_dir=os.environ.get("TOMTOM_OUTPUT_DIR", "dataset"),
            max_workers=int(os.environ.get("TOMTOM_MAX_WORKERS", 8)),
            request_timeout=int(os.environ.get("TOMTOM_REQUEST_TIMEOUT", 30)),
            requests_per_second=float(os.environ.get("TOMTOM_RPS", 8.0)),
        )


# lat, lon
CITY_COORDS: Dict[str, Tuple[float, float]] = {
    "Riyadh": (24.7136, 46.6753),
    "Jeddah": (21.5294, 39.1611),
    "Dammam": (26.4241, 50.0905),
    "Al khobar": (26.2199, 50.1932),
    "Dhahran": (26.2381, 50.0430),
    "Al Qatif": (26.5781, 49.9985),
}