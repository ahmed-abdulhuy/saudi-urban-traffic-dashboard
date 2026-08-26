"""Aggregate a categorized traffic GeoTIFF into a hexagon-grid GeoJSON
congestion layer, for map frontends (Leaflet / Mapbox GL / deck.gl).

This operates directly on the pipeline's own output -- the single-band,
category-coded GeoTIFF from geotiff_writer.py -- rather than a rendered RGB
visualization image. That sidesteps two problems an earlier version of
this had to solve the hard way:

1. No color re-classification. Pixel values here are already category
   codes (0=no_data, 1=free_flow, ...) from color_processing.py --
   congestion weight is a direct LUT lookup, not a second nearest-color
   search over RGB.
2. No hand-rolled, approximate lon/lat <-> pixel mapping. A linear
   interpolation across a bounding box in *degrees* is not the same as
   this raster's actual (exact, square-pixel) Web Mercator projection --
   the same distortion this project already hit and fixed once for tile
   georeferencing (see tile_math.py). rasterio's own affine transform is
   exact, not an approximation.

Dependencies: numpy, rasterio (already required elsewhere in this package).
No shapely -- rasterio.features.rasterize accepts plain GeoJSON-like dict
geometries directly, so we don't need a geometry library just to describe
a hexagon.
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.warp import transform as warp_transform

from .color_processing import CATEGORY_CODES, CATEGORY_WEIGHTS, CODE_TO_LABEL, LEVEL_COLORS

log = logging.getLogger("tomtom_pipeline.hex_congestion")

XY = Tuple[float, float]


@dataclass(frozen=True)
class HexGridConfig:
    hex_radius_m: float = 250.0  # circumradius, meters -- tune to city road density
    min_road_pixels: int = 3     # skip hexagons with too little signal to trust


def _weight_lut() -> np.ndarray:
    lut = np.zeros(max(CATEGORY_WEIGHTS) + 1, dtype=np.float32)
    for code, w in CATEGORY_WEIGHTS.items():
        lut[code] = w
    return lut


def _hex_corners(cx: float, cy: float, size: float) -> List[XY]:
    """6 corners of a pointy-top hexagon, circumradius `size`, in the
    raster's own CRS units (meters -- our GeoTIFFs are EPSG:3857)."""
    return [
        (cx + size * math.cos(math.radians(60 * i - 30)), cy + size * math.sin(math.radians(60 * i - 30)))
        for i in range(6)
    ]


def _generate_hex_centers(xmin: float, xmax: float, ymin: float, ymax: float, size: float) -> List[XY]:
    horiz = math.sqrt(3) * size  # distance between adjacent centers, same row
    vert = 1.5 * size            # distance between rows
    centers: List[XY] = []
    row = 0
    y = ymin
    while y - vert <= ymax:
        x_offset = (horiz / 2) if (row % 2) else 0
        x = xmin + x_offset
        while x - horiz <= xmax:
            centers.append((x, y))
            x += horiz
        y += vert
        row += 1
    return centers


def build_hexagon_geojson(geotiff_path: str, cfg: HexGridConfig = HexGridConfig()) -> Dict:
    """Reads a categorized traffic GeoTIFF and returns a GeoJSON
    FeatureCollection of hexagons in WGS84 (lon/lat, as RFC 7946 requires),
    each carrying a mean congestion score/level for that area.

    Rasterizes every hexagon in a single pass (each raster pixel labeled
    with the 1-based index of the hexagon it falls in), then aggregates
    with a single unweighted np.bincount over a combined (hexagon, category)
    index rather than a boolean mask + weighted bincount over the full
    raster -- weighted bincount was profiled at several seconds on a
    6656x6656 raster with ~6,400 hexagons, almost entirely in the weighted
    accumulation itself; folding (hex_id, category_code) into one integer
    and doing a single plain bincount, then reducing the resulting tiny
    (n_hex x n_codes) table with a small matrix multiply, does the same
    aggregation without ever materializing a weighted array the size of
    the raster.
    """
    with rasterio.open(geotiff_path) as ds:
        band = ds.read(1)
        transform = ds.transform
        crs = ds.crs
        bounds = ds.bounds

    weight_lut = _weight_lut()
    n_codes = len(weight_lut)
    centers = _generate_hex_centers(bounds.left, bounds.right, bounds.bottom, bounds.top, cfg.hex_radius_m)
    corners_by_hex = [_hex_corners(cx, cy, cfg.hex_radius_m) for cx, cy in centers]
    n_hex = len(centers)

    with rasterio.Env():
        # id 0 = "outside every hexagon" (rasterize's fill value); ids 1..n_hex
        # are the hexagons themselves. One call over the whole raster instead
        # of one small call per hexagon.
        shapes = [
            (
                {"type": "Polygon", "coordinates": [[[x, y] for x, y in corners + [corners[0]]]]},
                i + 1,
            )
            for i, corners in enumerate(corners_by_hex)
        ]
        hex_id_raster = rasterize(shapes, out_shape=band.shape, transform=transform, fill=0, dtype="int32")

        # (n_hex+1) * n_codes stays small (a few tens of thousands) even for
        # thousands of hexagons, so this combined index and the bincount
        # output are cheap regardless of how big the raster itself is.
        combined = hex_id_raster * n_codes + band
        flat_counts = np.bincount(combined.ravel(), minlength=(n_hex + 1) * n_codes)
        counts_2d = flat_counts.reshape(n_hex + 1, n_codes)

        no_data_code = CATEGORY_CODES["no_data"]
        data_cols = [c for c in range(n_codes) if c != no_data_code]
        pixel_count = counts_2d[:, data_cols].sum(axis=1)
        weight_sum = counts_2d[:, data_cols] @ weight_lut[data_cols]

        keep = [i for i in range(n_hex) if pixel_count[i + 1] >= cfg.min_road_pixels]
        if not keep:
            log.info("Built hexagon layer: 0 hexagons from %s (nothing met min_road_pixels)", geotiff_path)
            return {"type": "FeatureCollection", "features": []}

        # Batch-reproject every surviving hexagon's ring in one call instead
        # of one warp_transform call per hexagon.
        all_xs: List[float] = []
        all_ys: List[float] = []
        for i in keep:
            ring = corners_by_hex[i] + [corners_by_hex[i][0]]
            all_xs.extend(p[0] for p in ring)
            all_ys.extend(p[1] for p in ring)
        all_lons, all_lats = warp_transform(crs, "EPSG:4326", all_xs, all_ys)

    points_per_hex = 7  # 6 corners + repeated closing point
    features = []
    for k, i in enumerate(keep):
        mean_score = float(weight_sum[i + 1] / pixel_count[i + 1])
        nearest_code = min(CATEGORY_WEIGHTS.items(), key=lambda kv: abs(kv[1] - mean_score))[0]
        label = CODE_TO_LABEL[nearest_code]

        lo = k * points_per_hex
        hi = lo + points_per_hex
        ring_lonlat = list(zip(all_lons[lo:hi], all_lats[lo:hi]))

        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [[[lon, lat] for lon, lat in ring_lonlat]]},
                "properties": {
                    "congestion_score": round(mean_score, 3),
                    "congestion_level": label,
                    "color": LEVEL_COLORS[label],
                    "road_pixel_count": int(pixel_count[i + 1]),
                },
            }
        )

    log.info("Built hexagon layer: %d hexagons from %s", len(features), geotiff_path)
    return {"type": "FeatureCollection", "features": features}