## Context

Backend сейчас — только `requirements.txt` и `.env` (Этап 0). Стек и структура каталогов зафиксированы в `docs/vision.md` §1, §3 и обязательны к соблюдению: FastAPI + SQLModel (sync), SQLite, конфигурация через `.env`, логирование только в stdout/stderr. См. `proposal.md` — Why для мотивации этого change.

## Goals / Non-Goals

**Goals:**
- Поднять минимальный, но полный вертикальный срез инфраструктуры: конфиг → БД → модель → FastAPI-приложение → health-check
- Дать `courts-api` (следующий change) готовые `Settings`, DB-сессию и модель `Court`, ничего в них не меняя

**Non-Goals:**
- Роутеры и сервис-слой для площадок (`GET/POST/DELETE /courts`, дедупликация, валидация фото) — это `courts-api`
- Docker/deploy — отдельный change на Этапе 4
- Rate-limiting через `slowapi` — не нужен без `POST /courts`, который появится позже

## Decisions

- **SQLModel вместо raw SQLAlchemy + Pydantic**: модель `Court` объединяет ORM и схему валидации в одном классе (см. `vision.md` §1, §3) — меньше дублирования полей между слоями.
- **Sync-first доступ к БД**: `core/database.py` использует синхронный engine/session, а не `async`. SQLite и один город не выигрывают от async, а FastAPI одинаково хорошо исполняет sync-обработчики в threadpool (см. `vision.md` §2, «Sync-first»). Миграция на async отложена до перехода на PostgreSQL (v2+).
- **Автосоздание таблиц при старте** (`SQLModel.metadata.create_all` в lifespan/startup-хуке `main.py`) вместо системы миграций — на MVP с единственной моделью `Court` полноценные миграции (Alembic) избыточны; будет пересмотрено при первом реальном изменении схемы.
- **Логирование через stdlib `logging` в stdout/stderr**: без файлового хендлера и ротации — контейнерная FS эфемерна, Docker/Dockhost сами собирают stdout (см. `vision.md` §9).
- **CORS настраивается списком origin'ов из `.env`** (`CORS_ORIGINS`, через запятую), а не хардкодом одного адреса — нужно одновременно поддерживать `http://localhost:5173` и будущий прод-домен.

## Risks / Trade-offs

- [Автосоздание таблиц без миграций] → на MVP это осознанный компромисс (единственная модель, SQLite, нет прод-данных на момент запуска); при первом изменении схемы `Court` в проде потребуется явно спроектировать миграционный путь (см. roadmap v1.1 мультиспорт).
- [Нет rate-limiting в этом change] → некритично: единственный публичный эндпоинт здесь — `GET /health`, у которого нет чувствительной нагрузки; `slowapi` подключается в `courts-api` для `POST /courts`.

## Open Questions

_(нет — все решения по стеку и подходу зафиксированы в `vision.md` и не пересматриваются в рамках этого change)_
