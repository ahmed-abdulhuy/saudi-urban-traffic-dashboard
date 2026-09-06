"""Color calibration and masking for TomTom Traffic Flow raster tiles.

TomTom's tiles are anti-aliased PNGs -- road pixels are blended with
neighbouring colors, so a raw pixel is rarely an exact legend color.
"Calibration" here means snapping every pixel to the nearest color in a
known legend (nearest-neighbour in RGB space, within a distance threshold);
"masking" then collapses that legend down to a small number of
category codes plus a congestion weight for aggregate scoring.

The legend below (grey/red/yellow/green) reflects the 4-color congestion
scheme already validated against real tile output and used elsewhere in
this project. If you change `style` or zoom, re-verify these values still
match what TomTom renders -- don't assume they're universal across every
product configuration.
"""
from __future__ import annotations

from typing import Dict, Tuple

import numpy as np

RGB = Tuple[int, int, int]

# category name -> (legend RGB, congestion weight, GeoTIFF band code)
# weight: 1.0 = free flow ... ~0 = full stop. no_data has no weight (excluded
# from any aggregate index, not just given weight 0 -- 0 would mean "total
# gridlock", which is a very different thing from "we have no reading here").
CATEGORY_SPEC: Dict[str, Dict] = {
    "free_flow": {"rgb": (43, 200, 43), "weight": 1.0, "code": 1},    # green  #2BC82B
    "moderate":  {"rgb": (255, 255, 55), "weight": 0.9, "code": 2},   # yellow #FFFF37
    "heavy":     {"rgb": (255, 35, 35), "weight": 0.405, "code": 3},  # red    #FF2323
    "severe":    {"rgb": (119, 119, 119), "weight": 0.005, "code": 4},# grey   #777777
}

CATEGORY_CODES: Dict[str, int] = {"no_data": 0, **{k: v["code"] for k, v in CATEGORY_SPEC.items()}}
CATEGORY_WEIGHTS: Dict[int, float] = {v["code"]: v["weight"] for v in CATEGORY_SPEC.values()}
LEGEND: Dict[str, RGB] = {k: v["rgb"] for k, v in CATEGORY_SPEC.items()}

# Derived from CATEGORY_SPEC rather than hand-maintained separately -- a
# second copy of "code -> label"/"label -> color" is exactly the kind of
# thing that quietly drifts out of sync when the legend changes.
CODE_TO_LABEL: Dict[int, str] = {v["code"]: k for k, v in CATEGORY_SPEC.items()}
LEVEL_COLORS: Dict[str, str] = {
    k: f"rgb({v['rgb'][0]},{v['rgb'][1]},{v['rgb'][2]})" for k, v in CATEGORY_SPEC.items()
}

# Euclidean RGB distance beyond which a pixel is treated as unclassifiable
# (road edges, anti-aliasing halos, basemap bleed-through) rather than force-
# fit to the nearest of the 4 legend colors. Tune against your own tiles.
DEFAULT_COLOR_THRESHOLD = 60


def calibrate_and_mask(
    rgba: np.ndarray,
    category_spec: Dict[str, Dict] = CATEGORY_SPEC,
    alpha_threshold: int = 10,
    color_threshold: float = DEFAULT_COLOR_THRESHOLD,
) -> np.ndarray:
    """Classify each pixel of an (H, W, 4) RGBA array to the nearest legend
    color and return an (H, W) uint8 array of category codes (0 = no_data).

    Two things push a pixel to no_data (0):
      - alpha below `alpha_threshold` (tile's transparent background), or
      - RGB distance to every legend color exceeds `color_threshold`
        (anti-aliased edge pixels that aren't confidently any category --
        forcing these to the nearest color would systematically bias edges
        toward whichever category happens to be closest).

    Implementation note: this loops over the (small, fixed) number of legend
    colors rather than building an (H, W, K, 3) broadcast array. For a
    handful of colors that's the same asymptotic cost but with far less
    peak memory -- important since a stitched mosaic at radius=6 is already
    6656x6656 pixels.
    """
    if rgba.ndim != 3 or rgba.shape[2] != 4:
        raise ValueError("Expected an (H, W, 4) RGBA array")

    rgb = rgba[..., :3].astype(np.int32)
    alpha = rgba[..., 3]
    h, w = alpha.shape

    min_dist_sq = np.full((h, w), np.inf)
    best_code = np.zeros((h, w), dtype=np.uint8)
    threshold_sq = color_threshold ** 2

    for spec in category_spec.values():
        color = np.array(spec["rgb"], dtype=np.int32)
        diff = rgb - color
        dist_sq = np.sum(diff * diff, axis=-1)
        better = dist_sq < min_dist_sq
        min_dist_sq[better] = dist_sq[better]
        best_code[better] = spec["code"]

    unclassified = min_dist_sq > threshold_sq
    best_code[unclassified] = CATEGORY_CODES["no_data"]
    best_code[alpha < alpha_threshold] = CATEGORY_CODES["no_data"]
    return best_code


def congestion_index(categories: np.ndarray, weights: Dict[int, float] = CATEGORY_WEIGHTS) -> float:
    """Mean congestion weight over classified pixels (no_data excluded), on
    a 0 (gridlock) - 1 (free flow) scale -- a scalar Traffic-Level-Index for
    the whole snapshot, e.g. for time-series tracking or map coloring.
    Returns float('nan') when there is no classified data at all (e.g.
    every tile failed) -- callers that serialize this to JSON must convert
    NaN to null themselves (see pipeline._json_safe_float), since Python's
    json module accepts NaN as a non-standard extension that most other
    JSON parsers, including any JS frontend's JSON.parse, will reject."""
    mask = categories != CATEGORY_CODES["no_data"]
    if not np.any(mask):
        return float("nan")
    weight_lut = np.zeros(max(weights) + 1, dtype=np.float64)
    for code, w in weights.items():
        weight_lut[code] = w
    return float(weight_lut[categories[mask]].mean())