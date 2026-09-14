## 1. Конфигурация зависимостей

- [x] 1.1 В `frontend/package.json` добавить поле `overrides`, принуждающее `openapi-typescript` использовать корневую версию `typescript`:
  ```json
  "overrides": {
    "openapi-typescript": {
      "typescript": "$typescript"
    }
  }
  ```
- [x] 1.2 Удалить текущий `frontend/node_modules` и `frontend/package-lock.json`, выполнить чистый `npm install` в `frontend/` без флагов `--force`/`--legacy-peer-deps`.
- [x] 1.3 Убедиться, что `npm install` завершился без `ERESOLVE` и `npm ls typescript openapi-typescript` не показывает `invalid`.
- [x] 1.4 Закоммитить обновлённые `frontend/package.json` и `frontend/package-lock.json`.

## 2. Проверка

- [x] 2.1 Пакет `@yandex/ymaps3-default-ui-theme` больше не является зависимостью (удалён из `package.json` в `custom-map-nav-controls`) и не резолвится нигде в коде — кроме комментария в `index.css`, упоминающего его удаление.
- [x] 2.2 Запустить `npm run dev` в `frontend/` и убедиться, что Vite стартует без ошибки резолва `@yandex/ymaps3-default-ui-theme` (ни в CSS `@import`, ни в динамическом `import()`).
- [x] 2.3 Запустить `npm run build` (`tsc -b && vite build`) и убедиться, что сборка проходит без новых ошибок типов.
- [x] 2.4 Запустить `npm run types:court` против локального бэкенда (`http://localhost:8000/openapi.json`) и убедиться, что генерация типов отрабатывает без ошибок, специфичных для TS6 (см. design.md — Risks).

## 3. Документация

- [x] 3.1 Зафиксировать в `frontend/README` (или создать краткую заметку, если файла нет) единственный поддерживаемый способ установки зависимостей (`npm install` без флагов) и одну строку про причину `overrides` — со ссылкой на этот change, чтобы конфликт не решали ad hoc в будущем.
