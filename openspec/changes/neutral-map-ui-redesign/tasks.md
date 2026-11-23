## 0. Подготовка

- [x] 0.1 Архивировать `mobile-safe-area-audit` (`openspec archive mobile-safe-area-audit`); незакрытые ручные проверки 4.1–4.3 перенести в раздел 9 этого файла
- [x] 0.2 После архивации добавить в `specs/frontend-bottom-sheet/spec.md` этого изменения MODIFIED-версию «Floating bottom controls include a buffer beyond the safe-area inset»: требование относится к стеку контролов карты и подсказке выбора точки, без упоминания FAB. Прогнать `openspec validate neutral-map-ui-redesign --strict`
- [x] 0.3 Создать ветку `feat/neutral-map-ui` от `main`

## 1. Токены, шрифт, очистка CSS (файлы: `src/index.css`, `src/main.tsx`, `index.html`, `package.json`)

- [x] 1.1 Установить `@fontsource-variable/commissioner`, импортировать `wght.css` в `main.tsx`, удалить `@import` Google Fonts из `index.css`, задать `--sans: 'Commissioner Variable', system-ui, …`
- [x] 1.2 Переписать блок токенов `:root` и тёмную тему по design §12:
  - роль `--text-on-accent`;
  - `--surface-2`;
  - `--dur-fast/base`, `--ease-out`;
  - удалить старые алиасы, `[data-theme]`-блоки и `--motion-spring`.
- [x] 1.3 Удалить мёртвый CSS: `.glass-over-map` с `prefers-reduced-transparency`, `#social`, `code`/`.counter`, глобальные `h1`/`h2` из Vite-шаблона, `.toggle`, `.ymaps3--controls_vertical`
- [x] 1.4 Базовые компоненты в CSS:
  - `.btn`, `.btn-primary` (`color: var(--text-on-accent)`), `.btn-secondary`, `.btn-ghost`, `.icon-btn` 44×44;
  - видимый `:focus-visible` для всех интерактивных элементов;
  - `box-sizing: border-box` глобально.
- [x] 1.5 `index.html`: `lang="ru"`, `<title>CourtMap — площадки на карте</title>`, `meta description`, `theme-color` для светлой и тёмной темы
- [x] 1.6 Проверка: `npm run build` и `npm run lint` чистые; в DevTools нет запросов к fonts.googleapis.com; контраст текста `.btn-primary` ≥ 4.5:1 в обеих темах

## 2. Слой данных (файлы: `src/hooks/useCourts.ts`, `src/hooks/useGeolocation.ts`, `src/utils/search.ts`, `src/utils/distance.ts`, `src/utils/route.ts`, `src/utils/labels.ts`)

- [x] 2.1 `useGeolocation` — модульный стор на `useSyncExternalStore`:
  - `status`/`position`/`request()`;
  - автозапрос один раз при первом подписчике;
  - склейка конкурентных запросов;
  - таймаут 8 с.
- [x] 2.2 `useCourts` — модульный кэш:
  - один `getCourts()` без bbox;
  - `status: loading | ready | error`;
  - `retry()`, `add(court)`, `byId(id)`.
- [x] 2.3 `utils/search.ts`: `normalize` (lowercase, ё→е), `filterCourts(courts, query)`, `sortCourts(courts, position)` (по расстоянию или `localeCompare('ru')` по имени)
- [x] 2.4 `utils/distance.ts`: добавить `formatDistance(km)` («850 м», «2,4 км» с запятой)
- [x] 2.5 `utils/route.ts`: `routeLinks(lat, lon, ua)` → массив `{ id, label, href }` по design §8, Apple только для Apple-UA
- [x] 2.6 `utils/labels.ts`: `translateLighting(bool)` → «Есть»/«Нет»; единая заглушка `NO_ADDRESS = 'Адрес не указан'`

## 3. Карточка площадки (файлы: `src/components/CourtCard.tsx`, `src/components/RouteMenu.tsx`, `src/components/Toast.tsx`, `src/hooks/useToast.ts`, секции CSS `.court-card*`, `.route-menu*`, `.toast*`)

- [x] 3.1 Вынести `CourtCard` из `CourtMarker.tsx` в свой файл и собрать его по спеке «Court details shown on marker click». Порядок сверху вниз:
  - фото с `loading="lazy"` и `aspect-ratio`;
  - спорт-индикатор;
  - H1-название в `--text-primary`;
  - расстояние;
  - строка адреса с кнопкой копирования;
  - «Маршрут»;
  - блок фактов: покрытие, состояние, освещение.
- [x] 3.2 `RouteMenu`: primary-кнопка «Маршрут» на всю ширину с `aria-expanded`, раскрывающийся список ссылок из `routeLinks`; закрытие по выбору, клику вне и Escape
- [x] 3.3 Копирование адреса или координат через `navigator.clipboard` с тостами «Адрес скопирован» / «Координаты скопированы» / «Не удалось скопировать»
- [x] 3.4 `Toast` (`role="status"`, `aria-live="polite"`, автоскрытие 2 с) + `useToast` (модульный стор, один тост на приложение)
- [x] 3.5 Лайтбокс фото сохранить (Escape, клик по фону), стили перевести на новые токены
- [x] 3.6 Раскладка фото по design §8b: проп `layout: 'panel' | 'sheet'`; на `sheet` — миниатюра 88×88 у названия, тап открывает лайтбокс
- [x] 3.7 Описание (`white-space: pre-line`, только если непустое) и строка «Данные от {дата}» через `Intl.DateTimeFormat('ru')`
- [x] 3.8 Кнопка «Поделиться» рядом с «Маршрут» (icon-кнопка с `aria-label`): `navigator.share` с игнором `AbortError`, фолбэк — копирование ссылки и тост «Ссылка скопирована»
- [x] 3.9 Ссылка «Сообщить о проблеме» из `VITE_REPORT_URL` с подстановкой `{id}`; не рендерить при пустой переменной; добавить тип в `vite-env.d.ts`

## 4. Список и поиск (файлы: `src/components/CourtList.tsx`, `src/components/SearchField.tsx`, секции CSS `.court-list*`, `.search-field*`)

- [x] 4.1 `SearchField`: `input type="search"` с иконкой лупы, кнопкой очистки и `aria-label`. Два режима: `readOnly`-триггер (мобильная карта) и настоящий ввод
- [x] 4.2 Переписать `CourtList` по спеке «List shows court details»:
  - принимает уже отфильтрованные и отсортированные площадки и `position`;
  - строка: название, адрес, «покрытие · состояние», расстояние;
  - без чипов и без переключателя «По близости».
- [x] 4.3 Состояния списка: скелетоны при `loading`, «Ничего не найдено», «Пока нет ни одной площадки» с действием добавить, ошибка с «Повторить»
- [x] 4.4 `useDeferredValue` для запроса; мемоизация фильтра и сортировки

## 5. Мобильные оболочки (файлы: `src/components/CardSheet.tsx`, `src/components/FullScreenLayer.tsx`, `src/components/SearchScreen.tsx`; удалить `src/components/BottomSheet.tsx`; секции CSS `.card-sheet*`, `.layer*`, `.search-screen*`)

- [x] 5.1 `CardSheet` — немодальная шторка по спеке «Bottom sheet opens over the map» и «Card sheet can be dismissed in several ways»:
  - без overlay;
  - `max-height: 85dvh`;
  - drag вниз за ручку или шапку с порогом и возвратом;
  - «×», Escape, safe-area;
  - отдаёт свою высоту через колбэк (`ResizeObserver`).
- [x] 5.2 `FullScreenLayer`: `position: fixed; inset: 0; height: 100dvh`; `pushState` при открытии и закрытие по `popstate` (design §5); фокус на первый интерактивный элемент
- [x] 5.3 `SearchScreen`: шапка с кнопкой «назад» и `SearchField` в фокусе, под ней `CourtList`; выбор строки закрывает слой и открывает карточку
- [x] 5.4 Удалить `BottomSheet.tsx` и его CSS после перевода всех мест использования

## 6. Карта (файлы: `src/components/MapView.tsx`, `src/components/MapControls.tsx`, `src/components/CourtMarker.tsx`, `src/services/yandexMaps.ts`, секции CSS `.map-*`, `.court-marker*`)

- [x] 6.1 `MapView`:
  - убрать собственные запросы площадок (bbox, `onUpdate` → fetch) и геолокации;
  - принимать `courts` и `position` пропами;
  - центрировать на `position` один раз при первом получении.
- [x] 6.2 Проверить, что проп `margin` у `YMap` влияет на `setLocation`. Если да — передавать `[0,0,sheetHeight,0]` на мобильном при открытой карточке; иначе реализовать фолбэк из design §7
- [x] 6.3 `MapControls` — собственный DOM-стек у правого края по спеке «Map controls do not overlap app chrome»:
  - desktop: zoom± и «Где я»;
  - мобильный: «+» и «Где я»;
  - кнопки 44×44, отступы над атрибуцией;
  - скрытие при открытой шторке.
  Удалить `YMapControls`/`YMapControl` из `yandexMaps.ts`.
- [x] 6.4 Тап по пустой карте вне режима добавления → колбэк закрытия карточки (спека «Card sheet can be dismissed in several ways»)
- [x] 6.5 Мемоизировать `clusterByGrid` и рендер-колбэки; `CourtMarker` в `React.memo` с пропами-примитивами; убрать из `CourtMarker.tsx` всё, что относится к карточке

## 7. Форма добавления (файлы: `src/components/CourtForm.tsx`, `src/components/OptionGroup.tsx`, секции CSS `.court-form*`, `.option-group*`)

- [x] 7.1 `OptionGroup` — радиогруппа из кнопок-вариантов (≥ 44 px, стрелки клавиатуры, `role="radiogroup"` + `aria-labelledby`); заменить `<select>` покрытия и состояния
- [x] 7.2 Убрать вывод сырых координат; блок местоположения показывает «Определяем местоположение…», адрес точки, «Точка выбрана на карте» или фолбэк «Указать на карте»
- [x] 7.3 Брать местоположение из `useGeolocation` (известное — сразу; иначе `request()`), убрать собственный `navigator.geolocation` из `App`; после успешного `POST` вызывать `useCourts().add(court)`
- [x] 7.4 Стили формы на новых токенах; поле файла фото оформить как кнопку «Добавить фото» с именем выбранного файла
- [x] 7.5 Поле «Комментарий»: `textarea` с `maxLength=500`, счётчик от 450 символов, `trim()` и отправка как `description` только если непусто

## 8. Сборка приложения (файлы: `src/App.tsx`, `src/components/SidePanel.tsx`, `src/hooks/useCourtUrl.ts`, секции CSS `.app-shell`, `.side-panel*`, `.mobile-*`)

- [x] 8.1 Переписать `App` на дискриминированный `ui`-стейт (design §2); подключить `useCourts`, `useGeolocation`, общий `searchQuery`, мемоизированные `distances`
- [x] 8.2 Desktop:
  - `SidePanel` с шапкой («CourtMap», secondary «+ Добавить», `SearchField`);
  - контент: список (скрыт через `hidden` при карточке) / карточка с «← К списку» / форма;
  - Escape возвращает к списку.
- [x] 8.3 Мобильный: плавающий `SearchField`-триггер сверху (safe-area top), `MapControls`, `CardSheet`, `SearchScreen` в `FullScreenLayer`, форма в `FullScreenLayer`, режим выбора точки с подсказкой и «Отмена»
- [x] 8.4 `useCourtUrl`: чтение `?court` на старте, открытие карточки после `ready`, `replaceState` при выборе и закрытии, удаление неизвестного id
- [x] 8.5 После успешного добавления (design §8c): `add(court)` → закрыть форму → открыть карточку новой площадки → тост «Площадка добавлена»
- [x] 8.6 Прокинуть `VITE_REPORT_URL` в `frontend/.env.example` (пустое значение с комментарием-примером), `ARG`/`ENV` в `frontend/Dockerfile`, build-args в `docker-compose.yml`; описать переменную в `README.md`
- [x] 8.7 Удалить неиспользуемый код (`useMediaQuery` оставить, если используется; старые состояния `listCourts`/`allCourtsLoaded`/`locateTokenRef`)

## 9. Документация

- [x] 9.1 Перенести `docs/material-liquid-glass-spec.md` и `docs/courtmap-ui-kit.html` в `docs/archive/` с шапкой «Устарело: заменено нейтральной дизайн-системой (neutral-map-ui-redesign)»
- [x] 9.2 Переписать `docs/courtmap-design-system.md` в нейтральном ключе по итоговым токенам и компонентам (без стекла и пружин; раскладки mobile/desktop; правила атрибуции Яндекса)
- [x] 9.3 Обновить `docs/CLAUDE.md`: убрать упоминание `@yandex/ymaps3-default-ui-theme`, Leaflet в data flow и устаревшую фразу «specs/changes пусты»

## 10. Проверка

- [x] 10.1 `npm run build` и `npm run lint` без ошибок; размер JS gzip вырос не больше чем на ~10 КБ относительно 80.8 КБ
- [x] 10.2 Ручной прогон всех сценариев изменённых спеков на 1280×800 и 390×844, в светлой и тёмной теме (тестовые данные — во временной БД через `DATABASE_URL`)
- [x] 10.3 Сетевые проверки: один `GET /courts` при старте, ноль при движении карты, ноль запросов к Google Fonts
- [x] 10.4 Атрибуция Яндекса видна и не перекрыта на обеих платформах без открытой шторки
- [ ] 10.5 Прод-сборка через `docker compose up --build`: главный сценарий «поиск → карточка → маршрут/копирование» и добавление площадки работают
- [ ] 10.6 Ручные проверки на реальном телефоне, перенесённые из `mobile-safe-area-audit`: высота карты не прыгает при сворачивании адресной строки; контролы не упираются в браузерную панель; форма корректно пересчитывается под клавиатуру

## 11. Доработки после проверки на устройстве

Три пакета с непересекающимися файлами. 11A и 11B идут параллельно в отдельных worktree, 11C — после слияния обоих. В `src/index.css` каждый пакет правит только свои секции.

### 11A. Исправления (файлы: `src/components/MapView.tsx`, `src/services/yandexMaps.ts`; в `src/index.css` — токен `--text-input` сразу после `--sans`, секции `.map-view*`, `.search-field*`, `.side-panel__header`, `.search-screen__header`, плавающее поле поиска мобильной карты и правила полей `.court-form`)

- [ ] 11.1 Ошибка загрузки карты по design §15: состояние «Карта не загрузилась» с подсказкой и кнопкой «Повторить»; `loadScript` удаляет свой `<script>` при ошибке; повтор перезапускает `loadYandexMaps`; сообщение о пустом ключе не меняется
- [ ] 11.2 Токен `--text-input: 16px`; применить ко всем `input`, `textarea`, `select` (поиск, поля формы); viewport не трогать (design §16)
- [ ] 11.3 Убрать `flex: 1` у базового `.search-field`, задать растягивание в строковых контекстах (design §17); проверить высоту 44/50 px в шапке панели desktop, на экране поиска и на мобильной карте
- [ ] 11.4 Проверка: `npm run build`, `npm run lint`; на 390×844 фокус в поле поиска и полях формы не меняет `visualViewport.scale`; при заблокированном `api-maps.yandex.ru` показывается состояние ошибки, а после снятия блокировки «Повторить» загружает карту

### 11B. Визуальные факты и фото (файлы: новые `src/components/CourtPhoto.tsx`, `src/components/CourtFacts.tsx`, `src/components/SportBadge.tsx`, `src/utils/image.ts`; изменяются `src/components/CourtCard.tsx`, `src/components/CourtList.tsx`, `src/components/CourtForm.tsx`, `src/utils/labels.ts`; в `src/index.css` — цветовые роли сразу после `--sport-*` в светлой и тёмной теме, секции `.court-card*`, `.court-list__row*`, новые `.court-photo*`, `.fact-chip*`, `.sport-badge*`)

- [ ] 11.5 Токены `--condition-*`, `--material-*`, `--lighting-on` для обеих тем по design §19 и спеке «Semantic color roles for court facts» (контраст маркера с `--surface-2` ≥ 3:1)
- [ ] 11.6 `CourtPhoto` по design §18: варианты `thumb`/`sheet`/`banner`, заглушка с иконкой спорта, проявление по `onLoad`, фолбэк по `onError`, `prefers-reduced-motion`
- [ ] 11.7 `SportBadge` (круг `--sport-<type>` с белой иконкой, как у маркера) и `CourtFacts` (`compact`/`regular`, порядок «Покрытие · Состояние · Свет», `aria-label` с категорией, чип света скрыт при `null`)
- [ ] 11.8 `CourtCard`: фото и заглушка через `CourtPhoto` (лайтбокс только для настоящего фото), `SportBadge` в чипе спорта вместо точки, `CourtFacts regular` вместо `<dl>`
- [ ] 11.9 `CourtList`: строка — миниатюра `CourtPhoto thumb` слева, `SportBadge` 20 px перед названием, адрес, `CourtFacts compact`, расстояние справа; высота строки стабильна при любой длине данных
- [ ] 11.10 `utils/image.ts` `compressPhoto(file)`: длинная сторона ≤ 1600 px, JPEG с качеством 0,8 через `createImageBitmap` + `canvas`, фолбэк на исходный файл; вызвать в `CourtForm` перед `createCourt`
- [ ] 11.11 Проверка: `npm run build`, `npm run lint`; визуально список и карточка (с фото и без) на 390×844 и 1280×800 в обеих темах

### 11C. Фильтры (после слияния 11A и 11B; файлы: новые `src/utils/filters.ts`, `src/components/FilterBar.tsx`; изменяются `src/App.tsx`, `src/components/SidePanel.tsx`, `src/components/SearchScreen.tsx`, `src/components/CourtList.tsx` (только пустое состояние); в `src/index.css` — новая секция `.filter-bar*` и раскладка мобильной карты под полем поиска)

- [ ] 11.12 `utils/filters.ts`: тип `CourtFilters`, `applyFilters`, `hasActiveFilters`, `availableSurfaces`, `EMPTY_FILTERS` (design §20)
- [ ] 11.13 `FilterBar`: чипы-переключатели с `aria-pressed` и галочкой, чип «Покрытие» с поповером чекбоксов (только покрытия из данных; закрытие по клику вне, Escape и повторному нажатию), подпись «Резина +1», чип «Сбросить», горизонтальная прокрутка без переноса, анимации за `--dur-fast`
- [ ] 11.14 `App`: состояние `filters`; конвейер `applyFilters` → карта и список; выбранная площадка всегда передаётся в карту; ряд на мобильной карте под полем поиска, скрыт в режиме выбора точки
- [ ] 11.15 `SidePanel` и `SearchScreen`: `FilterBar` под полем поиска с общим состоянием
- [ ] 11.16 `CourtList`: при пустом результате и активных фильтрах кнопка «Сбросить фильтры» (запрос сохраняется)
- [ ] 11.17 Проверка: `npm run build`, `npm run lint`, JS ≤ 95 КБ gzip; сценарии спек «Courts can be filtered…» и «Filters apply to map markers» на 390×844 и 1280×800 в обеих темах; изменение фильтров не даёт запросов `GET /courts`

### 11D. Приёмка

- [ ] 11.18 Ревью диффов 11A–11C (Opus), повторный прогон всех сценариев раздела 10.2 и новых сценариев
- [ ] 11.19 Проверка на iPhone по локальной сети после того, как владелец ключа добавит адрес в ограничения HTTP Referer в кабинете Яндекса (закрывает и 10.6)
