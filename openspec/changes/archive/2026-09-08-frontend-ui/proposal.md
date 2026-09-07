## Why

`frontend-foundation` delivers the read-oriented map (API client, generated types, MapView with clustering). The MVP is still not usable end-to-end: courts render but can't be inspected, and there's no way to add a new court from the UI. This change completes the MVP frontend — court detail in a popup, the add-court form with map-click coordinates, and the app assembly that ties it together (Этап 2 tasks 2.4–2.6). The map foundation itself is upgraded at the same time: the renderer and basemap move from Leaflet + OpenStreetMap to the **Yandex Maps JavaScript API** (ymaps3, free tier) — a Russian map provider — with an on-demand "where am I" control.

## What Changes

- **2.4** `frontend/src/components/CourtMarker.tsx` — court marker with a popup card showing address, surface, condition, and photo (when present).
- **2.5** `frontend/src/components/CourtForm.tsx`:
  - **2.5.1** Clicking the map in add mode fills the court coordinates into the form.
  - **2.5.2** Form fields (surface, condition, optional photo) with submit via the API client and user-facing error handling — including a clear message on duplicate (409) responses.
- **2.6** `frontend/src/App.tsx` — assembly of map, form, and selected-court state; a new court appears on the map after successful submit without a page reload.
- **Map stack migration**: `frontend/src/components/MapView.tsx` is re-implemented on the **Yandex Maps JavaScript API** (ymaps3) via its official React integration (`@yandex/ymaps3-reactify`), loaded at runtime through the API's own module system (`ymaps3.import(...)`) — the base `ymaps3` runtime and `reactify` are not npm packages (confirmed 404 on the registry); they ship only via the vendor's CDN script tag. The `leaflet`, `react-leaflet`, and `leaflet.markercluster` dependencies are removed; `@yandex/ymaps3-types` is added as a dev dependency for TypeScript support, and the real npm packages `@yandex/ymaps3-default-ui-theme` and `@yandex/ymaps3-clusterer` are added.
- **Basemap switch**: the basemap comes bundled with the **Yandex Maps JavaScript API** (Yandex map data — no separate tile URL); the access key is read from `VITE_YANDEX_MAPS_KEY` and the free tier is used.
- **Locate control**: the built-in **`YMapGeolocationControl`** (locate icon and accessible label from the API's UI theme) re-centers the map on the user's geolocation (Tbilisi fallback), in addition to the existing load-time centering.

## Capabilities

### New Capabilities

- `frontend-court-ui`: The interactive court UI built on top of `frontend-mapping` — court detail popups, the add-court form (including map-click coordinate picking), and the app-level state that keeps map, markers, and form consistent.

### Modified Capabilities

- `frontend-mapping`: map rendering switches from Leaflet + OpenStreetMap to the Yandex Maps JavaScript API (free tier, Yandex map data), and an on-demand locate control ("Показать, где я") is added on top of the existing load-time geolocation.

## Impact

- **Frontend code**: new `src/components/CourtMarker.tsx`, `src/components/CourtForm.tsx`; `App.tsx` rewritten for assembly; `MapView` re-implemented on the Yandex Maps JavaScript API to expose court clicks, add-mode coordinate selection, the Yandex basemap, and the locate control.
- **Dependencies**: add `@yandex/ymaps3-default-ui-theme` and `@yandex/ymaps3-clusterer` (real npm packages) plus `@yandex/ymaps3-types` (dev, types only); remove `leaflet`, `react-leaflet`, `leaflet.markercluster` (and their `@types`). The `ymaps3` runtime itself and `@yandex/ymaps3-reactify` are not npm packages — they load from the vendor CDN script (`https://api-maps.yandex.ru/v3/?apikey=...`) and are resolved at runtime via `ymaps3.import(...)`.
- **Config**: `VITE_YANDEX_MAPS_KEY` sourced from the frontend `.env` for the Yandex Maps JS API key (free tier, request limits).
- **API client (`src/services/api.ts`)**: `createCourt` used by the form — the POST path already exists from `frontend-foundation`; no backend changes.
- **Backend**: no changes — existing `POST /courts` (multipart, optional photo) and dedup (409) behavior is consumed as-is.
- **Out of scope**: auth/moderation UI, editing/deleting courts from the client, PWA — all follow later stages per PLAN.md.