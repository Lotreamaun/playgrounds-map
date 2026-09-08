## ADDED Requirements

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
