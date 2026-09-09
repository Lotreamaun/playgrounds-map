## 1. Expose `reactify`

- [ ] 1.1 In `frontend/src/services/yandexMaps.ts`, add `reactify` to the `YandexMapsModules` interface and to the object returned from `loadYandexMaps()` (the module is already loaded locally as `ymaps3React` inside the bootstrap promise).

## 2. Stop `location` from fighting imperative `setLocation()`

- [ ] 2.1 In `frontend/src/components/MapView.tsx`, destructure `reactify` alongside the other modules pulled from `YandexMapsModules`.
- [ ] 2.2 Wrap the `location` prop passed to `<YMap>` with `reactify.useDefault(INITIAL_LOCATION)` instead of passing `INITIAL_LOCATION` directly.
- [ ] 2.3 Add a short inline comment at the `useDefault(...)` call site noting that `location` is seed-only past mount — future camera changes must go through `setLocation()` on the ref, not by changing this prop (per design.md Risk mitigation).

## 3. Verify the fix against every `setLocation()` call site

- [ ] 3.1 Manually verify: clicking a cluster indicator zooms in, centered on the cluster, and the new position persists (does not snap back).
- [ ] 3.2 Manually verify: the split actually happens — if the existing `zoom + 3` step in `handleClusterClick` doesn't reliably separate a cluster's courts into individual markers (or overshoots), adjust the step constant.
- [ ] 3.3 Manually verify: clicking the native zoom control ("+"/"-") persists, no revert.
- [ ] 3.4 Manually verify: activating the locate-me control persists (both the geolocation-granted path and the denied/unavailable fallback-to-Tbilisi path).
- [ ] 3.5 Manually verify: tapping a court marker still re-centers on the selected court without resetting the user's current zoom (the existing `selectedCourt` effect's center-only behavior is unaffected).
- [ ] 3.6 Manually verify: initial map load still centers correctly (geolocation-granted path and denied/unavailable Tbilisi-fallback path in `handleMapRef`).

## 4. Build check

- [ ] 4.1 Run the frontend build/typecheck to confirm the new `reactify` export and `useDefault` usage type-check cleanly.
