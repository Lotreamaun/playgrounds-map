## Why

На телефонах с вырезом (челкой) и домашним индикатором карта не доходит до краёв экрана: в `frontend/index.html` viewport meta не содержит `viewport-fit=cover`, поэтому браузер инсетит layout-viewport, а `env(safe-area-inset-*)` возвращает `0`. Визуально карта выглядит обрезанной/окружённой полосами, а существующие safe-area отступы для поиска, контролов и шторок не срабатывают.

## What Changes

- Добавить `viewport-fit=cover` в `<meta name="viewport">` (`frontend/index.html`), чтобы страница расширялась на весь экран, включая зону выреза и домашнего индикатора.
- Проверить и, при необходимости, скорректировать `theme-color`/фон, чтобы полосы не контрастировали до расширения карты.
- Убедиться, что уже используемые в CSS `env(safe-area-inset-*)` отступы (поиск-pill, MapControls, CardSheet, FullScreenLayer) работают с ненулевыми insets и не прилипают к краям.
- Обновить спеки: полноэкранный вид карты на устройствах с вырезом и применение safe-area insets к оверлеям.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `frontend-mapping`: добавить требование/сценарий о полноэкранном виде карты на устройствах с вырезом/домашним индикатором (через `viewport-fit=cover`).
- `frontend-bottom-sheet`: уточнить, что safe-area insets ненулевые и применяются к плавающим элементам и шторкам.

## Impact

- `frontend/index.html` (viewport meta)
- `frontend/src/index.css` (проверка safe-area отступов; изменений может не потребоваться)
- Спеки: `openspec/specs/frontend-mapping/spec.md`, `openspec/specs/frontend-bottom-sheet/spec.md`
