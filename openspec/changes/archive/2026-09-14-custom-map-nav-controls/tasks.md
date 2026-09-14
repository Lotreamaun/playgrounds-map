## 1. SDK module wiring

- [x] 1.1 In `frontend/src/services/yandexMaps.ts`: add `YMapControl: base.YMapControl` to `YandexMapsModules` and the object returned from `loadYandexMaps`.
- [x] 1.2 Remove `theme.YMapZoomControl`/`theme.YMapGeolocationControl` from `YandexMapsModules` and the `import('@yandex/ymaps3-default-ui-theme')` call (and the now-unused `theme` local).

## 2. Custom control components

- [x] 2.1 In `frontend/src/components/MapView.tsx`: add `handleZoomIn`/`handleZoomOut` (`mapInstanceRef.current.setLocation({ zoom: ... })`, clamped to `zoomRange.min`/`zoomRange.max`).
- [x] 2.2 Add `isLocating` state and `handleGeolocate` (`navigator.geolocation.getCurrentPosition`, `enableHighAccuracy: true, timeout: 8000, maximumAge: 30000`, center-only on success, fallback to `TBILISI_CENTER` when `navigator.geolocation` is absent or on error/timeout).
- [x] 2.3 Replace `<YMapZoomControl />` with a `YMapControl`-mounted `.map-zoom-control` container: two `.map-control-btn` buttons (Phosphor `Plus`/`Minus`, weight `regular`) separated by a `.map-zoom-control__divider`.
- [x] 2.4 Replace `<YMapGeolocationControl onGeolocatePosition={handleGeolocateFallback} />` with a `YMapControl`-mounted `.map-geolocation-btn` button (Phosphor `NavigationArrow`, weight `regular`), disabled while `isLocating`.
- [x] 2.5 Remove the now-unused `handleGeolocateFallback` if nothing else references it.
- [x] 2.6 In `frontend/src/components/MapView.tsx`: wrap the zoom `YMapControl` (`.map-zoom-control`) in `{!isMobile && (...)}` so it renders on desktop only; the geolocation `YMapControl` keeps rendering unconditionally on both platforms.

## 3. Styling

- [x] 3.1 In `frontend/src/index.css`: add `.map-zoom-control` / `.map-zoom-control__divider` / `.map-control-btn` / `.map-geolocation-btn` rules using `var(--surface)`, `var(--shadow-2)`, `var(--radius-md)` (opaque, no blur/transparency).
- [x] 3.2 Remove line 1's `@import '@yandex/ymaps3-default-ui-theme/dist/esm/index.css'`.
- [x] 3.3 Remove the `.ymaps3--zoom-control__*` / `.ymaps3--geolocation-control*` mask-image recoloring block (~L969-1020) and the now-orphaned `.ymaps3--control-button:has(...)` rule above it.

## 4. Dependency cleanup

- [x] 4.1 Remove `@yandex/ymaps3-default-ui-theme` from `frontend/package.json` and run `npm install` in `frontend/` to update the lockfile.

## 5. Verification

- [x] 5.1 `npm run dev`: confirm zoom in/out buttons change map zoom and clamp at min/max.
- [x] 5.2 Confirm geolocation button centers the map on the browser's reported location when permission is granted.
- [x] 5.3 Deny/block geolocation permission (or simulate unavailable geolocation) and confirm the map falls back to the Tbilisi center without a console error.
- [x] 5.4 Confirm control position and grouping are unchanged: desktop top-left, mobile bottom-right stacked above the search-pill/FAB row, no overlap.
- [x] 5.5 Confirm both controls render as opaque surfaces (`--surface` + shadow) in both light and dark theme, with no blur/translucency.
- [x] 5.6 Visual check that removing the package's CSS `@import` left no broken/residual styling on or around the controls.
- [x] 5.7 `npm run build` and `npm run lint` pass with the dependency removed.
- [x] 5.8 On mobile, confirm only the geolocation button renders (no zoom buttons) and that pinch-to-zoom still works on the map itself.
- [x] 5.9 On desktop, confirm zoom buttons still render and function alongside the geolocation button, unchanged from before.
