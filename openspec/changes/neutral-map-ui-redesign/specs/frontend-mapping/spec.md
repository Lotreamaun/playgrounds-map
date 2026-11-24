## MODIFIED Requirements

### Requirement: Map renders with the Yandex Maps JavaScript API
The frontend SHALL render the map with the Yandex Maps JavaScript API (ymaps3) on the free tier. The API SHALL be initialized using an access key sourced from the `VITE_YANDEX_MAPS_KEY` environment variable; the base layer SHALL come from the API itself (Yandex map data, no separate tile configuration). When the key is unset or empty, the viewport SHALL show a clear message instead of a blank or broken map. When the API script or its initialization fails, the viewport SHALL show a user-facing error state («Карта не загрузилась», a short hint and a «Повторить» button) instead of a technical message; technical details go to the console only. «Повторить» SHALL reload the API from scratch. Search, the list and court cards SHALL keep working while the map is unavailable.

#### Scenario: Map visible in development
- **WHEN** the frontend runs via `npm run dev` and `VITE_YANDEX_MAPS_KEY` is set
- **THEN** a Yandex map with the default basemap is rendered in the viewport

#### Scenario: Missing or empty API key
- **WHEN** `VITE_YANDEX_MAPS_KEY` is unset or empty
- **THEN** the viewport shows a clear message that a Yandex Maps key is required, instead of a blank or broken map

#### Scenario: Map failed to load
- **WHEN** the Yandex Maps script is rejected (for example, the key does not allow the page's address) or the network fails
- **THEN** the viewport shows «Карта не загрузилась», a hint to check the connection and a «Повторить» button, with no raw error text

#### Scenario: Retry after a failure
- **WHEN** the user presses «Повторить» after a failed load and the cause is gone
- **THEN** the API script is requested again and the map appears without a page reload


### Requirement: Geolocation with fallback to default city center
Фронтенд SHALL один раз при загрузке запросить местоположение пользователя и, при успехе, центрировать карту на нём. Если геолокация отклонена, недоступна или завершилась ошибкой, карта SHALL центрироваться на координатах города по умолчанию (Тбилиси). Полученное местоположение SHALL быть единым для всего приложения и переиспользоваться: расстояния в списке и карточке, точка по умолчанию в форме добавления, кнопка «Где я». Независимые параллельные запросы геолокации из разных частей интерфейса не допускаются. Повторный запрос выполняется только по явному действию пользователя (кнопка «Где я», вход в режим добавления без известного местоположения).

#### Scenario: Geolocation allowed
- **WHEN** пользователь разрешает доступ к геолокации
- **THEN** карта центрируется на его текущих координатах, а список показывает расстояния без дополнительных действий

#### Scenario: Geolocation unavailable
- **WHEN** пользователь отклоняет доступ или геолокация недоступна
- **THEN** карта центрируется на координатах города по умолчанию без ошибки, список и карточка работают без расстояний

#### Scenario: Single shared location
- **WHEN** местоположение уже определено, и пользователь открывает список, карточку или форму добавления
- **THEN** интерфейс использует уже известное местоположение без нового запроса геолокации

### Requirement: Map controls do not overlap app chrome

Элементы управления картой SHALL располагаться вертикальным стеком у правого края карты внизу, с отступом снизу, достаточным, чтобы ни на одной платформе не перекрывать атрибуцию и логотип Яндекса и кнопку «Открыть Яндекс Карты». Элементы интерфейса приложения (поле поиска, контролы, шторка в закрытом состоянии) SHALL также не перекрывать атрибуцию. Порядок сверху вниз:
- **desktop:** приблизить, отдалить, «Где я»;
- **мобильный:** добавить площадку, «Где я».

На мобильном нижний отступ стека SHALL учитывать `env(safe-area-inset-bottom)` с дополнительным буфером.

#### Scenario: No overlap on desktop
- **WHEN** пользователь просматривает карту на desktop без открытых всплывающих элементов
- **THEN** атрибуция «© Яндекс», «Условия использования» и логотип Яндекс Карт полностью видны и не перекрыты контролами или панелью

#### Scenario: No overlap on mobile
- **WHEN** пользователь просматривает карту на мобильном без открытой шторки
- **THEN** атрибуция и логотип Яндекса полностью видны, ни один элемент приложения их не перекрывает

#### Scenario: Controls stack on the right edge
- **WHEN** пользователь просматривает карту на любой платформе
- **THEN** контролы образуют вертикальный стек у правого края внизу и не перекрываются друг с другом, с полем поиска или с боковой панелью

## ADDED Requirements

### Requirement: Filters apply to map markers

Включённые фильтры (см. `frontend-court-list` — «Courts can be filtered by lighting, condition and surface») SHALL скрывать с карты маркеры площадок, не прошедших фильтр; числа в кластерах SHALL учитывать только видимые площадки. Площадка, чья карточка открыта, SHALL оставаться на карте, даже если не проходит фильтр. Изменение фильтров SHALL не вызывать запросов к серверу и не двигать карту.

#### Scenario: Markers follow the filters
- **WHEN** пользователь включает «Со светом»
- **THEN** маркеры площадок без освещения исчезают с карты, кластеры пересчитываются, положение карты не меняется

#### Scenario: Open card keeps its marker
- **WHEN** открыта карточка площадки без освещения, и пользователь включает «Со светом»
- **THEN** маркер этой площадки остаётся на карте выделенным, пока карточка открыта

#### Scenario: Filter button on the mobile map
- **WHEN** пользователь на мобильном смотрит на карту
- **THEN** справа от поля поиска видна кнопка «Фильтры»; изменения в шторке фильтров сразу меняют маркеры на карте


### Requirement: Map controls use the app's surface and icon styling

Элементы управления картой (zoom, геолокация, добавление) SHALL быть визуально согласованы с остальным интерфейсом приложения, а не с темой по умолчанию из пакета карты:
- иконки окрашены цветом `text-primary`;
- каждая кнопка — непрозрачная поверхность уровня элевации «плавающий элемент» (`surface` + тень);
- цель касания не меньше 44×44 px на мобильном.

#### Scenario: Controls use app colors
- **WHEN** пользователь видит элементы управления картой
- **THEN** их иконки и поверхности используют токены приложения в текущей теме

#### Scenario: Controls are opaque floating surfaces
- **WHEN** пользователь видит кнопки управления картой
- **THEN** они отображаются непрозрачной поверхностью с тенью, без блюра и прозрачности

### Requirement: Map is a full-screen canvas under floating UI on mobile
На мобильном карта SHALL оставаться полноэкранной постоянной подложкой. Вторичный UI накладывается поверх карты, не заменяя её отдельной страницей:
- поле поиска вверху экрана и кнопка «Фильтры» справа от него (скрыты в режиме выбора точки);
- стек контролов у правого края;
- шторка карточки;
- полноэкранные экраны поиска и формы.

Выделенного докнутого на всю ширину верхнего или нижнего бара SHALL не быть. Поле поиска — плавающий элемент с отступами от краёв экрана и от safe-area сверху.

#### Scenario: Map persists behind the search field and controls
- **WHEN** пользователь работает на мобильном
- **THEN** поверх карты отображаются поле поиска вверху и стек контролов у правого края, а карта остаётся полноэкранной под ними

#### Scenario: Map stays interactive when a sheet or screen is closed
- **WHEN** пользователь закрывает шторку, экран поиска или форму
- **THEN** карта вновь видна на весь экран и принимает касания без перезагрузки

### Requirement: Courts are loaded once and shared by the map and the list

Фронтенд SHALL загружать все площадки одним запросом `GET /courts` без bounding box при старте приложения. Одни и те же данные SHALL использоваться картой, списком и обработкой ссылки `?court=<id>`. Движение карты (сдвиг, зум) SHALL не вызывать новых запросов площадок. Созданная пользователем площадка SHALL добавляться в эти данные сразу после успешного ответа API, без перезагрузки. При ошибке загрузки карта SHALL оставаться работоспособной, а повторить загрузку можно из списка (см. `frontend-court-list`).

#### Scenario: Single request on start
- **WHEN** приложение загружается
- **THEN** выполняется ровно один запрос `GET /courts`, и его результат отображается и на карте, и в списке

#### Scenario: Panning does not refetch
- **WHEN** пользователь двигает и масштабирует карту
- **THEN** новых запросов `GET /courts` не происходит, маркеры остаются на местах

#### Scenario: New court appears everywhere
- **WHEN** пользователь успешно добавил площадку
- **THEN** её маркер появляется на карте, а строка — в списке, без перезагрузки и без повторной загрузки всех площадок

### Requirement: Add-court control is a secondary map control

На мобильном кнопка добавления площадки SHALL быть иконкой «+» в стеке контролов карты (над кнопкой «Где я»), такого же размера и оформления, как остальные контролы, с `aria-label` «Добавить площадку». Она SHALL не располагаться по центру экрана и не иметь акцентной заливки. В режиме добавления, когда форма свёрнута для выбора точки на карте, вместо стека показывается подсказка «Нажмите на карту, чтобы выбрать точку» и кнопка «Отмена».

#### Scenario: Add button is a regular map control
- **WHEN** пользователь видит экран карты на мобильном
- **THEN** кнопка «+» стоит в стеке контролов у правого края, выглядит как соседняя кнопка «Где я» и объявляется screen reader'ом как «Добавить площадку»

#### Scenario: Picking a point on mobile
- **WHEN** форма добавления свёрнута для выбора точки на карте
- **THEN** видна подсказка «Нажмите на карту, чтобы выбрать точку» и кнопка «Отмена», которые не перекрывают атрибуцию Яндекса

## REMOVED Requirements

### Requirement: Zoom and geolocation icons match the app's icon system
**Reason**: Требование сводится к выбору конкретных иконок, то есть к деталям реализации. Согласованность контролов с приложением покрыта обновлённым «Native map controls match the app's accent theme».
**Migration**: Иконки остаются из Phosphor (`Plus`/`Minus`/`NavigationArrow`); это фиксируется в дизайн-системе (`docs/courtmap-design-system.md`), а не в спеке.

### Requirement: Map remains a full-screen canvas behind sheets on mobile
**Reason**: Требование было завязано на поиск-pill и FAB внизу экрана, которые удаляются.
**Migration**: См. «Map is a full-screen canvas under floating UI on mobile»: поле поиска вверху, стек контролов справа.

### Requirement: Native map controls match the app's accent theme
**Reason**: Формулировки были завязаны на стекло, которое отменено, и на акцентный цвет иконок.
**Migration**: См. «Map controls use the app's surface and icon styling»: непрозрачная поверхность, иконки `text-primary`, цель касания ≥ 44 px.
