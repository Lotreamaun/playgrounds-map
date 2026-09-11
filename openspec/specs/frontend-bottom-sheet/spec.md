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

### Requirement: Floating mobile controls use a translucent glass surface

Плавающие элементы управления, размещённые поверх карты на мобильном (кнопка добавления FAB, компактный верхний бар), SHALL отображаться с полупрозрачной поверхностью с блюром, а не сплошной непрозрачной заливкой, — чтобы читаться как парящие над картой, а не как отдельная непрозрачная панель.

#### Scenario: FAB floats with a glass surface
- **WHEN** пользователь видит кнопку добавления (FAB) на мобильном
- **THEN** она отображается полупрозрачной с блюром, карта частично просматривается сквозь неё

#### Scenario: Top bar floats with a glass surface
- **WHEN** пользователь видит компактный верхний бар на мобильном
- **THEN** он отображается полупрозрачным с блюром, а не сплошной непрозрачной заливкой