## Why

MVP-функционал CourtMap полностью реализован и проверен локально, но в репозитории нет ни одного `Dockerfile`, `docker-compose.yml` или `dockhost.yaml` — без них приложение невозможно развернуть на целевой платформе Dockhost. Это закрывает этап 4 из `docs/PLAN.md` (задачи 4.1–4.4) и делает продукт доступным по публичному адресу.

## What Changes

- **`backend/Dockerfile`** — образ FastAPI + Uvicorn: Python 3.12 slim, установка `requirements.txt`, запуск `uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers` (без `--reload`).
- **Backend startup fix** — приложение SHALL создавать `data/` и `data/photos/` при старте, чтобы контейнер поднимался на свежем (пустом) volume: сейчас `StaticFiles(directory="data/photos")` в `app/main.py:40` роняет процесс, если директории нет.
- **`frontend/Dockerfile`** — multi-stage сборка: `node` build → `nginx:stable-alpine`, раздаёт собранный `dist/`. В сборке используется `npm ci` (plain, без `--force`/`--legacy-peer-deps` — peer-конфликт уже решён `overrides` в `package.json`).
- **`frontend` nginx-конфиг** — статика из `dist/`, SPA-fallback на `index.html`, proxy_pass API-путей (`/courts`, `/photos`, `/health`, а также `/docs` и `/openapi.json` для Swagger) на backend-сервис по имени в той же сети.
- **Same-origin API** — прод-сборка фронтенда использует `VITE_API_BASE_URL=""` (относительные запросы на свой origin). Это убирает необходимость CORS в проде, а относительные `photo_url` (`/photos/{filename}`) из БД продолжают работать без изменений. Публичные ключи Яндекса (`VITE_YANDEX_MAPS_KEY`, `VITE_YANDEX_GEOCODER_KEY`) пробрасываются в сборку как build-args.
- **`docker-compose.yml`** — локальная зеркальная проверка прод-топологии: два сервиса + именованный volume для `data/`. Не является манифестом для Dockhost, а служит для локального прогона перед деплоем.
- **`dockhost.yaml`** — манифест проекта Dockhost: два билда из репозитория (frontend/backend), два контейнера в одном проекте (общаются по имени), один сетевой диск, переменные окружения, домен + маршрут (`/` → frontend:80).
- **`.dockerignore`** × 2 — исключить из контекста сборки `.venv/`, `node_modules/`, `data/`, `dist/`.
- **README/Dockerfile-комментарии** — краткая инструкция, как поднять compose локально и задеплоить на Dockhost.

## Capabilities

### New Capabilities

- `app-deployment`: требования к прод-топологии CourtMap — приложение разворачивается как два контейнера (nginx-фронтенд + FastAPI-бэкенд) в одном проекте Dockhost, бэкенд стартует на пустом persistent-volume и сам создаёт runtime-директории, SQLite и фото сохраняются на сетевом диске, запросы к API/фото/health маршрутизируются через фронтенд-nginx на backend по имени сервиса.

### Modified Capabilities

_Нет._ Существующие спки (`courts`, `service-health`, frontend-*) описывают внешнее поведение API и UI, которое эта задача не меняет. Новые требования (старт на пустом volume, прод-топология, прокси-маршрутизация) не относятся ни к одному из существующих capability и собраны в новом `app-deployment`.

## Impact

- **Код backend**: `backend/app/main.py` (создание `data/` + `data/photos/` до монтирования статики); возможно `backend/app/core/config.py` (выносимая конфигурация пути фото/данных). Без изменения API-контрактов.
- **Код frontend**: без изменений исходников; меняются только env на этапе сборки (`VITE_*`) и используемый домен.
- **Новые артефакты**: `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx/default.conf`, `docker-compose.yml`, `dockhost.yaml`, `backend/.dockerignore`, `frontend/.dockerignore`.
- **Dependencies**: Docker (buildx), Docker Compose; на стороне Dockhost — переменные окружения проекта (`ADMIN_TOKEN`, `CORS_ORIGINS`, build-args с ключами Яндекса), сетевой диск, домен и маршрут.
- **Внешние системы**: Yandex Maps JS API и Geocoder ключи — в конфигурации Яндекса у публичного домена должен быть добавлен в allowed referers.