# CourtMap (playgrounds-map)

**CourtMap** — «народная карта» спортивных площадок. Пользователи отмечают на карте площадки (баскетбол, футбол, волейбол, теннис, хоккей и др.), указывают покрытие, состояние, освещение и другие атрибуты. В перспективе — хаб для любительского спорта: найти площадку и договориться об игре.

## MVP

Веб-карта баскетбольных площадок одного города (Тбилиси): маркеры на карте, карточка площадки, форма добавления новой площадки без регистрации и модерации.

## Технологии (план)

- **Frontend**: React 19 + TypeScript, Vite, Yandex Maps JS API (ymaps3)
- **Backend**: Python 3.12+, FastAPI, SQLModel, SQLite
- **Деплой**: Docker + Docker Compose, Dockhost

## Запуск в Docker (локальная проверка прод-топологии)

`docker-compose.yml` зеркалит итоговую топологию Dockhost: nginx-фронтенд (порт 80) проксирует API/фото/health на backend (порт 8000) по имени сервиса; данные backend ((SQLite + фото) лежат в named volume `/app/data`.

```bash
# конфиг (один раз): ADMIN_TOKEN и CORS_ORIGINS для локального прогона
cp .env.example .env

docker compose up -d --build
```

Проверка:

- **Приложение**: <http://localhost/> (значение `VITE_API_BASE_URL=""` — same-origin)
- **Health**: <http://localhost/health> → `{"status":"ok"}`
- **Swagger**: <http://localhost/docs>

Сборка фронтенда использует build-args `VITE_API_BASE_URL` (по умолчанию `""`), `VITE_YANDEX_MAPS_KEY`, `VITE_YANDEX_GEOCODER_KEY`, `VITE_REPORT_URL` (необязательный адрес канала для ссылки «Сообщить о проблеме» в карточке площадки; `{id}` заменяется на id площадки, пусто — ссылка скрыта, например `https://t.me/your_bot?start=court_{id}`); дефолты берутся из закоммиченного `frontend/.env.production` (публичные ключи Яндекса), при необходимости переопределяются переменными в корневом `.env`.

Остановка: `docker compose down` (данные остаются в volume). Полный сброс данных: `docker compose down -v`.

## Деплой на Dockhost

Прод: **https://hizm-xjs6-o8dd.gw-1a.dockhost.net** (проект Dockhost `courtmap`).

Манифест проекта — корневой `dockhost.yaml` (два билда из этого репозитория: `backend/` и `frontend/`, два контейнера, сетевые сервисы `backend:8000` и `frontend:80`, сетевой диск для `/app/data`, домен и маршрут `/` → `frontend:80`). Он сверен с фактическим деплоем (`dockhost compose dump courtmap`).

Первичное развёртывание (CLI `dockhost`), в два этапа — образ контейнера является результатом билда репозитория (`dockhost.io/<projectId>/build/<repo>:<sha>`):

1. **Проект и сборка**: `dockhost project create --name courtmap`, затем `compose apply` файла только с секциями `environment`/`volumes`/`repositories` и `dockhost repository build backend|frontend --project courtmap`.
2. **Контейнеры и сеть**: после сборки — `dockhost compose apply dockhost.yaml --project courtmap`.
3. **`ADMIN_TOKEN`** в манифест не кладётся (иначе повторный apply перезапишет боевой токен) — задаётся через `dockhost environment variable` или панель; в контейнер приходит как `$ADMIN_TOKEN`.
4. **Ключи Яндекс.Карт и Геокодера**: добавить прод-домен в allowed referers в консоли Яндекса (иначе карта не загрузится даже при валидных ключах — ограничение по HTTP Referer). Build-args Dockhost не поддерживает — ключи берутся из дефолтов `ARG` в `frontend/Dockerfile`.

Ограничения: реплик backend **ровно 1** + `strategy: Recreate` (SQLite — single-writer). Имя сервиса `backend` зашито в `proxy_pass` nginx (`/courts`, `/photos/`, `/health`, `/docs`, `/openapi.json`). Ресурсы в `repositories` — это ресурсы сборки: фронтенду нужно ≥1GiB под `npm ci` + `vite build`.

Обновление: push в `main` — Dockhost отслеживает репозиторий (до ~2 минут). Если образ не обновился: `dockhost repository build <repo> --project courtmap`, затем проверить тег через `dockhost container list --project courtmap`.

Проверка после деплоя: открыть приложение по публичному адресу, добавить площадку с фото и без, проверить дубликат (409), `GET /health` → 200.

## Админка и Telegram-уведомления

Закрытая админка живёт на том же SPA: **`<публичный адрес>/admin`** (локально — <http://localhost:5173/admin> в dev или <http://localhost/admin> в Docker-топологии). Управление с телефона и настольного браузера: поиск по площадкам (включая скрытые и созданные до обновления), правка полей и координат, снятие описания/фото, скрытие/восстановление карточки, очередь обращений (исправления и жалобы) и журнал действий.

### Настройка (порядок первого запуска)

1. **Аккаунт администратора** (backend): задать в окружении
   - `ADMIN_USERNAME` (по умолчанию `admin`),
   - `ADMIN_PASSWORD` — настраиваемый пароль длиной от 12 символов,
   - `SESSION_SECRET` — 32 случайных байта в шестнадцатеричной записи для подписи cookie-сессий (`python3 -c "import secrets; print(secrets.token_hex(32))"`).

   В проде cookie сессии требует HTTPS. Для локального запуска по HTTP задать `ADMIN_ALLOW_INSECURE_HTTP=true` на backend. Vite проксирует админский API со своего адреса, как nginx в Docker. Выход отзывает сессию на сервере, а перезапуск backend завершает все сессии.

   Без явного пароля и секрета вход закрыт на сервере (fail-closed): `POST /admin/session` → 503. Сессия — HttpOnly-cookie, изменяющие запросы требуют заголовок привязанный к сессии заголовок `X-CSRF-Token`, после серии неудачных попыток вход блокируется на 15 минут. Настройки в Dockhost задаются через `dockhost environment variable` (как и `ADMIN_TOKEN`, в манифест их не класть).
2. **Бот**: создать бота у @BotFather, токен — `TELEGRAM_BOT_TOKEN`.
3. **Закрытый чат администратора**: написать боту хотя бы раз, затем узнать числовой `TELEGRAM_ADMIN_CHAT_ID` (например, через `getUpdates`).
4. **Публичный адрес**: `PUBLIC_BASE_URL` — адрес прод-инстанса Courtmap (для локального Docker-прогона `http://localhost`). Из него строятся ссылки в уведомлениях: «Открыть карточку» → `/?court=<id>`, «Управлять» → `/admin?court=<id>`, обращения → `/admin?report=<id>`. Ссылки полномочий не дают: без сессии админка показывает вход, а после успешного входа открывает нужную запись (адрес возврата — только локальный путь).
5. **Проверка**: добавить тестовую площадку → в чат приходит уведомление с кнопками; скрыть и восстановить её; отправить жалобу с телефона → разобрать в очереди.

Уведомления сохраняются как задания в БД (outbox) в одной транзакции с площадкой/обращением: недоступный Telegram не мешает публикации, фоновый обработчик повторяет временные ошибки (10 c → 1 мин → 5 мин → 30 мин → раз в час). Постоянные ошибки (неверный токен/чат) и последние задания видны оператору в админке (секция «Не доставлено в Telegram» на странице обращений) и в API `GET /admin/delivery-jobs`.

Старый `DELETE /courts/{id}` с настроенным токеном скрывает опубликованную площадку и записывает действие в журнал. Площадка сохраняет ID и связанные обращения. Если `ADMIN_TOKEN` отсутствует или равен `change-me`, сервер отвечает 503.

### Миграция и откат

Миграция добавочная, применяется автоматически при старте backend (`create_db_and_tables`): создаются таблицы `court_reports`, `admin_actions`, `delivery_jobs` и колонки `is_hidden` / `is_photo_published` у `courts`. Существующие площадки остаются опубликованными с прежними ID.

Порядок обновления:

1. Остановить запись в БД и сделать копию всего каталога данных, включая SQLite и фото. В Docker Compose остановить backend через `docker compose stop backend`, получить его контейнер через `docker compose ps -aq backend` и скопировать каталог командой `docker cp "$(docker compose ps -aq backend):/app/data" ./courtmap-backup`. Перед дальнейшими действиями проверить наличие базы и каталога фото в копии. В Dockhost сохранить содержимое фактически подключённого к backend диска.
2. Задать новые переменные окружения (пароль, секрет, бот, чат, `PUBLIC_BASE_URL`).
3. Развернуть новую версию (push в `main` / пересборка) — миграция применится при старте.
4. Проверить: `GET /health`, вход в админку по `/admin`, уведомление о новой площадке, скрытие/восстановление тестовой записи.

Перед откатом временно закрыть публичный доступ к площадкам и `/photos/` либо сохранить ограничения выдачи на прокси. Старая версия игнорирует признаки скрытия площадки и снятия фото с публикации. Данные модерации сохраняются в БД и снова учитываются после возврата новой версии.

### Тесты backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.lock pytest
pytest          # 60+ интеграционных тестов: авторизация, видимость, обращения, доставка
```

Тесты используют изолированные временные БД/каталог фото и симулируют сбои Telegram (временные и постоянные), не отправляя реальных сообщений.

## Запуск локально (dev)

Два процесса: **backend** (FastAPI + SQLite, порт `8000`) и **frontend** (Vite dev-сервер, порт `5173`). Фронтенд ходит в API по адресу из `VITE_API_BASE_URL`.

### Требования

- Python 3.12+
- Node.js 20+ и npm

### 1. Backend

```bash
cd backend

# виртуальное окружение (один раз)
python3 -m venv .venv
source .venv/bin/activate   # на Windows: .venv\Scripts\activate

# зависимости (один раз)
pip install -r requirements.txt

# конфиг (один раз): скопировать и при необходимости поменять ADMIN_TOKEN
cp .env.example .env

# запуск сервера
uvicorn app.main:app --reload
```

Проверка:

- **API**: <http://localhost:8000/health> → `{"status":"ok"}`
- **Swagger-документация**: <http://localhost:8000/docs>

Таблицы в SQLite создаются автоматически при первом запуске (`backend/data/courtmap.db`).

### 2. Frontend

```bash
cd frontend

# зависимости (один раз)
npm install

# конфиг (один раз): указать адрес API и ключ Яндекс.Карт
cp .env.example .env
# в .env поставить VITE_API_BASE_URL=http://localhost:8000
# (важно: backend должен разрешать этот origin в CORS_ORIGINS)
# и VITE_YANDEX_MAPS_KEY=<ваш ключ JS API Яндекс.Карт>
# (получить: https://developer.tech.yandex.ru/ — бесплатный тариф с лимитом запросов;
# без ключа вместо карты будет показано сообщение)
# необязательно: VITE_REPORT_URL=<адрес канала «Сообщить о проблеме», {id} → id площадки>

# запуск dev-сервера
npm run dev
```

Открыть http://localhost:5173 — карта должна загрузиться (геолокация с фолбэком на Тбилиси).

Добавленные площадки можно посмотреть в Swagger (`GET /courts`) или в БД:
`sqlite3 backend/data/courtmap.db "SELECT id, name, latitude, longitude, surface FROM courts;"`.

### Полезные команды

| Команда | Где | Что делает |
| --- | --- | --- |
| `npm run lint` | `frontend` | линтер (oxlint) |
| `npm run build` | `frontend` | type-check + продакшен-сборка в `dist/` |
| `npm run preview` | `frontend` | показать собранную версию из `dist/` |
| `npm run types:court` | `frontend` | перегенерировать `src/types/court.ts` из OpenAPI (нужен запущенный backend) |
| `pytest` | `backend` | интеграционные тесты (админка, обращения, доставка уведомлений) |
| `DELETE /courts/{id}` | — | удалить площадку; работает только с настроенным нестандартным `ADMIN_TOKEN` (см. раздел «Админка») |

### Примечания

- **Сброс данных**: удалить `backend/data/courtmap.db` (и `backend/data/photos/`, если нужно очистить фото) и перезапустить backend — БД создастся заново.
- **Фото** сохраняются в `backend/data/photos/`, отдаются с бэкенда по `/photos/...`.
- CORS: `CORS_ORIGINS` в `backend/.env` принимает список origins через запятую; для локальной разработки добавьте `http://localhost:5173`.
