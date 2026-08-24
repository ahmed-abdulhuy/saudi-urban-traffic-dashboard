"""Tile math for XYZ/Google slippy-map tiles and Web Mercator georeferencing.

Kept separate from I/O code so it can be unit-tested without a network.
"""
from __future__ import annotations

import math
from typing import Tuple

EARTH_CIRCUMFERENCE_M = 2 * math.pi * 6378137.0
ORIGIN_SHIFT_M = EARTH_CIRCUMFERENCE_M / 2.0  # ~20037508.3428


def latlon_to_tile(lat_deg: float, lon_deg: float, zoom: int) -> Tuple[int, int]:
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    x_tile = int((lon_deg + 180.0) / 360.0 * n)
    y_tile = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return x_tile, y_tile


def tile_bounds_latlon(x: int, y: int, zoom: int) -> Tuple[float, float, float, float]:
    """(north, west, south, east) in degrees. Display/debugging only --
    for georeferencing use tile_bounds_meters, since degree spacing is
    non-linear under a Mercator projection.
    """
    n = 2.0 ** zoom
    lon_w = x / n * 360.0 - 180.0
    lon_e = (x + 1) / n * 360.0 - 180.0
    lat_n = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_s = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lat_n, lon_w, lat_s, lon_e


def tile_bounds_meters(x: int, y: int, zoom: int) -> Tuple[float, float, float, float]:
    """Exact EPSG:3857 (Web Mercator) bounds of a Google/XYZ tile as
    (min_x, min_y, max_x, max_y) in meters. Each tile is an exact square in
    this projection, which is what makes a simple linear affine transform
    valid for the stitched GeoTIFF -- lat/lon degrees would not be.
    """
    n = 2 ** zoom
    tile_size_m = EARTH_CIRCUMFERENCE_M / n
    min_x = -ORIGIN_SHIFT_M + x * tile_size_m
    max_x = min_x + tile_size_m
    max_y = ORIGIN_SHIFT_M - y * tile_size_m
    min_y = max_y - tile_size_m
    return min_x, min_y, max_x, max_y


def grid_bounds_meters(center_x: int, center_y: int, radius: int, zoom: int) -> Tuple[float, float, float, float]:
    """EPSG:3857 (west, south, east, north) bounds of the full
    (2*radius+1)^2 tile grid centered on (center_x, center_y)."""
    tl_min_x, _, _, tl_max_y = tile_bounds_meters(center_x - radius, center_y - radius, zoom)
    _, br_min_y, br_max_x, _ = tile_bounds_meters(center_x + radius, center_y + radius, zoom)
    west, north = tl_min_x, tl_max_y
    east, south = br_max_x, br_min_y
    return west, south, east, north