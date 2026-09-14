## 1. Backend container

- [x] 1.1 Зафиксировать версии зависимостей в `backend/requirements.txt` (`==`) и при необходимости lock-файл транзитивных зависимостей — воспроизводимая сборка образа
- [x] 1.2 В `backend/app/main.py` создать `data/` и `data/photos/` перед монтированием `StaticFiles(directory="data/photos")` (старт на пустом volume, см. spec «Backend Starts with an Empty Data Volume»)
- [x] 1.3 Локальная проверка фикса: удалить локальный `backend/data/`, запустить `uvicorn app.main:app`, убедиться что `GET /health` → 200 и директории созданы заново
- [x] 1.4 Создать `backend/Dockerfile`: `python:3.12-slim`, `WORKDIR /app`, копирование `requirements.txt` и `app/`, `pip install`, `EXPOSE 8000`, `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]` (без `--reload`)
- [x] 1.5 Создать `backend/.dockerignore`: `.venv/`, `data/`, `__pycache__/`, `.env`, `*.pyc`

## 2. Frontend container

- [x] 2.1 Создать `frontend/.env.production` для прод-сборки: `VITE_API_BASE_URL=""`, значения `VITE_YANDEX_MAPS_KEY` и `VITE_YANDEX_GEOCODER_KEY` (публичные ключи, закоммичивается — см. design, решение 4)
- [x] 2.2 Создать `frontend/nginx/default.conf`: статика из `/usr/share/nginx/html`, `try_files $uri $uri/ /index.html` (SPA-fallback), `location`-блоки `proxy_pass` для `/courts`, `/photos/`, `/health`, `/docs`, `/openapi.json` на `http://backend:8000` (включая заголовки обратного прокси `proxy_pass_header`/`X-Forwarded-*`, `client_max_body_size` ≥ фото 5 МБ + multipart-накладные)
- [x] 2.3 Кэш-заголовки в nginx: хешированные ассеты (`/assets/*`) с `immutable` и длительным max-age, `index.html` без кэша (spec «Frontend Served as a Static Build with SPA Fallback»)
- [x] 2.4 Создать `frontend/Dockerfile` (multi-stage): build-этап `node:lts-alpine` с `ARG`/`ENV` `VITE_API_BASE_URL`, `VITE_YANDEX_MAPS_KEY`, `VITE_YANDEX_GEOCODER_KEY`; `npm ci && npm run build`; runtime-этап `nginx:stable-alpine` с копированием `dist/` и `nginx/default.conf`
- [x] 2.5 Создать `frontend/.dockerignore`: `node_modules/`, `dist/`, `.env`, `*.local`

## 3. Локальная проверка через Docker Compose

- [x] 3.1 Создать корневой `docker-compose.yml` (зеркало прод-топологии): сервисы `backend` (сборка из `backend/`) и `frontend` (сборка из `frontend/`, порт 80), named volume для `/app/data`, переменные `ADMIN_TOKEN`/`CORS_ORIGINS` из `.env`
- [x] 3.2 `docker compose build` — обе image собираются без ошибок
- [x] 3.3 `docker compose up -d`; через origin фронтенда проверить: `GET /health` → 200, `GET /courts` → 200, фото по `GET /photos/{filename}` отдаётся, `/docs` открывается (spec «API, Photo and Health Paths Proxied to the Backend»)
- [x] 3.4 Проверить SPA-fallback и кэш: несуществующий путь приложения → `index.html`, у `/assets/*` правильные cache-заголовки
- [x] 3.5 Проверить старт на пустом volume: `docker compose down -v && docker compose up -d` → `GET /health` 200, добавить площадку → она в `GET /courts`; перезапустить backend → данные на месте (spec «Data Persists Across Container Restarts»)
- [x] 3.6 Проверить конец-в-конец: добавить площадку с фото через UI прод-сборки и убедиться, что фото отображается (same-origin, без CORS) (spec «Production Uses a Single Origin…»)

## 4. Манифест Dockhost

- [x] 4.1 Создать корневой `dockhost.yaml`: `project`, `repositories` (два билда из этого репозитория: frontend с `dockerContext` и backend), `containers` (`backend`: порт 8000, `replicas: 1`, volume `/app/data`; `frontend`: порт 80), `environment`/`variables` (`ADMIN_TOKEN`, `CORS_ORIGINS`), `volumes`, `network.domains` + `network.routes` (`/` → frontend:80)
- [x] 4.2 Сверить `dockhost.yaml` с документацией платформы (структура `repositories`/`containers`/`network`) и, если доступен CLI, прогнать `dockhost compose apply` или валидацию
- [x] 4.3 Прокомментировать в `dockhost.yaml` и `nginx.conf` жёсткое требование совпадения имени контейнера `backend` (design, решение 1)

## 5. Деплой на Dockhost

- [ ] 5.1 Вычистить и запушить репозиторий (закоммитить незакоммиченные изменения и архивные openspec-документы), чтобы Docker-сборка шла из чистого состояния
- [ ] 5.2 В панели Dockhost создать проект/билды из репозитория (или применить `dockhost.yaml`), выставить переменные окружения: сильный `ADMIN_TOKEN`, `CORS_ORIGINS` (прод-домен + `http://localhost:5173` для локальной разработки); при поддержке build-args задать `VITE_*`
- [ ] 5.3 Создать сетевой диск для `/app/data` у backend и открыть порты (backend 8000, frontend 80)
- [ ] 5.4 Создать домен и маршрут `/` → frontend:80
- [ ] 5.5 Добавить прод-домен в allowed referers ключей Яндекс.Карт и Геокодера (иначе карта не загрузится)
- [ ] 5.6 Финальная проверка по чек-листу этапа 5 из `docs/PLAN.md`: открыть приложение по публичному адресу, добавить площадку с фото и без, проверить 409-дубликат, fallback геолокации, `GET /health` — 200 (5.1–5.5 PLAN)

## 6. Документация

- [x] 6.1 Обновить корневой `README.md`: раздел деплоя — локальный `docker compose up`, применение `dockhost.yaml`, переменные окружения и build-time `VITE_*`, порядок настройки домена и ключей Яндекса
- [ ] 6.2 Отметить в `docs/PLAN.md` задачи этапа 4 (4.1–4.4) выполненными после успешного деплоя