## ADDED Requirements

### Requirement: Court stores whether it is covered

Система SHALL хранить у площадки необязательный признак `is_covered` (крытая площадка: зал или навес). `POST /courts` SHALL принимать необязательное поле `is_covered` (boolean) и сохранять его; если поле не передано, сохраняется `None` («неизвестно»). `GET /courts` и `GET /courts/{id}` SHALL возвращать `is_covered`. При запуске на существующей базе без этой колонки она SHALL добавляться автоматически (как ранее `address`), значения у существующих площадок — `None`.

#### Scenario: Court created as covered
- **WHEN** клиент отправляет `POST /courts` с `is_covered=true`
- **THEN** созданная площадка содержит `is_covered: true`

#### Scenario: Court created without the flag
- **WHEN** клиент отправляет `POST /courts` без поля `is_covered`
- **THEN** площадка создаётся, а `is_covered` равно `null`

#### Scenario: Existing database is upgraded
- **WHEN** backend запускается на базе, где у таблицы `courts` нет колонки `is_covered`
- **THEN** колонка добавляется, существующие площадки сохраняются с `is_covered = null`

#### Scenario: Flag returned in list
- **WHEN** клиент запрашивает `GET /courts`
- **THEN** каждая площадка в ответе содержит поле `is_covered`
