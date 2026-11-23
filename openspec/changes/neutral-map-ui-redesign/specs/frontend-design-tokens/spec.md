## MODIFIED Requirements

### Requirement: Single typography family across the UI

Интерфейс SHALL использовать единственное семейство шрифтов (Commissioner) для всего текста, с системным fallback-стеком на случай недоступности веб-шрифта. Файлы шрифта SHALL отдаваться с того же origin, что и приложение (self-hosted), без запроса к сторонним шрифтовым сервисам и без блокирующей рендер загрузки таблицы стилей шрифта; до загрузки шрифта текст SHALL отображаться fallback-шрифтом (`font-display: swap`).

#### Scenario: Primary font applied
- **WHEN** страница интерфейса загружена и веб-шрифт доступен
- **THEN** вычисленный `font-family` текстовых элементов интерфейса — Commissioner

#### Scenario: Font fallback when web font unavailable
- **WHEN** веб-шрифт Commissioner не загрузился (например, нет сети)
- **THEN** текст остаётся читаемым за счёт системного fallback-стека, без невидимого текста

#### Scenario: No third-party font request
- **WHEN** страница загружается
- **THEN** в сетевых запросах нет обращений к `fonts.googleapis.com`/`fonts.gstatic.com`; файлы шрифта приходят с origin приложения

### Requirement: Neutral and interactive-accent color roles for light and dark themes

Система SHALL предоставлять нейтральные цветовые роли (`bg`, `surface`, `border`, `text-primary`, `text-secondary`), единственную интерактивную акцентную роль (`accent`, `accent-hover`, `accent-focus`) и роль текста поверх акцента (`text-on-accent`), каждая с определением для светлой и тёмной темы (`prefers-color-scheme: dark`). Акцентная роль SHALL использоваться только для интерактивных элементов (кнопки, ссылки, фокус-кольцо, выбранный пункт). Текст и иконки на заливке акцентом SHALL использовать `text-on-accent`; заголовки SHALL использовать `text-primary`. Контраст основного текста к его фону SHALL быть не ниже 4.5:1 в обеих темах.

#### Scenario: Accent role resolves in light theme
- **WHEN** интерфейс отображается в светлой теме
- **THEN** акцентная роль разрешается в графитовый цвет, а текст на акцентной кнопке — в светлый `text-on-accent`

#### Scenario: Accent role resolves in dark theme
- **WHEN** пользовательская ОС сообщает `prefers-color-scheme: dark`
- **THEN** нейтральные и акцентная роли переключаются на тёмный набор значений, а текст на акцентной кнопке — в тёмный `text-on-accent`, без разрыва контраста

#### Scenario: Primary button text is readable in both themes
- **WHEN** пользователь видит кнопку с акцентной заливкой в светлой или тёмной теме
- **THEN** контраст её текста к заливке не ниже 4.5:1

#### Scenario: Headings use the primary text role
- **WHEN** пользователь видит заголовок (название площадки, заголовок формы или экрана) в любой теме
- **THEN** его цвет — `text-primary`, а не вторичный текстовый цвет

### Requirement: Reusable spacing, radius, and motion scale

Система SHALL предоставлять именованную шкалу отступов, шкалу радиусов скругления и набор длительностей переходов с одной стандартной кривой (ease-out), переиспользуемых любым компонентом вместо магических чисел. Анимации SHALL ограничиваться свойствами `transform` и `opacity`; «пружинные» кривые с перелётом SHALL не использоваться.

#### Scenario: Spacing scale covers common increments
- **WHEN** компоненту нужен отступ
- **THEN** доступна именованная шкала отступов, покрывающая типовые интервалы от минимального до крупного

#### Scenario: Motion tokens define named durations and easing
- **WHEN** компоненту нужен переход (появление, наведение, смена состояния)
- **THEN** доступны именованные токены длительности и стандартная кривая без перелёта

### Requirement: Reduced-motion fallback covers all motion tokens

При включённом `prefers-reduced-motion: reduce` все переходы, построенные на моушн-токенах, SHALL быть отключены или сведены к мгновенным, без потери функциональности.

#### Scenario: Reduced motion disables transitions
- **WHEN** у пользователя включена настройка ОС «уменьшить движение»
- **THEN** переходы, использующие моушн-токены, отключаются или становятся мгновенными, а элемент остаётся полностью функциональным

## ADDED Requirements

### Requirement: Opaque elevation levels for all surfaces

Система SHALL определять именованные уровни элевации, все с непрозрачной заливкой:
- канва (карта) без обводки и тени;
- поверхность (строка списка, панель) — `surface` с границей;
- плавающий элемент (контролы карты, поле поиска, шторка карточки) — `surface` с выраженной тенью;
- модальное состояние (лайтбокс фото, полноэкранная форма) со scrim.

Ни один элемент интерфейса SHALL не использовать `backdrop-filter`/полупрозрачную стеклянную заливку.

#### Scenario: Floating element over the map is opaque
- **WHEN** элемент интерфейса лежит поверх карты (контролы, поле поиска, шторка карточки)
- **THEN** он отображается непрозрачной поверхностью с тенью, карта под ним не просвечивает

#### Scenario: No glass anywhere
- **WHEN** проверяются вычисленные стили элементов интерфейса
- **THEN** ни у одного элемента нет `backdrop-filter`, отличного от `none`

### Requirement: Semantic color roles for court facts

Дизайн-токены SHALL задавать цветовые роли для визуальных фактов площадки, отдельно для светлой и тёмной темы:
- `--condition-excellent`, `--condition-good`, `--condition-fair`, `--condition-poor`;
- `--material-asphalt`, `--material-rubber`, `--material-grass`, `--material-sand`, `--material-wood`, `--material-other`;
- `--lighting-on`;
- `--text-input` (16 px) — размер шрифта полей ввода.

Маркеры этих цветов SHALL иметь контраст не меньше 3:1 с фоном чипа (`--surface-2`) в обеих темах. Компоненты SHALL использовать роли, а не литералы цветов.

#### Scenario: Condition colors in both themes
- **WHEN** приложение отображается в светлой или тёмной теме
- **THEN** точки состояния различимы на фоне чипа с контрастом не меньше 3:1

#### Scenario: Components use roles
- **WHEN** разработчик ищет цвета фактов в CSS компонентов
- **THEN** находит только ссылки на роли `--condition-*`, `--material-*`, `--lighting-on`, без литералов цветов

## REMOVED Requirements

### Requirement: Elevation levels including glass-over-map surfaces
**Reason**: Гибрид Material × Liquid Glass отменён. Стекло над картой не даёт гарантированного контраста на тёмных участках, усложняет поддержку и тратит GPU, а в коде фактически не используется.
**Migration**: Использовать непрозрачные уровни из «Opaque elevation levels for all surfaces». Класс `.glass-over-map` и его `prefers-reduced-transparency`-фолбэк удаляются.
