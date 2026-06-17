# Session Scope — WA land-cover rasters

_Date: 2026-06-16 · Branch: `develop`_

## Goal

Serve Washington State land-cover rasters in the vizi.ge map, reusing the
existing light-maps tile server (already proxied at `/tiles/*`) rather than
adding a new server or proxy. This Next app only **consumes** the tiles; the
heavy lifting (reprojection, palette application, tiling) stays in light-maps.

## Scope of changes (this repo)

Three thin pieces, all in the Next project:

1. **Env config** — declare where the source rasters live, for light-maps to read.
2. **Map style** — add a raster source + layer so MapLibre renders the tiles.
3. **UI** — a checkbox to toggle the raster layer's visibility.

No `next.config.mjs` change and no new API route — the existing
`/tiles/:path*` → `${TILE_SERVER_URL}/tiles/:path*` rewrite already covers it.

## Outcomes (done & verified)

| File | Change |
|------|--------|
| `.env`, `.env.example` | Added `RASTER_DATA_PATH=~/data/washington-rasters` under the light-maps block (with a comment: EPSG:2927 GeoTIFFs + `.clr` palette, served at `/tiles/wa-rasters/{z}/{x}/{y}.webp`). Live secrets in `.env` left untouched. |
| `public/map-style.json` | Added `wa-rasters` raster **source** (`tiles: /tiles/wa-rasters/{z}/{x}/{y}.webp`, `tileSize: 256`, `minzoom 0` / `maxzoom 14`) and a `wa-rasters` raster **layer** placed right after `background` so vector boundary/county/city lines draw on top. `raster-opacity: 0.85`. Valid JSON. |
| `components/Map.tsx` | Stored map in `mapRef`; `rasterVisible` state (default on); `toggleRaster()` flips the layer `visibility` layout property, guarded by `getLayer()` so it no-ops when light-maps isn't serving the set yet; top-right checkbox control (`right: 52` to clear `NavigationControl`) styled to match existing overlays; cleanup clears `mapRef` before `map.remove()`. `RASTER_LAYER_ID` constant kept in sync with the style id. |

- TypeScript: `npx tsc --noEmit` → exit 0 (clean), run via
  `wsl.exe -d Ubuntu-24.04 -- bash -lc 'cd ~/deployed-projects/vizi.ge && npx tsc --noEmit'`.

## Open issues / external dependencies

- **light-maps must actually serve the set** (out of this repo): read
  `RASTER_DATA_PATH`, reproject EPSG:2927 → web-mercator, apply the
  `ecopia_landcover_raster_colors.clr` palette, and emit `.webp` tiles at
  `/tiles/wa-rasters/{z}/{x}/{y}.webp`. Until then the layer is a silent no-op.
- **`tileSize` 256 vs 512** — set to 256; switch to 512 if light-maps emits
  512px tiles.
- **`maxzoom: 14`** — lower it if tiles overzoom past the native data detail.
- **Visual verification** — not yet run against a live light-maps instance
  serving the raster set.

## Environment notes

- Project lives in WSL (`Ubuntu-24.04`); host is Windows.
- The Bash tool is Git Bash, not WSL — use UNC paths
  (`//wsl.localhost/Ubuntu-24.04/...`) or shell into WSL with
  `wsl.exe -d Ubuntu-24.04 -- bash -lc '...'` for node tooling.
