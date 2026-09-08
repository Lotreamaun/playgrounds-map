## Purpose

Provides a list-mode view of courts and the ability to sort them by distance from the user's geolocation, complementing the map view.

## ADDED Requirements

### Requirement: View can switch between map and list
Пользователь SHALL иметь возможность переключаться между режимами отображения площадок: картой и списком.

#### Scenario: Switch to list view
- **WHEN** пользователь активирует режим «список»
- **THEN** вместо карты отображается список площадок

#### Scenario: Switch back to map view
- **WHEN** пользователь активирует режим «карта»
- **THEN** вместо списка отображается карта

### Requirement: List shows court details
Список SHALL отображать площадки в виде строк-карточек, показывающих адрес площадки (поле `address`), покрытие и состояние. Каждая строка SHALL соответствовать одной площадке.

#### Scenario: List row shows a court's address, surface, condition
- **WHEN** пользователь просматривает список площадок
- **THEN** каждая строка показывает адрес, покрытие и состояние соответствующей площадки

#### Scenario: Court without an address in the list
- **WHEN** в списке находится площадка, у которой `address` не задан
- **THEN** строка отображает заглушку вместо адреса без прекращения работы остальных строк

### Requirement: Courts sorted by distance from user's geolocation
Список SHALL поддерживать сортировку площадок по расстоянию от текущей геолокации пользователя, начиная с ближайшей (расстояние по формуле Haversine).

#### Scenario: Nearest courts appear first
- **WHEN** пользователь активирует сортировку «по близости» и геолокация разрешена
- **THEN** площадки отображаются в порядке возрастания расстояния от текущего местоположения пользователя

#### Scenario: Nearest sort without geolocation
- **WHEN** пользователь активирует сортировку «по близости», но геолокация недоступна или отклонена
- **THEN** список отображается в другом осмысленном порядке (например, по умолчанию) с понятным для пользователя поведением, без ошибки

### Requirement: Clicking a list row focuses the court on the map
При переходе из списка в режим карты выбранная площадка SHALL быть выделена/центрирована на карте.

#### Scenario: Row click centers the court on the map
- **WHEN** пользователь кликает по строке площадки в списке и переходит в режим карты
- **THEN** карта центрируется на координатах выбранной площадки и показывает её карточку
