## Purpose

Lets the desktop frontend reuse a single persistent container for secondary UI: a left-side panel that hosts the court card, the court list, and the add-court form while the map stays visible and interactive on the right, mirroring the role the bottom sheet plays on mobile.

## Requirements

### Requirement: Side panel opens over a persistent map

On desktop the court card, the court list, and the add-court form SHALL be displayed in a side panel docked to the left edge of the screen, while the map remains visible and interactive to the right of the panel. Activating the side panel SHALL NOT replace the map with a separate full-screen view.

#### Scenario: Card opens in the side panel

- **WHEN** the user selects a court marker on desktop
- **THEN** the side panel shows the court card, and the map remains visible and interactive to the right

#### Scenario: List opens in the side panel

- **WHEN** the user opens the list on desktop
- **THEN** the side panel shows the court list, and the map remains visible and interactive to the right, without a full-screen page swap

#### Scenario: Add-court form opens in the side panel

- **WHEN** the user activates add mode on desktop
- **THEN** the side panel shows the add-court form instead of a floating panel positioned over the map

### Requirement: Side panel content is explicitly closable

The side panel SHALL provide an explicit close control for the court card. Activating it SHALL close the panel and return focus to the map without navigating away from the current view.

#### Scenario: Closing the court card

- **WHEN** the user activates the close control while the side panel shows a court card
- **THEN** the side panel closes and the map remains fully interactive

### Requirement: Side panel state transitions are animated

Opening, closing, and switching the side panel's content SHALL use a smooth transition (transform/opacity) rather than an instant appearance or disappearance, and SHALL respect the user's reduced-motion preference.

#### Scenario: Panel opens smoothly

- **WHEN** the side panel transitions from closed to open
- **THEN** the transition animates using transform/opacity rather than appearing instantly

#### Scenario: Reduced motion respected

- **WHEN** the user has requested reduced motion at the operating-system level
- **THEN** the side panel's open/close transition is instant or minimal instead of the full animation
