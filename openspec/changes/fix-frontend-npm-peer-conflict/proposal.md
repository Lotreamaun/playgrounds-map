## Why

`frontend/package.json` требует `typescript@~6.0.2`, а `openapi-typescript@7.13.0` (dev-зависимость, используемая только скриптом `types:court`) объявляет peer `typescript@^5.x`. Из-за этого обычный `npm install` в `frontend/` завершается ошибкой `ERESOLVE` и прерывается, не докатив дерево зависимостей до конца. Конфликт заведён с коммита `10787e4` (8 сентября), когда `openapi-typescript` и Yandex Maps пакеты были добавлены одновременно, и с тех пор регулярно повторяется на машине разработчика (npm-логи фиксируют его 7, 8, 11 и 14 сентября). Наблюдаемое следствие — `npm run dev` падает при старте с `Failed to resolve import "@yandex/ymaps3-default-ui-theme"`, потому что этот пакет не успел установиться при прерванном `npm install`.

## What Changes

- Устранить конфликт пиров между `typescript` и `openapi-typescript`, чтобы `npm install` в `frontend/` проходил без `ERESOLVE` и без флагов, добавляемых вручную на каждой машине.
- Задокументировать (в `frontend/README` или соседнем месте, если оно есть) единственный поддерживаемый способ установки зависимостей, чтобы конфликт не «чинился» ad hoc каждый раз (руками через `--force`/`--legacy-peer-deps` на разных машинах, с разным результатом).

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- (none) — изменение затрагивает только конфигурацию инструментов сборки (`package.json`/`package-lock.json`/npm-конфиг), не поведение приложения. Поведение `types:court` (генерация типов из OpenAPI) не меняется.

## Impact

- `frontend/package.json`: версия `typescript` и/или `openapi-typescript` приводятся к совместимому диапазону (либо `.npmrc` закрепляет режим разрешения зависимостей — решение фиксируется в design.md).
- `frontend/package-lock.json`: пересобирается под финальный набор версий.
- Установка зависимостей и `npm run dev`/`npm run build`/`npm run types:court` в `frontend/` — единственные затронутые процессы; рантайм-код приложения не меняется.
