## Purpose

Provides the frontend's read-oriented map view: a typed API client, backend-derived TypeScript types, and a Leaflet map that fetches, renders, and clusters courts.

## ADDED Requirements

### Requirement: Typed API client for courts
The frontend SHALL provide a typed API client covering `GET /courts`, `POST /courts`, and `GET /courts/{id}`. The base URL for all requests SHALL come from the `VITE_API_BASE_URL` environment variable.

#### Scenario: Fetching courts within a bounding box
- **WHEN** the frontend requests courts for the current map viewport
- **THEN** it sends a `GET /courts` request with the viewport's bounding-box coordinates and receives only courts inside those bounds

#### Scenario: Fetching a single court by id
- **WHEN** the frontend requests a court by its id
- **THEN** it sends `GET /courts/{id}` and receives that court's data

#### Scenario: Base URL sourced from environment
- **WHEN** the API client is created
- **THEN** it uses the value of `VITE_API_BASE_URL` as the base URL for all requests

### Requirement: Types generated from backend OpenAPI schema
The frontend SHALL derive its court TypeScript types from the backend's OpenAPI schema via a code generator (`openapi-typescript`), rather than hand-writing or manually mirroring them. Generated types SHALL NOT be edited by hand.

#### Scenario: Types reflect the backend contract
- **WHEN** the backend OpenAPI schema changes and the types are regenerated
- **THEN** the generated types reflect the new contract without manual edits

#### Scenario: Types are not hand-maintained
- **WHEN** a developer needs to change a court type
- **THEN** they regenerate from the backend schema rather than editing the generated file directly

### Requirement: Map renders with OSM tiles and canvas rendering
The frontend SHALL render a Leaflet map using OpenStreetMap tiles with canvas rendering enabled (`preferCanvas: true`).

#### Scenario: Map visible in development
- **WHEN** the frontend runs via `npm run dev`
- **THEN** a map with OSM tiles is rendered in the viewport

### Requirement: Geolocation with fallback to default city center
The frontend SHALL attempt to center the map on the user's geolocation. If geolocation is denied, unavailable, or errors, it SHALL instead center on the default city coordinates (Tbilisi).

#### Scenario: Geolocation allowed
- **WHEN** the user grants geolocation permission
- **THEN** the map centers on the user's current coordinates

#### Scenario: Geolocation unavailable
- **WHEN** the user denies permission or geolocation is unavailable
- **THEN** the map centers on the default city coordinates without error

### Requirement: Marker clustering
The frontend SHALL visually cluster nearby court markers so that a dense set of courts is displayed as a single cluster marker.

#### Scenario: Dense markers clustered
- **WHEN** multiple courts are located close together
- **THEN** they are visually combined into a single cluster marker
