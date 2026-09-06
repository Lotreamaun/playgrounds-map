## 1. Конфигурация

- [ ] 1.1 `core/config.py` — `Settings`, читающий `.env` и отдающий `DATABASE_URL`, `CORS_ORIGINS`, `ADMIN_TOKEN`, `LOG_LEVEL` как атрибуты

## 2. База данных и модель

- [ ] 2.1 `core/database.py` — синхронный engine из `DATABASE_URL`, `Depends`-функция сессии
- [ ] 2.2 `models/court.py` — SQLModel-модель `Court` (поля из `vision.md` §5, включая `attributes` JSON под будущий мультиспорт), проходит валидацию Pydantic на некорректных данных
- [ ] 2.3 Автосоздание таблиц при старте приложения (`SQLModel.metadata.create_all` в startup-хуке)

## 3. Приложение и health-check

- [ ] 3.1 `main.py` — инициализация FastAPI, регистрация startup-хука создания таблиц
- [ ] 3.2 CORS middleware по списку `CORS_ORIGINS` из конфигурации
- [ ] 3.3 `GET /health` — без побочных эффектов и обращений к БД

## 4. Логирование

- [ ] 4.1 Настроить `logging` на вывод в stdout/stderr (без файлового хендлера)

## 5. Проверка

- [ ] 5.1 `uvicorn app.main:app` стартует, Swagger доступен на `/docs`
- [ ] 5.2 `GET /health` вручную через Swagger возвращает 200
- [ ] 5.3 Запрос с origin из `CORS_ORIGINS` (`http://localhost:5173`) получает разрешающие CORS-заголовки; запрос с произвольного origin — нет
- [ ] 5.4 Лог-сообщения видны в консоли при локальном запуске, файл `*.log` не создаётся
