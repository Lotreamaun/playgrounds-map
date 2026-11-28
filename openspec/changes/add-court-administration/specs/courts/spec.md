## MODIFIED Requirements

### Requirement: List Courts Within Bounding Box
Система SHALL предоставлять `GET /courts`, возвращающий только площадки, координаты которых попадают в переданный bounding box. Система SHALL исключать скрытые площадки из публичного списка.

#### Scenario: Courts inside bbox are returned
- **WHEN** клиент запрашивает `GET /courts` с параметрами bounding box
- **THEN** ответ содержит только площадки, чьи координаты попадают внутрь этих границ

#### Scenario: Courts outside bbox are excluded
- **WHEN** клиент запрашивает `GET /courts` с bounding box, не покрывающим существующую площадку
- **THEN** эта площадка отсутствует в ответе

#### Scenario: Hidden court is excluded
- **WHEN** координаты скрытой площадки попадают в запрошенную область
- **THEN** площадка отсутствует в публичном ответе

### Requirement: Get Court by ID
Система SHALL предоставлять `GET /courts/{id}`, возвращающий данные конкретной площадки или явную ошибку, если она не существует. Система SHALL возвращать 404 для скрытой площадки в публичном API.

#### Scenario: Existing court is returned
- **WHEN** клиент запрашивает `GET /courts/{id}` с id существующей площадки
- **THEN** ответ 200 содержит данные этой площадки

#### Scenario: Missing court returns 404
- **WHEN** клиент запрашивает `GET /courts/{id}` с несуществующим id
- **THEN** ответ 404

#### Scenario: Hidden court returns 404
- **WHEN** клиент запрашивает скрытую площадку по ID через публичный API
- **THEN** ответ 404

### Requirement: Create Court with Validation
Система SHALL предоставлять `POST /courts` (`multipart/form-data`), создающий площадку только при корректных координатах и заполненных обязательных полях. Система SHALL публиковать допустимое описание одновременно с площадкой.

#### Scenario: Valid submission creates a court
- **WHEN** клиент отправляет `POST /courts` с валидными координатами и всеми обязательными полями
- **THEN** ответ 201 содержит данные созданной площадки, и площадка появляется в последующих `GET /courts`

#### Scenario: Out-of-range coordinates are rejected
- **WHEN** клиент отправляет `POST /courts` с координатами вне допустимого диапазона (широта/долгота)
- **THEN** ответ 422, площадка не создаётся

#### Scenario: Missing required field is rejected
- **WHEN** клиент отправляет `POST /courts` без обязательного поля
- **THEN** ответ 422, площадка не создаётся

#### Scenario: Description is published immediately
- **WHEN** пользователь успешно добавляет площадку с описанием
- **THEN** описание сразу доступно через публичный API без предварительного одобрения
