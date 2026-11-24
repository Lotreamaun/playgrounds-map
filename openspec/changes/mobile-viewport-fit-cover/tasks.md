## 1. Viewport meta

- [x] 1.1 Добавить `viewport-fit=cover` в `<meta name="viewport">` в `frontend/index.html`, сохранив `interactive-widget=resizes-content`.
- [x] 1.2 Проверить, что `theme-color` meta совпадает с фоном (светлая/тёмная тема) и не создаёт контраста до загрузки карты.

## 2. Проверка safe-area отступов

- [ ] 2.1 Проверить на устройстве с вырезом, что `env(safe-area-inset-top)` и `env(safe-area-inset-bottom)` ненулевые после добавления cover.
- [ ] 2.2 Убедиться, что `.mobile-search` (top `safe-area + 12px`), MapControls (bottom `safe-area + 64px`), CardSheet и FullScreenLayer корректно учитывают insets и не прилипают к краям.
- [ ] 2.3 При необходимости скорректировать буферы в `frontend/src/index.css` (например, `+16px`), если insets оказались больше ожидаемых.

## 3. Проверка и редеплой

- [x] 3.1 Локальная проверка: собрать фронтенд (`npm run build`) и убедиться, что meta присутствует в `dist/index.html`.
- [ ] 3.2 Ручная проверка на физическом телефоне с вырезом: карта доходит до краёв экрана, нет полос по челке/URL-бару/домашнему индикатору.
- [ ] 3.3 Редеплой фронтенда на Dockhost и повторная проверка по публичному URL.
