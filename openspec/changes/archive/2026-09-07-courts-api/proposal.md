## Why

MVP CourtMap не имеет смысла без основной функции — показывать и добавлять площадки. `backend-foundation` даёт работающий скелет (конфиг, БД, модель `Court`, health-check), но не предоставляет ни одного эндпоинта для самих площадок. Этот change добавляет полноценный CRUD по площадкам с идемпотентным созданием (дедупликация по координатам, см. `vision.md` §2) и минимальной защитой от вандализма (`DELETE` по admin-токену), что делает backend полностью пригодным для интеграции с frontend.

## What Changes

- `services/court_service.py`:
  - Валидация координат и обязательных полей площадки
  - Дедупликация: поиск площадок того же вида спорта в радиусе ~30 м (Haversine) перед созданием
  - Валидация и сохранение фото (jpg/png, макс. 5 МБ) на диск
- `routers/courts.py`:
  - `GET /courts` — список площадок с фильтром по bounding box
  - `POST /courts` — создание площадки (`multipart/form-data`, с фото)
  - `GET /courts/{id}` — детали площадки
  - `DELETE /courts/{id}` — удаление, защищено `ADMIN_TOKEN`
- Регистрация роутера `courts` в `main.py` (из `backend-foundation`)
- Ручная проверка всех эндпоинтов через Swagger UI

## Capabilities

### New Capabilities
- `courts`: создание, чтение (список с bbox-фильтром и по id) и удаление площадок, включая идемпотентность создания (дедуп по координатам) и валидацию фото.

### Modified Capabilities
_(нет — `service-health` из `backend-foundation` не меняется)_

## Impact

- Новые файлы: `backend/app/services/court_service.py`, `backend/app/routers/courts.py`
- Изменяемые файлы: `backend/app/main.py` (регистрация роутера) — из `backend-foundation`
- Зависит от `backend-foundation`: нужны `Settings`, DB-сессия и модель `Court` из этого change
- После этого change backend полностью готов к интеграции с frontend (Этап 2-3 плана)
