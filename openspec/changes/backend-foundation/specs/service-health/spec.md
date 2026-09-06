## Purpose

Даёт внешним системам (Docker/Dockhost healthcheck, frontend в браузере) минимальный контракт для проверки, что backend поднят, настроен и доступен по CORS, ещё до появления бизнес-функциональности площадок.

## ADDED Requirements

### Requirement: Health Check Endpoint
Система SHALL предоставлять `GET /health`, который возвращает успешный ответ без обращения к базе данных или внешним сервисам и без побочных эффектов.

#### Scenario: Successful health check
- **WHEN** клиент отправляет `GET /health`
- **THEN** сервис отвечает 200 с телом, не требующим аутентификации

#### Scenario: Repeated calls have no side effects
- **WHEN** `GET /health` вызывается многократно подряд
- **THEN** ответ каждый раз одинаковый и не создаёт, не изменяет и не удаляет данные

### Requirement: Cross-Origin Access for Configured Frontends
Система SHALL разрешать кросс-доменные запросы браузера только с origin'ов, перечисленных в конфигурации (`CORS_ORIGINS`), и отклонять остальные.

#### Scenario: Configured origin is allowed
- **WHEN** браузерный запрос приходит с origin, входящим в список `CORS_ORIGINS`
- **THEN** ответ содержит CORS-заголовки, разрешающие этот origin

#### Scenario: Unlisted origin is not allowed
- **WHEN** браузерный запрос приходит с origin, отсутствующим в `CORS_ORIGINS`
- **THEN** ответ не содержит CORS-заголовков, разрешающих этот origin
