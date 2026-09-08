## Purpose

Позволяет пользователям видеть существующие спортивные площадки на карте и добавлять новые через backend API, с защитой от дублей и вандализма.

## Requirements

### Requirement: List Courts Within Bounding Box
Система SHALL предоставлять `GET /courts`, возвращающий только площадки, координаты которых попадают в переданный bounding box.

#### Scenario: Courts inside bbox are returned
- **WHEN** клиент запрашивает `GET /courts` с параметрами bounding box
- **THEN** ответ содержит только площадки, чьи координаты попадают внутрь этих границ

#### Scenario: Courts outside bbox are excluded
- **WHEN** клиент запрашивает `GET /courts` с bounding box, не покрывающим существующую площадку
- **THEN** эта площадка отсутствует в ответе

### Requirement: Get Court by ID
Система SHALL предоставлять `GET /courts/{id}`, возвращающий данные конкретной площадки или явную ошибку, если она не существует.

#### Scenario: Existing court is returned
- **WHEN** клиент запрашивает `GET /courts/{id}` с id существующей площадки
- **THEN** ответ 200 содержит данные этой площадки

#### Scenario: Missing court returns 404
- **WHEN** клиент запрашивает `GET /courts/{id}` с несуществующим id
- **THEN** ответ 404

### Requirement: Create Court with Validation
Система SHALL предоставлять `POST /courts` (`multipart/form-data`), создающий площадку только при корректных координатах и заполненных обязательных полях.

#### Scenario: Valid submission creates a court
- **WHEN** клиент отправляет `POST /courts` с валидными координатами и всеми обязательными полями
- **THEN** ответ 201 содержит данные созданной площадки, и площадка появляется в последующих `GET /courts`

#### Scenario: Out-of-range coordinates are rejected
- **WHEN** клиент отправляет `POST /courts` с координатами вне допустимого диапазона (широта/долгота)
- **THEN** ответ 422, площадка не создаётся

#### Scenario: Missing required field is rejected
- **WHEN** клиент отправляет `POST /courts` без обязательного поля
- **THEN** ответ 422, площадка не создаётся

### Requirement: Duplicate Court Detection
Система SHALL перед созданием площадки искать существующие площадки того же вида спорта в радиусе ~30 метров (по формуле Haversine) и отклонять создание при нахождении дубля.

#### Scenario: Duplicate submission is rejected
- **WHEN** клиент повторно отправляет `POST /courts` с тем же видом спорта и координатами в радиусе 30 м от уже существующей площадки
- **THEN** ответ 409, новая запись не создаётся

#### Scenario: Different sport at same location is allowed
- **WHEN** клиент отправляет `POST /courts` с другим видом спорта в тех же координатах, где уже есть площадка иного вида спорта
- **THEN** площадка создаётся успешно (это не считается дублем)

### Requirement: Photo Upload Validation
Система SHALL принимать фото площадки только в форматах jpg/png и размером не более 5 МБ, сохраняя валидные файлы на диск и отклоняя остальные. Сохранённые файлы SHALL быть доступны для загрузки через HTTP GET по URL, указанному в `photo_url`.

#### Scenario: Valid photo is stored
- **WHEN** клиент отправляет `POST /courts` с фото в формате jpg или png размером до 5 МБ
- **THEN** площадка создаётся с `photo_url`, указывающим на сохранённый файл

#### Scenario: Photo URL is accessible via HTTP
- **WHEN** клиент запрашивает GET по URL из `photo_url` созданной площадки
- **THEN** ответ содержит бинарное содержимое фото с корректным Content-Type (image/jpeg или image/png)

#### Scenario: Oversized photo is rejected
- **WHEN** клиент отправляет `POST /courts` с фото больше 5 МБ
- **THEN** ответ 400, площадка не создаётся

#### Scenario: Wrong file type is rejected
- **WHEN** клиент отправляет `POST /courts` с файлом не jpg/png
- **THEN** ответ 400, площадка не создаётся

### Requirement: Admin-Protected Court Deletion
Система SHALL предоставлять `DELETE /courts/{id}`, выполняющий удаление только при предъявлении корректного `ADMIN_TOKEN`.

#### Scenario: Deletion without valid token is rejected
- **WHEN** клиент отправляет `DELETE /courts/{id}` без корректного `ADMIN_TOKEN`
- **THEN** ответ 401 или 403, площадка не удаляется

#### Scenario: Deletion with valid token succeeds
- **WHEN** клиент отправляет `DELETE /courts/{id}` с корректным `ADMIN_TOKEN` для существующей площадки
- **THEN** ответ 204, площадка удалена и больше не возвращается в `GET /courts`

### Requirement: Court stores and returns an address
Система SHALL хранить поле `address` у каждой площадки. `POST /courts` SHALL принимать необязательный адрес и сохранять его; `GET /courts` и `GET /courts/{id}` SHALL возвращать поле `address` в ответе.

#### Scenario: Court created with an address
- **WHEN** клиент отправляет `POST /courts` с корректным значением поля `address`
- **THEN** созданная площадка содержит сохранённое значение `address`

#### Scenario: Court created without an address
- **WHEN** клиент отправляет `POST /courts` без поля `address`
- **THEN** площадка создаётся успешно, а поле `address` имеет пустое значение (`None`)

#### Scenario: Address returned in list
- **WHEN** клиент запрашивает `GET /courts`
- **THEN** каждая площадка в ответе содержит своё поле `address`

#### Scenario: Address returned by id
- **WHEN** клиент запрашивает `GET /courts/{id}` существующей площадки
- **THEN** ответ содержит поле `address` этой площадки