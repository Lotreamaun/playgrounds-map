## Purpose

Lets the mobile frontend reuse a single container for secondary UI: a bottom sheet that slides up over the map for the court card and the list, plus a full-screen modal for the add-court form.

## Requirements

### Requirement: Bottom sheet opens over the map
On mobile the court card and the court list SHALL be displayed in a bottom sheet that slides up over the map canvas, keeping the map visible and alive behind it.

#### Scenario: Card opens as a sheet over the map
- **WHEN** the user taps a court marker on mobile
- **THEN** a bottom sheet slides up showing the court card, while the map remains visible behind it

#### Scenario: List opens as a sheet over the map
- **WHEN** the user opens the list on mobile
- **THEN** a bottom sheet with the court list slides up over the map, replacing no separate page

### Requirement: Sheet is draggable with peek and expanded states
The bottom sheet SHALL have a drag handle and support at least two states: a collapsed "peek" state showing a preview and an expanded state showing the full content. The user SHALL be able to drag the sheet between these states and dismiss it.

#### Scenario: Drag to expand
- **WHEN** the user drags the sheet upward past a threshold
- **THEN** the sheet animates to the expanded state showing the full content

#### Scenario: Drag to dismiss
- **WHEN** the user drags the sheet downward past a threshold (or taps outside)
- **THEN** the sheet closes and the map becomes fully interactive again

#### Scenario: Sheet respects safe area
- **WHEN** the sheet is at its lowest position on a device with a home indicator or notch
- **THEN** sheet content stays clear of the device's safe-area insets

### Requirement: Add-court form opens as full-screen modal on mobile
The add-court form SHALL open as a full-screen modal that slides up from the bottom, instead of a floating panel. It SHALL take the full available viewport height and be dismissible.

#### Scenario: Form opens full-screen
- **WHEN** the user activates add mode on mobile
- **THEN** a full-screen modal with the add-court form slides up from the bottom

#### Scenario: Form is dismissible
- **WHEN** the user cancels or submits the form
- **THEN** the modal closes and the map is shown again

### Requirement: Floating mobile controls use opaque surfaces matching existing app card styles

Плавающие элементы управления, размещённые поверх карты на мобильном (кнопка добавления FAB, поиск-pill), SHALL отображаться непрозрачной поверхностью без блюра и прозрачности, переиспользуя уже существующие в приложении токены стиля, а не собственную стеклянную заливку. Поиск-pill SHALL использовать те же токены, что и карточка площадки в списке (`.court-list__row`): фон `var(--surface)`, граница 1px `var(--border)`, тень `var(--shadow-1)`, цвет текста `var(--text-h)` — сохраняя при этом форму капсулы (`border-radius: var(--radius-pill)`); меняется только поверхность, не форма. Кнопка добавления (FAB) SHALL использовать то же непрозрачное оформление уровня элевации 2, что и элементы управления картой: `var(--surface)` + `var(--shadow-2)`, без блюра и полупрозрачной границы.

#### Scenario: FAB is opaque, matching the map controls' elevation
- **WHEN** пользователь видит кнопку добавления (FAB) на мобильном
- **THEN** она отображается непрозрачной поверхностью (`var(--surface)` + `var(--shadow-2)`), без блюра и прозрачности, карта под ней не просматривается

#### Scenario: Search-pill is opaque, matching the court-list card style
- **WHEN** пользователь видит поиск-pill на мобильном
- **THEN** он отображается непрозрачной поверхностью с теми же токенами, что и карточка площадки в списке (`var(--surface)`, граница `var(--border)`, тень `var(--shadow-1)`), сохраняя форму капсулы, без блюра и прозрачности

### Requirement: Search-pill is centered with equal margins, and the FAB stacks above it

Поиск-pill на мобильном SHALL располагаться по горизонтальному центру экрана с одинаковыми отступами слева, справа и снизу (`var(--space-4)`/16px от границ безопасной области, включая `env(safe-area-inset-bottom)` снизу), вместо растягивания от фиксированного левого края с местом под FAB справа. Кнопка добавления (FAB) SHALL располагаться непосредственно над поиск-pill, по той же горизонтальной оси центрирования, а не сбоку от него в одном ряду.

#### Scenario: Search-pill has equal left, right, and bottom margins
- **WHEN** пользователь видит поиск-pill на мобильном
- **THEN** он центрирован по горизонтали, а отступы слева, справа и снизу от него равны

#### Scenario: FAB sits directly above the centered search-pill
- **WHEN** пользователь видит кнопку добавления (FAB) на мобильном
- **THEN** она расположена по центру непосредственно над поиск-pill, а не рядом с ним

### Requirement: Search-pill is the entry point for opening the court list on mobile

Поиск-pill SHALL быть единственной постоянно видимой точкой входа для открытия списка площадок на мобильном, заменяя прежнюю выделенную кнопку «Список» в верхнем баре. Тап по поиск-pill SHALL открывать тот же bottom sheet со списком, что раньше открывался кнопкой в баре.

#### Scenario: Tapping the search-pill opens the list sheet
- **WHEN** пользователь тапает по поиск-pill на мобильном
- **THEN** открывается bottom sheet со списком площадок, как раньше открывался кнопкой «Список»

#### Scenario: No separate list button remains
- **WHEN** пользователь просматривает экран карты на мобильном
- **THEN** отдельной кнопки «Список» в верхнем баре нет — вся функция открытия списка выполняется через поиск-pill

### Requirement: Add-court FAB is icon-only

Кнопка добавления площадки (FAB) на мобильном SHALL отображать только иконку (без видимого текстового лейбла «Добавить»), с доступным именем через `aria-label`, вместо прежней кнопки-pill с текстом.

#### Scenario: FAB shows only an icon
- **WHEN** пользователь видит кнопку добавления на мобильном
- **THEN** она отображает только иконку плюса, без видимого текста

#### Scenario: FAB remains accessible without visible text
- **WHEN** пользователь полагается на screen reader
- **THEN** кнопка добавления объявляется по своему `aria-label`, несмотря на отсутствие видимого текста