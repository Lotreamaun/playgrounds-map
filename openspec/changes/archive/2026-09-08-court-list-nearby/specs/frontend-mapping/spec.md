## ADDED Requirements

### Requirement: API client can fetch all courts without a bounding box
Типизированный API-клиент SHALL поддерживать запрос `GET /courts` без bounding box, возвращающий все площадки. Это необходимо для заполнения списка, не ограниченного текущим вьюпортом карты.

#### Scenario: Fetching all courts
- **WHEN** клиент запрашивает `GET /courts` без параметров bounding box
- **THEN** ответ содержит все доступные площадки независимо от вьюпорта карты

#### Scenario: Existing bbox fetch still supported
- **WHEN** клиент запрашивает `GET /courts` с параметрами bounding box
- **THEN** поведение не меняется: возвращаются только площадки внутри границ
