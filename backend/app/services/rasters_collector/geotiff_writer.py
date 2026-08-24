"""Write a stitched, categorized traffic raster to a GeoTIFF, georeferenced
in EPSG:3857 (Web Mercator) -- the native projection of the XYZ tiles, so
the affine transform is exact rather than approximated.
"""
from __future__ import annotations

import logging
from typing import Dict

import numpy as np
import rasterio
from rasterio.transform import from_bounds

from .tile_math import grid_bounds_meters

log = logging.getLogger("tomtom_pipeline.geotiff")


def write_categorized_geotiff(
    categories: np.ndarray,
    center_x: int,
    center_y: int,
    radius: int,
    zoom: int,
    dst_path: str,
    category_codes: Dict[str, int],
) -> None:
    """`categories` must be a single-band (H, W) uint8 array already
    composited onto the (2*radius+1) tile grid centered on (center_x, center_y).
    """
    west, south, east, north = grid_bounds_meters(center_x, center_y, radius, zoom)
    height, width = categories.shape
    transform = from_bounds(west, south, east, north, width, height)

    profile = {
        "driver": "GTiff",
        "dtype": "uint8",
        "count": 1,
        "height": height,
        "width": width,
        "crs": "EPSG:3857",
        "transform": transform,
        "nodata": category_codes.get("no_data", 0),
        "compress": "deflate",
        "predictor": 2,
        "tiled": True,
        #! These block sizes are not the same as the source tiles
        "blockxsize": 256,
        "blockysize": 256,
    }

    with rasterio.open(dst_path, "w", **profile) as dst:
        dst.write(categories, 1)
        # embed the legend so consumers don't need a side-channel to decode
        dst.update_tags(**{f"category_{v}": k for k, v in category_codes.items()})

    log.info("Wrote GeoTIFF: %s (%dx%d, EPSG:3857)", dst_path, width, height)