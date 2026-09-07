## Context

Backend MVP (Этап 1) is complete: `backend/app` exposes `GET /courts` (bounded-box filter), `POST /courts` (multipart with optional photo), `GET /courts/{id}`, `DELETE /courts/{id}`, `GET /health`, with a SQLModel `Court` schema. The frontend is a blank Vite React template with `leaflet`, `react-leaflet`, and `leaflet.markercluster` already installed but no application code. This change establishes the frontend's read path: typed API client, generated types, and a rendering map. See proposal.md — Why for motivation.

## Goals / Non-Goals

**Goals:**
- A typed, environment-configurable API client for the court read endpoints.
- Court types derived from the backend OpenAPI schema, not hand-written.
- A Leaflet map that renders OSM tiles, centers via geolocation (falling back to Tbilisi), and clusters markers.

**Non-Goals:**
- Court markers/popups with cards, the add-court form, and app-level selected-court state — these belong to the follow-on `frontend-ui` change.
- Write operations (`POST /courts`) UI; the client covers the call but no add-form is built here.
- Refactoring the backend or its schema.

## Decisions

### API client in `src/services/api.ts`
A single module exporting typed async functions (`getCourts(bbox)`, `getCourt(id)`), reading `import.meta.env.VITE_API_BASE_URL` for the base URL with a sensible dev fallback (`http://localhost:8000`).
- **Alternative considered**: a full fetch wrapper class / axios. Rejected — the MVP has three endpoints; a lightweight typed function module is simpler and matches the codebase's lean style.
- **Rationale**: keeps the mapping layer independent of fetch details and gives `MapView` a clean seam for testing.

### Types generated via `openapi-typescript`
Add `openapi-typescript` as a dev dependency and add an npm script (e.g. `types:court`) that fetches `/openapi.json` from the backend and emits `src/types/court.ts`. Generated file is committed but never hand-edited; regenerate on schema changes.
- **Alternative considered**: hand-writing types. Rejected — the project explicitly requires generation (`types/court.ts` не писать вручную) to avoid drift from the backend contract.
- **Rationale**: single source of truth (backend schema) produces types that always match the API.

### `MapView.tsx` owns Leaflet lifecycle
`MapView` initializes a Leaflet `MapContainer` with OSM tile layer and `preferCanvas: true`, manages geolocation centering (with Tbilisi fallback), and hosts an `MarkerClusterGroup` fed by courts from the API. React state for courts lives in the component; bbox-based fetching is triggered on map move with `useMapEvents`.
- **Alternative considered**: storing fetch results in global state (Redux/Zustand). Rejected for MVP — single view, local state suffices; global state belongs with `frontend-ui` if needed.
- **Rationale**: react-leaflet v5 pairs naturally with React state and keeps the component self-contained for the follow-on change.

### Bounding-box fetch strategy
The map fetches courts matching the current viewport bounding box on move/load, matching the backend's `GET /courts` filter. A debounce avoids flooding the API during pan/zoom.
- **Alternative considered**: fetching all courts once. Rejected — the backend is explicitly designed around bbox filtering; matching scope keeps payloads small as the dataset grows.
- **Rationale**: aligns frontend with the established backend contract and scales with data.

## Risks / Trade-offs

- [Geolocation denied/unavailable leaves an edge where map fetch still happens] → Fallback to Tbilisi happens first; fetch runs against the fallback center so the map is never empty.
- [Backend schema drift invalidates generated types] → Regeneration workflow via npm script; `npm run build` type-checks the generated file.
- [React 19 + react-leaflet v5 compatibility] → Dependencies are already pinned and installed; verified during dev run in task 2.3.1.
- [OSM tile usage terms / rate limits in dev] → MVP dev-only usage; acceptable at this stage.
