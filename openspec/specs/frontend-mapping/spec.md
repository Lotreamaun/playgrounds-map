## Purpose

Provides the frontend's read-oriented map view: a typed API client, backend-derived TypeScript types, and a Yandex Maps JS API (ymaps3) map that fetches, renders, and clusters courts.

## Requirements

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

### Requirement: API client can fetch all courts without a bounding box
Типизированный API-клиент SHALL поддерживать запрос `GET /courts` без bounding box, возвращающий все площадки. Это необходимо для заполнения списка, не ограниченного текущим вьюпортом карты.

#### Scenario: Fetching all courts
- **WHEN** клиент запрашивает `GET /courts` без параметров bounding box
- **THEN** ответ содержит все доступные площадки независимо от вьюпорта карты

#### Scenario: Existing bbox fetch still supported
- **WHEN** клиент запрашивает `GET /courts` с параметрами bounding box
- **THEN** поведение не меняется: возвращаются только площадки внутри границ

### Requirement: Types generated from backend OpenAPI schema
The frontend SHALL derive its court TypeScript types from the backend's OpenAPI schema via a code generator (`openapi-typescript`), rather than hand-writing or manually mirroring them. Generated types SHALL NOT be edited by hand.

#### Scenario: Types reflect the backend contract
- **WHEN** the backend OpenAPI schema changes and the types are regenerated
- **THEN** the generated types reflect the new contract without manual edits

#### Scenario: Types are not hand-maintained
- **WHEN** a developer needs to change a court type
- **THEN** they regenerate from the backend schema rather than editing the generated file directly

### Requirement: Map renders with the Yandex Maps JavaScript API
The frontend SHALL render the map with the Yandex Maps JavaScript API (ymaps3) on the free tier. The API SHALL be initialized using an access key sourced from the `VITE_YANDEX_MAPS_KEY` environment variable; the base layer SHALL come from the API itself (Yandex map data, no separate tile configuration). When the key is unset or empty, the viewport SHALL show a clear message instead of a blank or broken map.

#### Scenario: Map visible in development
- **WHEN** the frontend runs via `npm run dev` and `VITE_YANDEX_MAPS_KEY` is set
- **THEN** a Yandex map with the default basemap is rendered in the viewport

#### Scenario: Missing or empty API key
- **WHEN** `VITE_YANDEX_MAPS_KEY` is unset or empty
- **THEN** the viewport shows a clear message that a Yandex Maps key is required, instead of a blank or broken map

### Requirement: Geolocation with fallback to default city center
The frontend SHALL attempt to center the map on the user's geolocation. If geolocation is denied, unavailable, or errors, it SHALL instead center on the default city coordinates (Tbilisi).

#### Scenario: Geolocation allowed
- **WHEN** the user grants geolocation permission
- **THEN** the map centers on the user's current coordinates

#### Scenario: Geolocation unavailable
- **WHEN** the user denies permission or geolocation is unavailable
- **THEN** the map centers on the default city coordinates without error

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

### Requirement: Map remains a full-screen canvas behind sheets on mobile
На мобильном карта SHALL оставаться полноэкранной постоянной подложкой. Вторичный UI (поиск-pill, кнопка добавления FAB, zoom/геолокация, шторки, модалка формы) SHALL накладываться поверх карты, не заменяя её отдельной страницей. Выделенного докнутого на всю ширину верхнего бара SHALL не быть.

#### Scenario: Map persists behind the top bar and FAB
- **WHEN** пользователь работает на мобильном
- **THEN** поверх карты отображаются поиск-pill и кнопка добавления (FAB) — выделенного верхнего бара больше нет, его функцию выполняет поиск-pill — а карта остаётся полноэкранной под ними

#### Scenario: Map stays interactive when a sheet is closed
- **WHEN** пользователь закрывает шторку или модалку
- **THEN** карта вновь на весь экран и принимает касания без перезагрузки

### Requirement: Court markers display a sport icon

Маркер площадки на карте SHALL отображать иконку, соответствующую виду спорта площадки (`sport_type`), вместо пустой точки, залитую категориальным цветом этого вида спорта (не акцентным цветом приложения). Для баскетбольной площадки SHALL использоваться иконка баскетбольного мяча. Для вида спорта без сопоставленной иконки SHALL использоваться понятная иконка по умолчанию, залитая нейтральным цветом, без ошибки рендеринга.

#### Scenario: Basketball court shows a basketball icon
- **WHEN** на карте отображается маркер баскетбольной площадки
- **THEN** маркер показывает иконку баскетбольного мяча внутри пина, залитого категориальным цветом баскетбола

#### Scenario: Unmapped sport type falls back to a default icon
- **WHEN** на карте отображается маркер площадки с видом спорта, для которого нет сопоставленной иконки
- **THEN** маркер показывает иконку по умолчанию вместо пустого пина или ошибки

#### Scenario: Marker color matches its sport, not the app accent
- **WHEN** на карте одновременно показаны площадки разных видов спорта
- **THEN** заливка каждого маркера соответствует категориальному цвету его вида спорта, а не единому акцентному цвету приложения

### Requirement: Selected marker is visually highlighted

Маркер выбранной площадки SHALL визуально отличаться от невыбранных маркеров (увеличенный масштаб) с плавным переходом, а не оставаться визуально идентичным невыбранным маркерам.

#### Scenario: Marker highlighted on selection
- **WHEN** пользователь выбирает площадку (клик по маркеру или строке списка)
- **THEN** маркер этой площадки на карте плавно увеличивается относительно невыбранных маркеров

#### Scenario: Highlight cleared on deselection
- **WHEN** выбор площадки снимается (закрытие карточки)
- **THEN** маркер возвращается к обычному масштабу

### Requirement: Native map controls match the app's accent theme

Встроенные элементы управления картой (zoom, геолокация) SHALL быть визуально согласованы с акцентным цветом приложения, а не с цветовой темой по умолчанию из пакета темы карты. Контейнер контролов SHALL использовать непрозрачную поверхность уровня элевации 2 (`--surface` + тень), согласованную с обычными плавающими UI-элементами приложения, а не стеклянное оформление и не непрозрачную заливку по умолчанию из пакета темы карты.

#### Scenario: Zoom and geolocation controls use the app accent color
- **WHEN** пользователь видит элементы управления zoom и геолокацией на карте
- **THEN** их цвет соответствует акцентному цвету остального интерфейса приложения

#### Scenario: Controls float over the map with a glass surface
- **WHEN** пользователь видит контейнер контролов zoom/геолокации на карте
- **THEN** он отображается непрозрачной поверхностью с тенью (`--surface` + `--shadow-2`), без блюра и прозрачности — стекло больше не применяется к контролам, оно зарезервировано только для FAB и поиск-pill (см. `frontend-bottom-sheet`)

### Requirement: Map tile theme matches the app's light/dark theme

Слой базовой карты SHALL переключаться между светлым и тёмным оформлением тайлов синхронно с текущей темой интерфейса приложения, вместо того чтобы всегда показывать светлую тему тайлов независимо от темы приложения.

#### Scenario: Dark app theme shows dark map tiles
- **WHEN** интерфейс приложения отображается в тёмной теме
- **THEN** базовый слой карты также отображается в тёмном оформлении тайлов

#### Scenario: Light app theme shows light map tiles
- **WHEN** интерфейс приложения отображается в светлой теме
- **THEN** базовый слой карты отображается в светлом оформлении тайлов

### Requirement: Map controls do not overlap app chrome

Встроенные элементы управления картой SHALL оставаться в предсказуемом положении, не перекрываясь визуально с элементами управления самого приложения (боковая панель, кнопки, поиск-pill, FAB). На desktop положение — верхний левый угол, zoom и геолокация вместе (без изменений). На мобильном положение — правый нижний угол; поскольку zoom-контрол на мобильном не отображается (см. «Zoom control is desktop-only»), там показывается только кнопка геолокации, выше ряда поиск-pill/FAB (см. `frontend-bottom-sheet`), а не верхний левый угол.

#### Scenario: No overlap on desktop
- **WHEN** пользователь просматривает карту на desktop
- **THEN** элементы управления zoom и геолокацией остаются в верхнем левом углу и не накладываются на боковую панель или другие элементы управления приложения

#### Scenario: No overlap on mobile
- **WHEN** пользователь просматривает карту на мобильном
- **THEN** кнопка геолокации расположена в правом нижнем углу, выше ряда поиск-pill и FAB, и не перекрывается с ними

### Requirement: Zoom control is desktop-only

Кнопки zoom (`Plus`/`Minus`) SHALL отображаться только на desktop. На мобильном отдельный zoom-контрол SHALL не отображаться — пользователь использует нативный pinch-to-zoom жест карты вместо кнопок. Кнопка геолокации SHALL оставаться видимой на обеих платформах независимо от этого изменения.

#### Scenario: Zoom buttons hidden on mobile
- **WHEN** пользователь просматривает карту на мобильном
- **THEN** кнопки увеличения/уменьшения масштаба не отображаются; карта поддерживает масштабирование жестом pinch-to-zoom

#### Scenario: Zoom buttons visible on desktop
- **WHEN** пользователь просматривает карту на desktop
- **THEN** кнопки увеличения/уменьшения масштаба отображаются рядом с кнопкой геолокации, как раньше

### Requirement: Zoom and geolocation icons match the app's icon system

Иконки zoom и геолокации SHALL использовать форму из набора Phosphor Icons, того же семейства, что и остальная иконография приложения (см. `frontend-court-ui`/маркеры на карте), а не дефолтную форму иконок из пакета темы карты — даже перекрашенную в акцентный цвет. Для zoom SHALL использоваться `Plus`/`Minus`; для геолокации — `NavigationArrow`; вес `Regular`.

#### Scenario: Zoom icons use Phosphor Plus/Minus
- **WHEN** пользователь видит кнопки увеличения/уменьшения масштаба на карте (desktop)
- **THEN** их иконки — Phosphor `Plus` и `Minus`, а не иконки из дефолтной темы Yandex Maps

#### Scenario: Geolocation icon uses Phosphor NavigationArrow
- **WHEN** пользователь видит кнопку геолокации на карте
- **THEN** её иконка — Phosphor `NavigationArrow`, а не иконки из дефолтной темы Yandex Maps