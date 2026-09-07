# CourtMap (playgrounds-map)

**CourtMap** — «народная карта» спортивных площадок. Пользователи отмечают на карте площадки (баскетбол, футбол, волейбол, теннис, хоккей и др.), указывают покрытие, состояние, освещение и другие атрибуты. В перспективе — хаб для любительского спорта: найти площадку и договориться об игре.

## MVP

Веб-карта баскетбольных площадок одного города (Тбилиси): маркеры на карте, карточка площадки, форма добавления новой площадки без регистрации и модерации.

## Технологии (план)

- **Frontend**: React 19 + TypeScript, Vite, Yandex Maps JS API (ymaps3)
- **Backend**: Python 3.12+, FastAPI, SQLModel, SQLite
- **Деплой**: Docker + Docker Compose, Dockhost

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
| `DELETE /courts/{id}` | — | удалить площадку; требует заголовок `admin-token` со значением `ADMIN_TOKEN` из `backend/.env` |

### Примечания

- **Сброс данных**: удалить `backend/data/courtmap.db` (и `backend/data/photos/`, если нужно очистить фото) и перезапустить backend — БД создастся заново.
- **Фото** сохраняются в `backend/data/photos/`, отдаются с бэкенда по `/photos/...`.
- CORS: `CORS_ORIGINS` в `backend/.env` принимает список origins через запятую; для локальной разработки добавьте `http://localhost:5173`.
