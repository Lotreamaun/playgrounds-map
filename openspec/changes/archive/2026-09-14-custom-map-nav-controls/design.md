## Context

Today `frontend/src/components/MapView.tsx` renders `<YMapZoomControl />` and `<YMapGeolocationControl onGeolocatePosition={handleGeolocateFallback} />`, both loaded from `@yandex/ymaps3-default-ui-theme` via `frontend/src/services/yandexMaps.ts` (`theme.YMapZoomControl`/`theme.YMapGeolocationControl`, dynamically imported alongside `@yandex/ymaps3-clusterer`). `frontend/src/index.css` line 1 imports the package's base CSS, and a large block (~L969-1020) recolors its icons via `mask-image` data-URIs applied with `!important`, because the package exposes CSS custom properties only for popup tail geometry, not control colors.

Grepped: `@yandex/ymaps3-default-ui-theme` has no other consumer in `frontend/src` — these two controls are its only use.

A parallel branch, `claude/redesign-components-spec-gdxnz9`, independently dropped this package and hand-built the controls (`.map-zoom-control`, `.map-control-btn`, `.map-geolocation-btn` — see its `MapView.tsx`/`index.css`) as part of a broader "Liquid Glass" redesign. Only the control *structure* (grouped zoom buttons with a divider, a separate circular geolocation button, custom handlers replacing the package's built-in behavior) is being adopted here — that branch's translucent glass surface, `GlassStackContext`, and `motion`-driven interactions are explicitly not part of this change (see proposal.md - Non-Goals).

`YMapControl` (the un-themed positioning primitive controls mount into) is part of the base ymaps3 SDK, not the theme package — it is already implicitly available via `base` in `loadYandexMaps` but not yet exposed on the `YandexMapsModules` interface.

## Goals / Non-Goals

**Goals:**
- Remove the last dependency on `@yandex/ymaps3-default-ui-theme` and its mask-image workaround.
- Match the button grouping/shape the app owner liked from the reference branch, rendered with this app's existing opaque surface tokens.
- Preserve existing behavior exactly: click-to-zoom clamped to range (where the zoom control renders), geolocate-with-fallback, and the existing desktop/mobile *positioning* logic (the `<YMapControls position={isMobile ? 'bottom right' : 'top left'}>` wrapper itself is untouched — only which children it contains on mobile changes; `frontend-mapping` "Map controls do not overlap app chrome" is revised accordingly, see specs delta).

**Non-Goals:**
- No glass/blur styling (explicitly rejected by the app owner; keeps `frontend-mapping`'s existing "Native map controls match the app's accent theme" requirement satisfied as-is).
- No `GlassStackContext`/`useGlassNode`, no `motion` package, no spring-physics or ripple effects.
- No change to control placement/positioning logic — the existing `<YMapControls position={isMobile ? 'bottom right' : 'top left'} ...>` wrapper and its responsive behavior are untouched.

## Decisions

### 1. Mount via base `YMapControl`, not the theme package

Add `YMapControl: base.YMapControl` to `YandexMapsModules` in `yandexMaps.ts` and drop the two `theme.*` control exports and the `import('@yandex/ymaps3-default-ui-theme')` call entirely. `YMapControl` is a bare positioning slot with no default chrome, so our own markup supplies 100% of the visual treatment — no `!important` overrides needed anywhere.

### 2. Reuse existing opaque tokens, not new ones

The reference branch's buttons sit on `.glass-l1` (translucent). Since glass was rejected, the new `.map-zoom-control`/`.map-geolocation-btn` classes use `background: var(--surface); box-shadow: var(--shadow-2);` — tokens that already exist in `index.css` and already satisfy `frontend-mapping`'s "Native map controls match the app's accent theme" requirement (opaque surface + shadow, elevation 2). `--radius-md` (already 12px in main) is reused for the container corners; no new CSS custom properties are introduced.

### 3. Icon weight stays `Regular`, only the geolocation glyph changes

The reference branch used `weight="bold"` (zoom) and `weight="fill"` (geolocation) as part of its own visual system. The existing `frontend-mapping` spec pins weight `Regular` for both, and that requirement isn't being revisited — only the geolocation icon shape changes (`Crosshair` → `NavigationArrow`, per the app owner's explicit choice). Implementation uses `weight="regular"` throughout, matching the current zoom icons' existing weight.

### 4. Reimplement zoom/geolocate handlers locally

With the package gone, its built-in click-to-zoom and browser-geolocation-with-fallback logic must move into `MapView.tsx`:
- `handleZoomIn`/`handleZoomOut`: `mapInstanceRef.current.setLocation({ zoom: clamp(currentZoom ± 1, zoomRange) })`.
- `handleGeolocate`: `navigator.geolocation.getCurrentPosition` with an `isLocating` state (disables the button mid-request), success centers on the returned coordinates (center-only, zoom untouched — consistent with the existing `selectedCourt` effect's own center-only reasoning), and both the no-`navigator.geolocation` and error/timeout paths fall back to the default city center. Options: `enableHighAccuracy: true, timeout: 8000, maximumAge: 30000` — chosen to match the just-removed package's observed behavior so the "Geolocation with fallback to default city center" and "Locate-me control on the map" spec scenarios keep passing unchanged.

### 5. Zoom button grouping is a visual/markup detail, not a new spec requirement

The two-button-plus-divider container is adopted because the app owner liked its look, but no current `frontend-mapping` requirement mandates a specific internal button layout — only overall position, color, and icon set are specified, and none of those change here except the one icon swap. So this stays a design-level decision, not a new `### Requirement`.

### 6. Zoom control renders only on desktop

Wrap the zoom `YMapControl` in `{!isMobile && (...)}` in `MapView.tsx`. Mobile users already have the map SDK's native pinch-to-zoom gesture, which is more discoverable on touch than two small buttons — per the app owner's explicit call. The geolocation `YMapControl` is unaffected and keeps rendering on both platforms. No change to the `<YMapControls>` wrapper's `position`/`orientation` props: on mobile it now contains a single child instead of two, so "stacked" no longer describes it — the `frontend-mapping` spec's "Map controls do not overlap app chrome" requirement is revised accordingly (see specs delta), and a new "Zoom control is desktop-only" requirement captures the platform split itself.

## Risks / Trade-offs

- **[Risk] Manual geolocation reimplementation could subtly drift from the package's exact timeout/fallback semantics** → Mitigated by explicit, spec-backed scenarios ("Locate fallback to default center", "User locates themselves") that implementation must satisfy; timeout/maximumAge values are chosen to match observed prior behavior, and Verification (tasks.md) includes manually testing denied/unavailable/slow geolocation.
- **[Risk] Removing the package's CSS `@import` could drop some incidental base style the mask-image block implicitly depended on (e.g. button reset)** → Low risk since the whole control DOM is being replaced with our own markup/CSS, not layered on top of the package's; Verification includes a visual check that no residual/broken styling remains after the `@import` and mask-image block are deleted.
- **[Risk] Conditionally rendering the zoom control could accidentally also hide/break the geolocation control if the `!isMobile` check is misapplied** → Mitigated by scoping the conditional to only the zoom `YMapControl`'s JSX; Verification (tasks.md) explicitly checks that geolocation still renders on mobile after the change.
