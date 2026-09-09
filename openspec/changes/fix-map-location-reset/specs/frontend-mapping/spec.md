## MODIFIED Requirements

### Requirement: Marker clustering
The frontend SHALL visually cluster nearby court markers so that a dense set of courts is displayed as a single cluster marker. Clicking a cluster marker SHALL zoom the map in, centered on the cluster's coordinates, until its courts are visually separated into individual markers, and this new position SHALL persist rather than reverting to the map's prior position.

#### Scenario: Dense markers clustered
- **WHEN** multiple courts are located close together
- **THEN** they are visually combined into a single cluster marker

#### Scenario: Clicking a cluster zooms in to split it
- **WHEN** пользователь нажимает на кластер с цифровым индикатором
- **THEN** карта зумится к координатам кластера до уровня, на котором входящие в него площадки отображаются отдельными маркерами, и это новое положение карты сохраняется, а не откатывается обратно

### Requirement: Locate-me control on the map
The frontend SHALL provide a map control that, when activated, centers the map on the user's current location and that displays an icon indicating its purpose ("Показать, где я"). If geolocation is denied, unavailable, or errors, activating the control SHALL center the map on the default city coordinates (Tbilisi) without error. The position applied by this control, and by any other on-map control that programmatically changes the map's center or zoom (e.g. the zoom control), SHALL persist rather than reverting to a previous position on a subsequent UI re-render.

#### Scenario: User locates themselves
- **WHEN** the user activates the locate control and geolocation is permitted
- **THEN** the map re-centers on the user's current coordinates

#### Scenario: Locate fallback to default center
- **WHEN** the user activates the locate control but geolocation is denied or unavailable
- **THEN** the map centers on the default city coordinates without error

#### Scenario: Applied position is not reverted
- **WHEN** элемент управления картой (locate-me, zoom-контрол и т.п.) программно меняет центр или зум карты
- **THEN** это новое положение остаётся на карте и не откатывается обратно к предыдущему на следующем ре-рендере интерфейса
