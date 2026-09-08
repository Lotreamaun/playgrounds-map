## Why

При загрузке фото площадки backend сохраняет файл на диск и возвращает `photo_url` вида `/photos/{uuid}.jpg`, но не отдаёт эти файлы по HTTP — в `main.py` нет `app.mount` для статики. Фронтенд рендерит `<img src="/photos/uuid.jpg">`, получает 404. Фото загружаются, но never отображаются.

## What Changes

- Добавить `app.mount("/photos", StaticFiles(...))` в `main.py`, чтобы файлы из `data/photos` отдавались по HTTP
- Добавить требование в спецификацию `courts`: photo_url должен быть доступен для загрузки через GET

## Capabilities

### New Capabilities

_(нет)_

### Modified Capabilities

- `courts`: добавить требование, что photo_url, возвращаемый при создании площадки, должен быть доступен для загрузки через HTTP GET

## Impact

- `backend/app/main.py` — добавление staticFiles mount
- `openspec/specs/courts/spec.md` — добавление требования о доступности фото
- Новые зависимости: нет (StaticFiles уже входит в FastAPI/starlette)
