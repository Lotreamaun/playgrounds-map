## 1. Backend: address field and migration

- [x] 1.1 Добавить `address: Optional[str] = None` в `CourtBase` в `backend/app/models/court.py`
- [x] 1.2 Расширить `create_db_and_tables()` в `backend/app/core/database.py`: идемпотентная проверка наличия столбца `address` в `courts` и `ALTER TABLE ... ADD COLUMN address VARCHAR` при его отсутствии
- [x] 1.3 Обновить `POST /courts` в `backend/app/routers/courts.py` для приёма необязательного поля `address` (по `Form`) и сохранения его в создаваемую запись
- [x] 1.4 Убедиться, что `GET /courts` и `GET /courts/{id}` возвращают поле `address` (модель ответа = `Court`, поле уже в модели)
- [x] 1.5 Проверить ручным запросом через Swagger: создание площадки c `address`, без `address`, и возврат `address` в списке и по id

## 2. Frontend: types and API client

- [x] 2.1 Перегенерировать `frontend/src/types/court.ts` через `npm run types:court` (нужен запущенный backend), убедиться что появилось поле `address`
- [x] 2.2 При необходимости добавить поле `address` в `CreateCourtParams` и его передачу в `createCourt` в `frontend/src/services/api.ts`

## 3. Frontend: geocoding in the add-court form

- [x] 3.1 Определить точный механизм обратного геокодирования (модуль v3 SDK либо HTTP-запрос к Геокодер API с `VITE_YANDEX_MAPS_KEY`) и добавить обёртку-функцию геокодирования в `frontend/src/services/yandexMaps.ts`
- [x] 3.2 В `CourtForm.tsx` добавить поле ввода адреса; при получении координат (проп `coordinates`) вызывать геокодер и подставлять адрес в поле
- [x] 3.3 Сделать поле адреса редактируемым вручную и необязательным для отправки (пустой адрес допустим)
- [x] 3.4 Добавить кэш `координаты → адрес` в рамках сессии, чтобы повторный клик в ту же точку не вызывал повторный запрос к геокодеру
- [x] 3.5 Обработать случай недоступности геокодера: поле остаётся пустым, форма работает дальше без адреса
- [x] 3.6 Передавать `address` (если не пуст) в `createCourt`

## 4. Frontend: court card shows address

- [x] 4.1 В `CourtMarker.tsx` изменить отображение адреса: использовать `court.address` вместо `court.description`
- [x] 4.2 Показывать русскую заглушку (например «Адрес не указан»), когда `address` отсутствует, вместо «Address unavailable»

## 5. Verification

- [x] 5.1 Прогнать `npm run lint` и `npm run build` во `frontend`
- [x] 5.2 Запустить backend и frontend, проверить полный сценарий: добавить площадку с автоподставленным и отредактированным адресом, открыть карточку и увидеть адрес
- [x] 5.3 Проверить, что существующая БД (`backend/data/courtmap.db`) не теряет данные после применения миграции
