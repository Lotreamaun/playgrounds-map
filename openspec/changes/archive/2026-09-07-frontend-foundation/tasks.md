## 1. API client and types

- [x] 1.1 Add `openapi-typescript` as a dev dependency and an npm script (`types:court`) that generates `src/types/court.ts` from the backend's `/openapi.json`
- [x] 1.2 Run the generator and commit the resulting `src/types/court.ts` (verify it covers `Court`, listing, and single-court responses); types are not hand-edited
- [x] 1.3 Create `src/services/api.ts` — typed functions `getCourts(bbox)`, `getCourt(id)` using `fetch`, base URL from `VITE_API_BASE_URL` with dev fallback `http://localhost:8000`

## 2. Map view

- [x] 2.1 Create `src/components/MapView.tsx` that initializes a Leaflet map with OSM tiles and `preferCanvas: true` (see design.md — Decisions); verify it renders via `npm run dev`
- [x] 2.2 Implement geolocation centering with fallback to default Tbilisi center coordinates on denial/error
- [x] 2.3 Fetch courts for the current viewport bounding box on move/load with debounce, and render markers via `MarkerClusterGroup`
- [x] 2.4 Wire `MapView` into `App.tsx`, replacing the Vite template screen; verify `npm run build` type-checks and the map loads in dev with clustered markers