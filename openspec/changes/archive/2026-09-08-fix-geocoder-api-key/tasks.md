## 1. Конфигурация

- [x] 1.1 Добавить `VITE_YANDEX_GEOCODER_KEY=your-yandex-geocoder-api-key` в `frontend/.env.example` с комментарием, что это ключ HTTP Geocoder API, отдельный от ключа карты.

## 2. Код

- [x] 2.1 В `frontend/src/components/CourtForm.tsx` заменить источник ключа для обратного геокодинга: читать `VITE_YANDEX_GEOCODER_KEY` (новый) вместо `VITE_YANDEX_MAPS_KEY` (текущий).
- [x] 2.2 Проверить, что проверка на отсутствие ключа (`API_KEY == null || API_KEY === ''`) применяется к новому `VITE_YANDEX_GEOCODER_KEY`, сохраняя коробочную деградацию (адрес остаётся пустым, форма сохраняет площадку).

## 3. Проверка

- [x] 3.1 Убедиться, что `frontend/src/services/yandexMaps.ts` не изменён (функция `reverseGeocode` уже принимает ключ параметром).
- [x] 3.2 Локально задать `VITE_YANDEX_GEOCODER_KEY` в `frontend/.env` (вне git), перезапустить Vite и проверить, что при выборе точки на карте поле адреса автоматически заполняется адресом.
