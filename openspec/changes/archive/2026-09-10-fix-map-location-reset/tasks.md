## 1. Expose `reactify`

- [x] 1.1 In `frontend/src/services/yandexMaps.ts`, add `reactify` to the `YandexMapsModules` interface and to the object returned from `loadYandexMaps()` (the module is already loaded locally as `ymaps3React` inside the bootstrap promise).

## 2. Stop `location` from fighting imperative `setLocation()`

- [x] 2.1 In `frontend/src/components/MapView.tsx`, destructure `reactify` alongside the other modules pulled from `YandexMapsModules`.
- [x] 2.2 Wrap the `location` prop passed to `<YMap>` with `reactify.useDefault(INITIAL_LOCATION)` instead of passing `INITIAL_LOCATION` directly.
- [x] 2.3 Add a short inline comment at the `useDefault(...)` call site noting that `location` is seed-only past mount — future camera changes must go through `setLocation()` on the ref, not by changing this prop (per design.md Risk mitigation).
- [x] 2.4 In `handleClusterClick`, accept the `clustered` features array, compute a bounding box of their coordinates, and derive the minimum zoom level at which the farthest pair of courts separates beyond the 64px grid threshold — replacing the fixed `zoom + 3` step.

## 3. Verify the fix against every `setLocation()` call site

- [x] 3.1 Manually verify: clicking a cluster indicator zooms in, centered on the cluster, and the new position persists (does not snap back).
- [x] 3.2 Manually verify: the split actually happens — clicking a cluster with courts that are very close together (e.g. across the street) separates them into individual markers in a single click.
- [x] 3.3 Manually verify: clicking the native zoom control ("+"/"-") persists, no revert.
- [x] 3.4 Manually verify: activating the locate-me control persists (both the geolocation-granted path and the denied/unavailable fallback-to-Tbilisi path).
- [x] 3.5 Manually verify: tapping a court marker still re-centers on the selected court without resetting the user's current zoom (the existing `selectedCourt` effect's center-only behavior is unaffected).
- [x] 3.6 Manually verify: initial map load still centers correctly (geolocation-granted path and denied/unavailable Tbilisi-fallback path in `handleMapRef`).

## 4. Build check

- [x] 4.1 Run the frontend build/typecheck to confirm the new `reactify` export and `useDefault` usage type-check cleanly.
