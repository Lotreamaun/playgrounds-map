## 1. API client write path

- [x] 1.1 Extend `src/services/api.ts` with `createCourt(...)` — builds `FormData` (surface, condition, optional photo) and POSTs to `/courts`; parses and surfaces FastAPI error `detail` for non-2xx responses (see design.md — Risks)

## 2. Map stack migration to the Yandex Maps JavaScript API

- [x] 2.1 Replace the Leaflet stack in `frontend/package.json`: remove `leaflet`, `react-leaflet`, `leaflet.markercluster` (and their `@types`); add `@yandex/ymaps3-default-ui-theme` and `@yandex/ymaps3-clusterer` (real npm packages) plus `@yandex/ymaps3-types` as a dev dependency for typings — `@yandex/ymaps3` and `@yandex/ymaps3-reactify` are NOT npm packages (confirmed 404 on the registry); they load only via the vendor's CDN script + `ymaps3.import(...)` at runtime (see design.md — Runtime loaded via CDN script, not npm); drop the Leaflet CSS imports in `MapView.tsx`
- [x] 2.2 Add a bootstrap module (`src/services/yandexMaps.ts`) that injects the `https://api-maps.yandex.ru/v3/?apikey=...&lang=ru_RU` script tag (only when `VITE_YANDEX_MAPS_KEY` is set), awaits `ymaps3.ready`, then resolves `ymaps3.import('@yandex/ymaps3-reactify')` bound to React/ReactDOM; re-implement `src/components/MapView.tsx` to consume this bootstrap (loading state while it resolves, clear message when the key is missing or loading fails), rendering the reactified `YMap`/`YMapDefaultSchemeLayer`/`YMapDefaultFeaturesLayer`; keep the bbox fetch + debounce feeding courts into app state (bbox read from the map instance's `.bounds` getter via a ref)
- [x] 2.3 Cluster courts via `ymaps3.import('@yandex/ymaps3-clusterer')` (`YMapClusterer` + `clusterByGrid`), re-fed whenever the `courts` prop changes; place the controls (zoom, geolocation) from `ymaps3.import('@yandex/ymaps3-default-ui-theme')`

## 3. Court marker and popup

- [x] 3.1 Rework `src/components/CourtMarker.tsx` to render as a ymaps3 `YMapMarker`'s content (via the reactified components from the bootstrap module) showing address, surface, condition, and photo if present — the detail card appears on click, toggled by the marker's own local state (verify address data falls back gracefully when a court has no address)

## 4. Add-court form

- [x] 4.1 Create `src/components/CourtForm.tsx` with fields for surface, condition, and optional photo
- [x] 4.2 Wire map-click coordinates into the form (read-only lat/lng from `App` via map click callback, see design.md — Decisions)
- [x] 4.3 Implement submit via `createCourt`, including a clear user-facing message when the API returns 409 (duplicate) and for other API errors

## 5. Locate control

- [x] 5.1 Add the built-in `YMapGeolocationControl` (from `ymaps3.import('@yandex/ymaps3-default-ui-theme')`) to `MapView` — the locate icon and accessible label come with the control; it re-centers the map on the user's geolocation, falling back to the Tbilisi center on denial/error (reuse the existing geolocation logic in `MapView`)

## 6. App assembly

- [x] 6.1 Rework `App.tsx` to own courts array and add-mode state; pass courts as a prop to `MapView` so markers render from app state (no app-level "selected court" — the detail card is local to each `CourtMarker`, see design.md)
- [x] 6.2 Extend `MapView.tsx` to accept courts as a prop, expose an add-mode map-click callback, and re-render the clustered source when the prop changes
- [x] 6.3 On successful form submit, append the created court to app state so it appears on the map without a page reload; verify `npm run build` type-checks, `npm run lint` passes, and the full flow works in dev