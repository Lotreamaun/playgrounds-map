## Why

Zoom and geolocation controls currently come from the `@yandex/ymaps3-default-ui-theme` package (`YMapZoomControl`/`YMapGeolocationControl`), recolored via `mask-image` hacks on the package's internal, undocumented CSS classes because it exposes no color customization API. A parallel redesign branch (`claude/redesign-components-spec-gdxnz9`) dropped the package and rebuilt these controls as plain in-app components, and the app owner reviewed that branch and specifically liked the resulting button styling/structure more than main's current mask-image-recolored controls — independent of that branch's broader "Liquid Glass" redesign, which is not being adopted.

## What Changes

- Replace `<YMapZoomControl />` and `<YMapGeolocationControl />` (from `@yandex/ymaps3-default-ui-theme`) with custom in-app React components: a grouped zoom control (Plus/Minus buttons with a divider) and a separate geolocation button, mounted via the base ymaps3 `YMapControl` primitive instead of the theme package's prebuilt controls.
- Styling stays **opaque** (`--surface` + `--shadow-2`, elevation 2), per the existing `frontend-mapping` requirement "Native map controls match the app's accent theme" — no glass/blur is introduced. Only the button shape/grouping/sizing is adopted from the reference branch, not its translucent Liquid Glass surface treatment.
- Reimplement the behavior the package previously provided for free: zoom in/out (`map.setLocation({ zoom: ... })`, clamped to `zoomRange`) and geolocate (`navigator.geolocation.getCurrentPosition` with a loading state and fallback to the default city center on denial/error/timeout).
- **BREAKING (spec-level)**: geolocation icon changes from Phosphor `Crosshair` to `NavigationArrow`, superseding the current spec's explicit icon choice.
- Remove the `@yandex/ymaps3-default-ui-theme` dependency entirely (`frontend/package.json`, the CSS `@import` and mask-image recoloring block in `index.css`, and the dynamic import in `services/yandexMaps.ts`) — confirmed via grep it has no other consumer in the codebase.
- Existing control placement (desktop top-left, mobile bottom-right above the search-pill/FAB row) is unchanged; only the controls' own internals — and, on mobile, which controls render — change.
- **Mobile shows geolocation only**: the zoom control (Plus/Minus) renders on desktop only. On mobile, users already have intuitive pinch-to-zoom on the map itself, so the separate zoom buttons are dropped there; only the geolocation button remains — no longer "stacked" with anything.

**Non-Goals**: no glass/blur styling on these controls (explicitly rejected — see Impact); no `GlassStackContext`, no `motion` package, no spring-physics or ripple effects; no changes to markers, cards, or any other component from the redesign branch.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `frontend-mapping`:
  - "Zoom and geolocation icons match the app's icon system" changes its mandated geolocation icon from `Crosshair` to `NavigationArrow`.
  - "Map controls do not overlap app chrome" is revised: its mobile scenario no longer describes a stack of two controls — only the geolocation button appears in the mobile bottom-right position.
  - New requirement "Zoom control is desktop-only": zoom buttons render only on desktop; mobile relies on the map's native pinch-to-zoom gesture.
  - "Native map controls match the app's accent theme" (opaque, non-glass) stays exactly as already specified; not touched as a delta.

## Impact

- **Code**: `frontend/src/components/MapView.tsx` (control markup + 3 new handlers; zoom `YMapControl` wrapped in an `!isMobile` conditional so it renders on desktop only), `frontend/src/services/yandexMaps.ts` (drop theme import, add base `YMapControl` to `YandexMapsModules`), `frontend/src/index.css` (new `.map-zoom-control`/`.map-control-btn`/`.map-geolocation-btn` rules using existing `--surface`/`--shadow-2`/`--radius-*` tokens; remove the old `@import` and `.ymaps3--*` mask-image block).
- **Dependencies**: removes `@yandex/ymaps3-default-ui-theme` from `frontend/package.json` (no replacement dependency added).
- **Spec**: one requirement in `frontend-mapping` changes its mandated icon (`Crosshair` → `NavigationArrow`); this is a deliberate, user-confirmed reversal of a previously shipped decision, not an oversight.
- **Behavior parity risk**: geolocation's fallback-on-error and 8s timeout/30s max-age behavior must be reproduced manually now that the package no longer provides it — covered by existing spec scenarios under "Locate-me control on the map" and "Geolocation with fallback to default city center", so no spec change needed there, but implementation must preserve them.
