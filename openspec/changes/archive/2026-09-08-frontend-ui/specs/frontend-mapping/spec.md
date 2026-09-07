## MODIFIED Requirements

### Requirement: Map renders with the Yandex Maps JavaScript API
The frontend SHALL render the map with the Yandex Maps JavaScript API (ymaps3) on the free tier. The API SHALL be initialized using an access key sourced from the `VITE_YANDEX_MAPS_KEY` environment variable; the base layer SHALL come from the API itself (Yandex map data, no separate tile configuration). When the key is unset or empty, the viewport SHALL show a clear message instead of a blank or broken map.

#### Scenario: Map visible in development
- **WHEN** the frontend runs via `npm run dev` and `VITE_YANDEX_MAPS_KEY` is set
- **THEN** a Yandex map with the default basemap is rendered in the viewport

#### Scenario: Missing or empty API key
- **WHEN** `VITE_YANDEX_MAPS_KEY` is unset or empty
- **THEN** the viewport shows a clear message that a Yandex Maps key is required, instead of a blank or broken map

## ADDED Requirements

### Requirement: Locate-me control on the map
The frontend SHALL provide a map control that, when activated, centers the map on the user's current location and that displays an icon indicating its purpose ("Показать, где я"). If geolocation is denied, unavailable, or errors, activating the control SHALL center the map on the default city coordinates (Tbilisi) without error.

#### Scenario: User locates themselves
- **WHEN** the user activates the locate control and geolocation is permitted
- **THEN** the map re-centers on the user's current coordinates

#### Scenario: Locate fallback to default center
- **WHEN** the user activates the locate control but geolocation is denied or unavailable
- **THEN** the map centers on the default city coordinates without error