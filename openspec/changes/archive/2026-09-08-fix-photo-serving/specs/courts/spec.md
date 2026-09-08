## MODIFIED Requirements

### Requirement: Photo Upload Validation
Система SHALL принимать фото площадки только в форматах jpg/png и размером не более 5 МБ, сохраняя валидные файлы на диск и отклоняя остальные. Сохранённые файлы SHALL быть доступны для загрузки через HTTP GET по URL, указанному в `photo_url`.

#### Scenario: Valid photo is stored
- **WHEN** клиент отправляет `POST /courts` с фото в формате jpg или png размером до 5 МБ
- **THEN** площадка создаётся с `photo_url`, указывающим на сохранённый файл

#### Scenario: Photo URL is accessible via HTTP
- **WHEN** клиент запрашивает GET по URL из `photo_url` созданной площадки
- **THEN** ответ содержит бинарное содержимое фото с корректным Content-Type (image/jpeg или image/png)

#### Scenario: Oversized photo is rejected
- **WHEN** клиент отправляет `POST /courts` с фото больше 5 МБ
- **THEN** ответ 400, площадка не создаётся

#### Scenario: Wrong file type is rejected
- **WHEN** клиент отправляет `POST /courts` с файлом не jpg/png
- **THEN** ответ 400, площадка не создаётся
