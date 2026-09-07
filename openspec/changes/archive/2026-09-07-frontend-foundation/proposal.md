## Why

Backend MVP (Этап 1) is complete and serves `GET/POST /courts`, `GET /courts/{id}` over a working API. The frontend is currently a blank Vite template with Leaflet dependencies installed but no real code. This change builds the frontend foundation: an API client, generated types from the backend's OpenAPI schema, and a working map that loads and clusters courts — the visual backbone everything else (markers, form, app assembly) depends on.

## What Changes

- **2.1** `frontend/src/services/api.ts` — typed client for `GET /courts`, `POST /courts`, `GET /courts/{id}`; base URL sourced from `VITE_API_BASE_URL`.
- **2.2** `frontend/src/types/court.ts` — TypeScript types generated from the backend's OpenAPI schema via `openapi-typescript`, not hand-written.
- **2.3** `frontend/src/components/MapView.tsx` — Leaflet map:
  - **2.3.1** Initialize Leaflet with OSM tiles and `preferCanvas: true`.
  - **2.3.2** Geolocation centering with graceful fallback to a default city center (Tbilisi) on denial/error.
  - **2.3.3** Marker clustering via `leaflet.markercluster`.

## Capabilities

### New Capabilities

- `frontend-mapping`: The frontend's read-oriented map view — API client, backend-derived types, and a Leaflet map that renders and clusters courts. This is the foundation for the interactive court UI delivered in a later change (`frontend-ui`: markers/popups, add-court form, app assembly).

### Modified Capabilities

- (none — backend behavior is unchanged)

## Impact

- **Frontend code**: new `src/services/api.ts`, `src/types/court.ts` (generated), `src/components/MapView.tsx`; `App.tsx` gains the map, replacing the Vite template screen.
- **Dependencies**: `openapi-typescript` added as a dev dependency; `leaflet`, `react-leaflet`, `leaflet.markercluster` already installed.
- **Config**: `VITE_API_BASE_URL` consumed from frontend `.env`.
- **Backend**: no changes — existing schema is the source of truth for generated types.
- **Out of scope**: court markers/popups, add-court form, app-level state assembly — delivered in the follow-on `frontend-ui` change.
