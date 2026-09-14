## MODIFIED Requirements

### Requirement: Zoom and geolocation icons match the app's icon system

Иконки zoom и геолокации SHALL использовать форму из набора Phosphor Icons, того же семейства, что и остальная иконография приложения (см. `frontend-court-ui`/маркеры на карте), а не дефолтную форму иконок из пакета темы карты — даже перекрашенную в акцентный цвет. Для zoom SHALL использоваться `Plus`/`Minus`; для геолокации — `NavigationArrow`; вес `Regular`.

#### Scenario: Zoom icons use Phosphor Plus/Minus
- **WHEN** пользователь видит кнопки увеличения/уменьшения масштаба на карте (desktop)
- **THEN** их иконки — Phosphor `Plus` и `Minus`, а не иконки из дефолтной темы Yandex Maps

#### Scenario: Geolocation icon uses Phosphor NavigationArrow
- **WHEN** пользователь видит кнопку геолокации на карте
- **THEN** её иконка — Phosphor `NavigationArrow`, а не иконки из дефолтной темы Yandex Maps

### Requirement: Map controls do not overlap app chrome

Встроенные элементы управления картой SHALL оставаться в предсказуемом положении, не перекрываясь визуально с элементами управления самого приложения (боковая панель, кнопки, поиск-pill, FAB). На desktop положение — верхний левый угол, zoom и геолокация вместе (без изменений). На мобильном положение — правый нижний угол; поскольку zoom-контрол на мобильном не отображается (см. «Zoom control is desktop-only»), там показывается только кнопка геолокации, выше ряда поиск-pill/FAB (см. `frontend-bottom-sheet`), а не верхний левый угол.

#### Scenario: No overlap on desktop
- **WHEN** пользователь просматривает карту на desktop
- **THEN** элементы управления zoom и геолокацией остаются в верхнем левом углу и не накладываются на боковую панель или другие элементы управления приложения

#### Scenario: No overlap on mobile
- **WHEN** пользователь просматривает карту на мобильном
- **THEN** кнопка геолокации расположена в правом нижнем углу, выше ряда поиск-pill и FAB, и не перекрывается с ними

## ADDED Requirements

### Requirement: Zoom control is desktop-only

Кнопки zoom (`Plus`/`Minus`) SHALL отображаться только на desktop. На мобильном отдельный zoom-контрол SHALL не отображаться — пользователь использует нативный pinch-to-zoom жест карты вместо кнопок. Кнопка геолокации SHALL оставаться видимой на обеих платформах независимо от этого изменения.

#### Scenario: Zoom buttons hidden on mobile
- **WHEN** пользователь просматривает карту на мобильном
- **THEN** кнопки увеличения/уменьшения масштаба не отображаются; карта поддерживает масштабирование жестом pinch-to-zoom

#### Scenario: Zoom buttons visible on desktop
- **WHEN** пользователь просматривает карту на desktop
- **THEN** кнопки увеличения/уменьшения масштаба отображаются рядом с кнопкой геолокации, как раньше
