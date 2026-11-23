## MODIFIED Requirements

### Requirement: Bottom sheet opens over the map
На мобильном карточка площадки SHALL отображаться в немодальной нижней шторке:
- шторка выезжает снизу без затемняющего scrim;
- высота шторки определяется содержимым, но не больше 85% высоты экрана, с прокруткой внутри;
- карта над шторкой остаётся видимой и принимает жесты (сдвиг, зум, тап по другому маркеру);
- тап по другому маркеру при открытой шторке SHALL заменять содержимое шторки карточкой новой площадки без закрытия и повторного открытия.

#### Scenario: Card opens as a sheet over the map
- **WHEN** пользователь касается маркера площадки на мобильном
- **THEN** снизу выезжает шторка с карточкой, карта над ней не затемнена и видна с выделенным маркером

#### Scenario: List opens as a sheet over the map
- **WHEN** пользователь на мобильном открывает список площадок
- **THEN** список открывается на полноэкранном экране поиска (см. `frontend-court-list`), а не в шторке; шторка используется только для карточки

#### Scenario: Map remains interactive while the card is open
- **WHEN** карточка открыта в шторке, и пользователь двигает или масштабирует карту над шторкой
- **THEN** карта реагирует на жест, шторка остаётся открытой

#### Scenario: Tapping another marker swaps the card
- **WHEN** карточка открыта, и пользователь касается маркера другой площадки
- **THEN** шторка показывает карточку новой площадки, а выделение маркера переходит на неё

#### Scenario: Sheet respects safe area
- **WHEN** шторка открыта на устройстве с home indicator
- **THEN** содержимое шторки не заходит под safe-area-inset снизу

### Requirement: Floating bottom controls include a buffer beyond the safe-area inset

Плавающие элементы у нижнего края экрана на мобильном — стек контролов карты («+», «Где я») и подсказка режима выбора точки с кнопкой «Отмена» — SHALL отступать от нижнего края на `env(safe-area-inset-bottom)` плюс дополнительный буфер, а не только на сам `env()`-отступ. Сам `env()` не учитывает раскрытое состояние нижней панели браузера. Буфер SHALL также оставлять видимой строку атрибуции Яндекса.

#### Scenario: FAB clears the browser's own bottom chrome
- **WHEN** пользователь видит стек контролов карты или подсказку выбора точки на мобильном при развёрнутой панели браузера
- **THEN** кнопки не перекрываются панелью браузера и не упираются в неё, оставаясь полностью нажимаемыми

## ADDED Requirements

### Requirement: Card sheet can be dismissed in several ways

Шторку карточки SHALL можно закрыть:
- свайпом вниз за ручку или верхнюю часть шторки дальше порога;
- явной кнопкой закрытия «×» с `aria-label`;
- клавишей Escape;
- тапом по пустому месту карты (не по маркеру).

После закрытия выделение маркера SHALL сниматься.

#### Scenario: Swipe down to dismiss
- **WHEN** пользователь тянет шторку вниз дальше порога
- **THEN** шторка закрывается, выделение маркера снимается

#### Scenario: Short drag snaps back
- **WHEN** пользователь тянет шторку вниз меньше порога и отпускает
- **THEN** шторка возвращается в открытое положение

#### Scenario: Close button and Escape
- **WHEN** пользователь нажимает «×» или клавишу Escape при открытой шторке
- **THEN** шторка закрывается

#### Scenario: Tap on empty map closes the card
- **WHEN** пользователь касается пустого места карты при открытой шторке (не в режиме добавления)
- **THEN** шторка закрывается

### Requirement: Floating map chrome is hidden while the card sheet is open

Пока открыта шторка карточки, плавающие элементы у нижнего края экрана (кнопки геолокации и добавления) SHALL скрываться, чтобы не перекрывать шторку. Поле поиска вверху экрана SHALL оставаться видимым.

#### Scenario: Controls hidden behind an open card
- **WHEN** на мобильном открыта шторка карточки
- **THEN** кнопки геолокации и добавления не отображаются, поле поиска вверху видно

#### Scenario: Controls return after closing
- **WHEN** шторка карточки закрыта
- **THEN** кнопки геолокации и добавления снова отображаются на прежних местах

## REMOVED Requirements

### Requirement: Sheet is draggable with peek and expanded states
**Reason**: Peek-состояние для карточки — лишний шаг: карточка и так компактна, а список переехал на экран поиска. Две точки привязки усложняли жесты и код без пользы для главного сценария.
**Migration**: Шторка карточки имеет одно открытое состояние и закрывается жестом, кнопкой, Escape или тапом по карте (см. «Card sheet can be dismissed in several ways»).

### Requirement: Floating mobile controls use opaque surfaces matching existing app card styles
**Reason**: Поиск-pill и FAB внизу экрана удаляются, непрозрачность всех поверхностей теперь задаётся токенами элевации.
**Migration**: См. `frontend-design-tokens` — «Opaque elevation levels for all surfaces» и `frontend-mapping` — «Map controls do not overlap app chrome».

### Requirement: Search-pill is centered with equal margins, and the FAB stacks above it
**Reason**: Поиск-pill внизу перекрывал атрибуцию Яндекса и конкурировал с браузерным UI; центральный FAB отдавал главное место вторичному действию (добавлению).
**Migration**: Поле поиска — вверху экрана (`frontend-court-list`), кнопка добавления — в стеке контролов карты у правого края (`frontend-mapping`).

### Requirement: Search-pill is the entry point for opening the court list on mobile
**Reason**: Pill только открывал список, не позволяя искать, что вводило в заблуждение.
**Migration**: Точка входа — настоящее поле поиска вверху экрана карты, открывающее экран поиска (`frontend-court-list` — «View can switch between map and list»).

### Requirement: Add-court FAB is icon-only
**Reason**: Отдельного FAB больше нет.
**Migration**: Кнопка добавления — иконка «+» с `aria-label` в стеке контролов карты (`frontend-mapping` — «Add-court control is a secondary map control»).
