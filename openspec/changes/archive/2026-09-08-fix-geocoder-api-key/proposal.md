## Why

Автоподстановка адреса в форме добавления площадки не работает: Yandex Geocoder HTTP API возвращает 403 "Invalid api key", потому что для обратного геокодинга используется ключ Yandex Maps JS API, который не подходит для HTTP-геокодера. Приложение деградирует корректно (поле адреса остаётся пустым, форма сохраняет площадку), но адрес не заполняется автоматически.

## What Changes

- Введён отдельный ключ `VITE_YANDEX_GEOCODER_KEY` для Yandex Geocoder HTTP API (`geocode-maps.yandex.ru/v1`).
- Ключ карты `VITE_YANDEX_MAPS_KEY` используется только для загрузки карты; ключ геокодера — только для обратного геокодинга.
- `CourtForm` при обратном геокодинге читает `VITE_YANDEX_GEOCODER_KEY` вместо `VITE_YANDEX_MAPS_KEY`.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `frontend-court-ui`: требование автозаполнения адреса теперь использует выделенный Geocoder API ключ, а не Maps JS API ключ.

## Impact

- `frontend/src/components/CourtForm.tsx`: замена источника ключа для `reverseGeocode` (`VITE_YANDEX_MAPS_KEY` → `VITE_YANDEX_GEOCODER_KEY`).
- `frontend/.env.example`: добавлен образец `VITE_YANDEX_GEOCODER_KEY`.
- `frontend/src/services/yandexMaps.ts`: без изменений — функция `reverseGeocode` уже принимает ключ параметром.
- `.env`: пользователь добавит реальное значение ключа локально (вне репозитория).
