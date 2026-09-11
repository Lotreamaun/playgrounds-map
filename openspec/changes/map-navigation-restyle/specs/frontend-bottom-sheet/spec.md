## MODIFIED Requirements

### Requirement: Floating mobile controls use a translucent glass surface

Плавающие элементы управления, размещённые поверх карты на мобильном (кнопка добавления FAB, поиск-pill), SHALL отображаться с полупрозрачной поверхностью с блюром, а не сплошной непрозрачной заливкой — чтобы читаться как парящие над картой, а не как отдельная непрозрачная панель. Верхнего бара больше нет (см. `frontend-mapping`); стекло не распространяется на zoom/геолокацию — они непрозрачные (см. `frontend-mapping`).

#### Scenario: FAB floats with a glass surface
- **WHEN** пользователь видит кнопку добавления (FAB) на мобильном
- **THEN** она отображается полупрозрачной с блюром, карта частично просматривается сквозь неё

#### Scenario: Top bar floats with a glass surface
- **WHEN** пользователь смотрит на экран карты на мобильном
- **THEN** отдельного верхнего бара с этой стеклянной кнопкой больше нет — точка входа в список и стеклянное оформление перенесены на поиск-pill (см. требование «Search-pill is the entry point for opening the court list on mobile» ниже)

#### Scenario: Search-pill floats with a glass surface
- **WHEN** пользователь видит поиск-pill на мобильном
- **THEN** он отображается полупрозрачным с блюром, карта частично просматривается сквозь него

## ADDED Requirements

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
