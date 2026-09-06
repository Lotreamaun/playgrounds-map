## Why

Сейчас в `backend/` есть только зависимости и `.env` (Этап 0) — ни конфигурации, ни подключения к БД, ни самого FastAPI-приложения. Без этого каркаса нельзя начинать работу над бизнес-логикой площадок (`courts-api`): сервисам и роутерам нужны готовые `Settings`, DB-сессия и модель `Court`. Этот change поднимает минимальный работающий backend-скелет, который можно задеплоить и проверить (`/health`) ещё до появления самой фичи.

## What Changes

- `core/config.py` — `Settings`, читающий `DATABASE_URL`, `CORS_ORIGINS`, `ADMIN_TOKEN`, `LOG_LEVEL` из `.env`
- `core/database.py` — синхронный SQLAlchemy/SQLModel engine из `DATABASE_URL`, `Depends`-функция сессии, автосоздание таблиц при старте приложения
- `models/court.py` — SQLModel-модель `Court` (ORM + Pydantic-валидация в одном классе), включая поле `attributes` (JSON, nullable) под будущий мультиспорт (v1.1), не используется на MVP
- `main.py` — инициализация FastAPI, CORS middleware по `CORS_ORIGINS`, регистрация `/health`
- Логирование в stdout/stderr (без файлового хендлера)

Роутеры и сервис-слой для `courts` (`GET/POST/DELETE /courts`, дедупликация, фото) сознательно не входят сюда — это отдельный change `courts-api`, который будет опираться на этот фундамент.

## Capabilities

### New Capabilities
- `service-health`: приложение стартует, инициализирует БД и CORS, и предоставляет `GET /health` для healthcheck (Docker/Dockhost) без побочных эффектов.

### Modified Capabilities
_(нет — это первый change в проекте)_

## Impact

- Новые файлы: `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/models/court.py`, `backend/app/main.py`
- Зависимости уже установлены в Этапе 0 (`requirements.txt`)
- Внешнего API для площадок ещё нет — `GET/POST/DELETE /courts` появятся в следующем change (`courts-api`)
- Frontend пока не интегрируется — CORS настраивается, но клиент API (`frontend/src/services/api.ts`) появится позже вместе с фронтенд-changes
