# Visual comparison — 0.2.2

Compared the startup client area at 1920 × 1000 CSS pixels against the supplied
`codex-clipboard-d4bb0663-a552-472a-83c4-8073969bd64d.png`, cropped at
(0, 29, 1920, 1029) to exclude the Windows title bar. No reference image was scaled.
The original open Settings popup, version/copyright label and status hint are
excluded from the aggregate measurement. The new copyright remains turborium.

## Measured changes

| Region | Before | After / reference |
|---|---|---|
| Left boundary of workspace | x=102 | x=100 |
| Layers list | x=1680, y=81.6, width=236 | x=1681, y=82, width=218 |
| Bottom of layers list | y=491.5 | y=493 |
| Color panel | y=495.5 | y=497 |
| RGBA controls | y=807.1, height=100.2 | y=817, height=120 |
| Status bar | y=976 | y=969 |

Adjusted menu spacing, startup action placement, heading, toolbar group gaps,
checkerboard alpha track, color sample spacing, rectangular startup checkbox and
original layer action sprites. Visual correspondence is **not complete**: font
rasterization, some small controls and unexamined dialogs still differ.

Mean absolute RGB error on 1,817,795 compared pixels: **8.4183 → 3.9046** on a
0–255 scale (53.6% error reduction). This is not a percentage of functional or
visual compatibility; large uniform areas dominate this measure. The local
`docs/visual/` folder contains before/after, overlay, difference and metrics.
Recompute with `python scripts/compare_visual.py` (Pillow and NumPy required).

## Palette regression

The original overflow came from 256 swatches with a minimum row height inside a
fixed-height grid without internal scrolling. The palette now replaces the HSB
canvas in the same well, uses fixed 20px rows and scrolls internally. Its toggle
remains outside the scrolling content. The file buttons reserve space in the
color panel rather than overlapping the status bar.

Browser checks:
- 1920×1000: all 256 swatches present, inner scrolling enabled;
  palette bottom 771.8 < RGBA top 788.
- 1280×720: palette bottom 491.8 < RGBA top 508;
  palette file buttons end at 684, above the status bar at 689.
- Switching to palette and back to HSB succeeds; no console errors.

These tests concern the startup shell and palette only, not the full parity plan.
