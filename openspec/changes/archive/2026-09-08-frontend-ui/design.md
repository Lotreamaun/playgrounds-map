## Context

`frontend-foundation` established the read path: `src/services/api.ts` (typed `getCourts(bbox)`, `getCourt(id)`), generated types in `src/types/court.ts`, and `MapView.tsx` on the Leaflet stack (OSM tiles, `preferCanvas: true`, geolocation with Tbilisi fallback, bbox fetch with debounce, `MarkerClusterGroup`). This change completes the interactive layer on top — court detail popups, the add-court form, and the app assembly — and simultaneously replaces the map foundation itself: the renderer and basemap move from Leaflet + OpenStreetMap to the **Yandex Maps JavaScript API** (ymaps3) on its free tier, a Russian provider whose map data ships with the API itself. An on-demand **"Показать, где я"** control is added on top of the existing load-time geolocation. See proposal.md — Why and What Changes.

## Goals / Non-Goals

**Goals:**
- Court markers that open a detail popup (address, surface, condition, photo).
- An add-court form fed by map clicks, submitting via the existing `POST /courts` path with clear handling of the 409 duplicate.
- `App.tsx` as the state owner wiring map, markers, form, and "new court appears without reload".
- Map stack migrated to the Yandex Maps JavaScript API (free tier) — Russian map data bundled with the API, built-in controls (incl. geolocation), no separate tile setup.
- A "Показать, где я" locate control that re-centers the map on the user's geolocation on demand.

**Non-Goals:**
- Edit/delete courts from the client; auth or moderation UI.
- New map capabilities beyond the migration: no 3D/terrain, no routing or geocoding UI, no offline/PWA map.
- Reworking the map data flow: bbox fetch + debounce semantics are preserved, only the renderer and basemap change.
- Backend changes of any kind — existing 409 dedup and multipart behavior is consumed as-is.

## Decisions

### `App.tsx` owns shared UI state
`App` holds: courts array and add-mode flag. It passes down the state and callbacks; `MapView` remains a controlled-ish component (props + events), `CourtForm` is a dumb form. There is no app-level "selected court" — since the detail card lives inside the marker itself (see "CourtCard lives in the marker popup" below), each `CourtMarker` owns its own open/closed state; App doesn't need to track which court is selected.
- **Alternative considered**: keeping courts in `MapView` local state (as foundation designed) and lifting everything else into `App`. Rejected — the form must add a court to the map, so courts has to live where the form's result can reach it.
- **Rationale**: this "lift state up" is the minimal change to foundation's local-state choice while preserving the no-global-store (Redux/Zustand) direction from foundation design; keeping selection local to each marker avoids state that has no other consumer.

### Add-mode and click→coords via callbacks
`App` toggles add-mode; `MapView` gets an `onMapClick(lat, lng)` callback enabled only in add-mode. `CourtForm` receives the picked coordinates as props and shows them read-only (or editable).
- **Alternative considered**: form owns click subscription via the map library's events internally. Rejected — that couples the form to the map instance and duplicates event handling; an explicit callback from `MapView` keeps one event source.
- **Rationale**: single source of clicks, trivial to reuse later (e.g., edit mode).

### Map stack migrated to the Yandex Maps JavaScript API
`MapView` is re-implemented on the Yandex Maps JavaScript API (ymaps3, namespace `ymaps3`, components prefixed `YMap`) via its official React integration `@yandex/ymaps3-reactify`. Marker clustering uses `@yandex/ymaps3-clusterer` (`YMapClusterer` + `clusterByGrid`) instead of `leaflet.markercluster`, fed from the `courts` prop and re-populated whenever the prop changes. Controls (zoom, geolocation) come from `@yandex/ymaps3-default-ui-theme`.
- **Alternative considered**: staying on Leaflet — rejected, the project is in maintenance mode and the visuals are exactly the "плохо выглядит" problem being solved; MapLibre GL JS with a 2ГИС basemap — previously chosen, rejected: the user prefers a free provider and 2ГИС turns paid after the demo key while requiring separate tile setup; OpenLayers — rejected, heavier GIS-oriented API and steeper learning curve, overkill for an MVP cart; 2ГИС MapGL SDK — rejected, proprietary and paid.
- **Rationale**: the Yandex JS API is a Russian provider whose free tier matches the user's preference, the basemap ships with the API (no tile URL/XYZ config), it offers a first-class React integration, and the built-in geolocation control satisfies the locate requirement out of the box.

### Runtime loaded via CDN script, not npm
`ymaps3` itself and `@yandex/ymaps3-reactify` are **not published to npm** — verified directly (`npm view @yandex/ymaps3` and `npm view @yandex/ymaps3-reactify` both return 404). The API loads at runtime via a `<script src="https://api-maps.yandex.ru/v3/?apikey=${VITE_YANDEX_MAPS_KEY}&lang=ru_RU">` tag injected by a small bootstrap module (`src/services/yandexMaps.ts`), not a static tag in `index.html` — this lets the app skip loading entirely and show the "key missing" message instead when `VITE_YANDEX_MAPS_KEY` is empty. Once the script loads and `ymaps3.ready` resolves, `reactify`, the clusterer, and the default UI theme are obtained via `ymaps3.import('@yandex/ymaps3-reactify' | '@yandex/ymaps3-clusterer' | '@yandex/ymaps3-default-ui-theme')` and bound to React (`reactify.bindTo(React, ReactDOM)`, then `reactify.module(...)` per raw module). `@yandex/ymaps3-types` is added as a dev dependency purely for editor/type-check support (it declares the global `const ymaps3`); `@yandex/ymaps3-default-ui-theme` and `@yandex/ymaps3-clusterer` are added as real npm dependencies (confirmed present on the registry) so their types are available locally, but they are loaded at runtime the same way as reactify (`ymaps3.import`) for one consistent bootstrap path.
- **Alternative considered**: installing `@yandex/ymaps3` and `@yandex/ymaps3-reactify` from npm as originally planned — rejected, they don't exist on the registry.
- **Rationale**: matches Yandex's own documented integration path (confirmed against the package READMEs and JS API docs); keeps one loading mechanism (`ymaps3.import`) for every ymaps3-namespaced module instead of mixing plain ESM imports for some and CDN-resolved imports for others.

### Yandex basemap ships with the JS API
The base layer comes with the Yandex Maps JavaScript API itself — Yandex map data, no separate tile URL or XYZ configuration. The API key is read from `VITE_YANDEX_MAPS_KEY` in the frontend `.env` (registration via the Yandex Maps API cabinet; free tier with request limits). If `VITE_YANDEX_MAPS_KEY` is missing, `MapView` shows a clear message instead of a blank map — unlike a tile provider, the Yandex JS API cannot render without a key.
- **Alternative considered**: 2ГИС raster/vector tiles — rejected, turns paid after the demo month and needs separate XYZ/MVT setup; OpenStreetMap tiles — rejected, the user wants a Russian provider; MapLibre + 2ГИС — rejected above.
- **Rationale**: lowest-friction integration (basemap + renderer + controls in one vendor), free tier, and the provider/renderer can be swapped later by changing only `MapView` internals since the map data flow (bbox fetch + debounce) is library-neutral.
- **Note**: the free tier has request limits — Yandex coverage in Tbilisi is decent but weaker than 2ГИС; upgrading to a paid tariff is an operational decision, not a code change.

### Marker refresh without page reload
On successful form submit, `App` appends the created court to its court array; `MapView` re-populates the clusterer source from the new prop. No `window.location.reload()`.
- **Alternative considered**: re-fetch the bbox after submit. Rejected for MVP — appending the server-confirmed record is cheaper and immediate; a future re-fetch becomes relevant when sharing/co-editing arrives (v1+).
- **Rationale**: matches the "без перезагрузки страницы" acceptance criterion in PLAN.md 2.5.2 and keeps UX instant.

### CourtCard lives in the marker popup
Popup content is a small card rendered inside `CourtMarker`'s ymaps3 `YMapMarker` (marker content shown on click), showing address, surface, condition, and photo (conditionally). No separate route/page — single-screen MVP per PLAN.md.
- **Alternative considered**: a side panel for the selected court. Rejected — MVP is explicitly single-screen map + form; popup keeps it contained.
- **Rationale**: simplest path to "клик по маркеру открывает попап с карточкой площадки" (PLAN.md 2.4).

### Locate control ("Показать, где я")
The map uses the API's built-in `YMapGeolocationControl` (from `@yandex/ymaps3-default-ui-theme`) — it ships with a locate icon and an accessible label. It re-centers the map on the user's geolocation on demand; on denial/unavailability the control falls back to the Tbilisi center (same fallback coordinates as load-time geolocation).
- **Alternative considered**: a custom control with an icon package (e.g. `lucide-react`). Rejected — Yandex's built-in control already provides the icon and accessibility, so an extra icon dependency is unnecessary.
- **Rationale**: one geolocation code path shared by the load-time centering and the button, with zero custom UI to maintain.

## Risks / Trade-offs

- [Lifting courts state into `App` reworks foundation's `MapView` internals] → Contained: keep `MapView`'s fetch/debounce semantics inside, only change the renderer and the data source to a prop with a refresh callback.
- [409 handling needs the exact error body from FastAPI] → `createCourt` should surface non-2xx responses (parse `detail`); the form maps 409 to a clear duplicate message.
- [Map clicks in add-mode conflict with marker clicks] → Add-mode gates the click handler; out of add-mode, marker clicks win.
- [Photo upload in multipart form needs correct `FormData` construction] → `createCourt` builds `FormData` and sets no manual content-type header so the boundary is set by the browser.
- [Yandex JS API has request limits on the free tier and needs a key] → key via `VITE_YANDEX_MAPS_KEY`; without a key `MapView` shows a clear message (no keyless render, unlike a tile provider); exceeding limits or needing better Tbilisi coverage is an operational/tariff concern, not a code change.
- [Yandex JS API loads from the vendor's CDN and requires a key at runtime] → modern browsers are the target; when the key is missing or the CDN is blocked, `MapView` shows a clear status message so the failure is visible and diagnosable.