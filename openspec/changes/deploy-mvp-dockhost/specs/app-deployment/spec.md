## Purpose

Определяет прод-топологию развёртывания CourtMap на платформе Dockhost: два контейнера (nginx-фронтенд и FastAPI-бэкенд) под одним доменом, простая маршрутизация API/фото/health через фронтенд-nginx, данные (SQLite + фото) на постоянном сетевом диске.

## ADDED Requirements

### Requirement: Backend Starts with an Empty Data Volume

Система SHALL успешно стартовать на свежем, пустом persistent-томе: приложение SHALL самостоятельно создавать недостающие runtime-директории данных (каталог БД и каталог фото) перед началом работы, а не предполагать их заранее созданными в образе.

#### Scenario: Fresh volume, no runtime directories

- **WHEN** backend-контейнер запускается с чистым томом данных, на котором ещё нет каталога базы и каталога фото
- **THEN** сервис создаёт недостающие директории, стартует без ошибок и отвечает на `GET /health` статусом 200

#### Scenario: Existing volume with data

- **WHEN** backend-контейнер запускается с томом, на котором уже есть база данных и загруженные фото
- **THEN** сервис стартует без ошибок, не пересоздавая и не удаляя существующие данные

#### Scenario: Health check before and after court creation

- **WHEN** `GET /health` вызывается до и после добавления площадки
- **THEN** ответ в обоих случаях идентичен (дешёвый, без обращения к БД и без побочных эффектов)

### Requirement: Backend API Reachable Inside the Deployment Network

Система SHALL слушать HTTP-API на TCP-порту, доступном другим контейнерам внутри проекта Dockhost, и передавать обратно реальные клиентские адрес и схему (HTTPS) из заголовков обратного прокси, чтобы API корректно работал за фронтенд-nginx.

#### Scenario: Frontend reaches backend by service name

- **WHEN** фронтенд-контейнер отправляет запрос на `GET /health` backend-контейнера по имени сервиса в сети проекта
- **THEN** backend отвечает 200, запрос не отклоняется из-за адреса прослушивания

#### Scenario: Client scheme and IP preserved through the proxy

- **WHEN** клиент обращается к API через фронтенд-nginx (по HTTPS), и nginx передаёт стандартные заголовки обратного прокси
- **THEN** ответ генерируется с учётом исходного протокола и IP клиента (без принудительных редиректов на http и без потери схемы)

### Requirement: Frontend Served as a Static Build with SPA Fallback

Фронтенд-контейнер SHALL раздавать продакшен-сборку фронтенда по корневому пути домена как статику: HTML-страница, собранные ассеты и fallback на `index.html` для несуществующих путей приложения.

#### Scenario: Root path serves the app

- **WHEN** браузер открывает корневой адрес домена
- **THEN** сервер отдаёт HTML-страницу приложения со ссылками на собранные ассеты

#### Scenario: Unknown app path falls back to index.html

- **WHEN** браузер запрашивает несуществующий путь, не являющийся статическим ассетом
- **THEN** сервер отдаёт `index.html` (SPA-fallback), а не 404

#### Scenario: Hashed assets are cached

- **WHEN** браузер повторно запрашивает собранные ассеты (имена содержат хеш содержимого)
- **THEN** сервер отдаёт их с длительным кэшированием, а `index.html` — без кэша (чтобы новая версия приложения подхватывалась сразу)

### Requirement: API, Photo and Health Paths Proxied to the Backend

Система SHALL маршрутизировать запросы к API, фото и healthcheck с того же домена на backend-контейнер по имени сервиса в сети проекта, сохраняя пути без изменений.

#### Scenario: Court list proxied from the app origin

- **WHEN** браузер запрашивает `GET /courts` по адресу приложения
- **THEN** фронтенд-nginx передаёт запрос на backend, и браузер получает список площадок

#### Scenario: Court creation proxied from the app origin

- **WHEN** браузер отправляет `POST /courts` (`multipart/form-data`, с фото) по адресу приложения
- **THEN** запрос передаётся на backend, и ответ (включая `photo_url`) возвращается в неизменном виде

#### Scenario: Photo file served from the app origin

- **WHEN** браузер запрашивает `GET /photos/{filename}` по адресу приложения (по `photo_url` из карточки площадки)
- **THEN** файл отдаётся браузеру с корректным Content-Type и содержимым

#### Scenario: Swagger and OpenAPI schema proxied

- **WHEN** разработчик открывает `/docs` или `/openapi.json` по адресу приложения
- **THEN** страница Swagger и схема доступны (проксируются на backend)

#### Scenario: Health probe from the platform

- **WHEN** платформа обращается к `GET /health` по адресу приложения
- **THEN** ответ 200 со статусом `ok`

### Requirement: Data Persists Across Container Restarts

Система SHALL хранить базу данных SQLite и загруженные фото на постоянном томе данных, переживающем пересоздание контейнеров и редеплой.

#### Scenario: Court persists after backend restart

- **WHEN** backend-контейнер перезапускается после добавления площадки
- **THEN** добавленная площадка по-прежнему возвращается в `GET /courts`

#### Scenario: Photo persists after backend restart

- **WHEN** backend-контейнер перезапускается после загрузки фото
- **THEN** `GET /photos/{filename}` по-прежнему отдаёт загруженный файл

### Requirement: Production Uses a Single Origin for App and API

В продакшен-сборке фронтенда система SHALL обращаться к API, фото и healthcheck по тому же origin, с которого загружено приложение (без отдельного API-домена), что делает CORS для продакшена ненужным.

#### Scenario: API base resolves to the app origin

- **WHEN** браузер загружает прод-сборку приложения с домена и приложение выполняет запрос к API
- **THEN** запрос направляется на тот же домен, без обращения к отдельному API-хосту

#### Scenario: Relative photo URLs resolve within the app origin

- **WHEN** карточка площадки отображает фото по `photo_url` из ответа API
- **THEN** URL ведёт на тот же домен, что и приложение, и фото загружается без CORS-заголовков

#### Scenario: Court addition works end-to-end in production

- **WHEN** пользователь добавляет площадку с фото в прод-окружении
- **THEN** запрос достигает backend, площадка сохраняется, фото отображается в карточке, и никакие запросы не блокируются из-за CORS или неверной схемы (http/https)