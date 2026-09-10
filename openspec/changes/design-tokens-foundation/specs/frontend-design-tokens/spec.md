## Purpose

Provides the frontend's central design-token system — typography, color roles, spacing/radius/motion scales, and elevation levels — so every other frontend capability styles itself from one shared, themeable source instead of ad hoc values.

## ADDED Requirements

### Requirement: Single typography family across the UI

Интерфейс SHALL использовать единственное семейство шрифтов (Commissioner) для всего текста, с системным fallback-стеком на случай недоступности веб-шрифта. Прежний дефолтный стек `system-ui` SHALL быть заменён.

#### Scenario: Primary font applied
- **WHEN** страница интерфейса загружена и веб-шрифт доступен
- **THEN** вычисленный `font-family` текстовых элементов интерфейса — Commissioner

#### Scenario: Font fallback when web font unavailable
- **WHEN** веб-шрифт Commissioner не загрузился (например, нет сети)
- **THEN** текст остаётся читаемым за счёт системного fallback-стека, без невидимого текста

### Requirement: Neutral and interactive-accent color roles for light and dark themes

Система SHALL предоставлять нейтральные цветовые роли (`bg`, `surface`, `border`, `text-primary`, `text-secondary`) и единственную интерактивную акцентную роль (`accent`, `accent-hover`, `accent-focus`), каждая с определением для светлой и тёмной темы (`prefers-color-scheme: dark`). Акцентная роль SHALL использоваться только для интерактивных элементов (кнопки, ссылки, фокус-кольцо, выбранный пункт) и SHALL не быть тем же значением, что и предыдущий дефолтный фиолетовый акцент.

#### Scenario: Accent role resolves in light theme
- **WHEN** интерфейс отображается в светлой теме
- **THEN** акцентная роль разрешается в графитовый цвет, а не в прежний фиолетовый дефолт

#### Scenario: Accent role resolves in dark theme
- **WHEN** пользовательская ОС сообщает `prefers-color-scheme: dark`
- **THEN** нейтральные и акцентная роли переключаются на тёмный набор значений без разрыва контраста текста

### Requirement: Category color role distinct from interactive accent

Система SHALL предоставлять отдельный набор категориальных цветовых токенов для видов спорта (минимум: баскетбол, футбол, хоккей, теннис), не пересекающийся по значению с интерактивной акцентной ролью и не используемый для кнопок или фона UI-элементов.

#### Scenario: Category tokens available per sport
- **WHEN** компоненту нужен цвет, соответствующий виду спорта площадки
- **THEN** для каждого из поддерживаемых видов спорта существует именованный категориальный токен

#### Scenario: Category color never equals the interactive accent
- **WHEN** сравниваются значения категориальных токенов и `accent`
- **THEN** ни один категориальный токен не совпадает по значению с `accent`

### Requirement: Form feedback color role distinct from category and accent roles

Система SHALL предоставлять цветовые токены для обратной связи форм (ошибка и её фон), отдельные от категориальной палитры и не переопределяющие интерактивный акцент. Успешное состояние формы SHALL переиспользовать `accent`, без отдельного токена успеха.

#### Scenario: Error feedback token available
- **WHEN** форме нужно показать состояние ошибки
- **THEN** доступен токен цвета ошибки и токен его фона, отличные от `accent` и категориальных токенов

#### Scenario: Success feedback reuses the accent role
- **WHEN** форме нужно показать успешное состояние
- **THEN** используется значение `accent`, а не отдельный токен успеха

### Requirement: Reusable spacing, radius, and motion scale

Система SHALL предоставлять именованную шкалу отступов, шкалу радиусов скругления и набор длительностей/кривых переходов (моушн-токенов), переиспользуемых любым компонентом вместо магических чисел.

#### Scenario: Spacing scale covers common increments
- **WHEN** компоненту нужен отступ
- **THEN** доступна именованная шкала отступов, покрывающая типовые интервалы от минимального до крупного

#### Scenario: Motion tokens define named durations and easing
- **WHEN** компоненту нужен переход (появление, наведение, смена состояния)
- **THEN** доступны именованные токены длительности и как минимум один именованный easing для «пружинного» перехода

### Requirement: Elevation levels including glass-over-map surfaces

Система SHALL определять именованные уровни элевации (как минимум: канва без обводки/тени, обычная поверхность с границей и тенью, плавающий элемент с более выраженной тенью, модальное состояние со scrim) и отдельный стиль для элементов, физически парящих над картой (полупрозрачный блюр), с фолбэком на сплошную заливку при включённом `prefers-reduced-transparency`.

#### Scenario: Surface elevation has border and shadow
- **WHEN** компонент использует уровень элевации «поверхность»
- **THEN** он получает границу и тень согласно этому уровню, отличимые от уровня «канва»

#### Scenario: Floating-over-map surface uses blur by default
- **WHEN** элемент помечен как парящий над картой и `prefers-reduced-transparency` не включён
- **THEN** элемент отображается с полупрозрачным блюром вместо сплошной заливки

#### Scenario: Reduced transparency fallback
- **WHEN** у пользователя включена настройка уменьшения прозрачности (`prefers-reduced-transparency` либо аналог, доступный в проекте)
- **THEN** элементы, парящие над картой, отображаются со сплошной заливкой той же элевации вместо блюра

### Requirement: Reduced-motion fallback covers all motion tokens

При включённом `prefers-reduced-motion: reduce` все переходы, построенные на моушн-токенах (включая «пружинный» easing), SHALL быть отключены или сведены к мгновенным, без потери функциональности.

#### Scenario: Reduced motion disables transitions
- **WHEN** у пользователя включена настройка ОС "уменьшить движение"
- **THEN** переходы, использующие моушн-токены, отключаются или становятся мгновенными, а элемент остаётся полностью функциональным
