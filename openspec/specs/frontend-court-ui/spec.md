## Purpose

Completes the MVP frontend with the interactive court UI: clicking a court marker shows its detail card, and a form lets users add new courts by picking coordinates on the map.

## Requirements

### Requirement: Court details shown on marker click
The frontend SHALL display a popup with a court's detail card when its marker is clicked. The card SHALL show the court's address, surface, condition, and photo if present.

#### Scenario: Viewing a court with a photo
- **WHEN** the user clicks a marker for a court that has a photo
- **THEN** a popup opens showing the court's address, surface, condition, and photo

#### Scenario: Viewing a court without a photo
- **WHEN** the user clicks a marker for a court that has no photo
- **THEN** the popup shows the address, surface, and condition, and omits the photo gracefully

### Requirement: Add-court form with map-click coordinates
The frontend SHALL provide a form for adding a court. Clicking the map while in add mode SHALL set the court's latitude and longitude in the form.

#### Scenario: Coordinates chosen by map click
- **WHEN** the user is in add mode and clicks a point on the map
- **THEN** the form's latitude and longitude fields are filled with the clicked coordinates

### Requirement: Court submission via the API
The form SHALL submit a new court using the existing `POST /courts` API, including surface, condition, and an optional photo.

#### Scenario: Successful submission
- **WHEN** the user fills the required fields and submits
- **THEN** the court is created via the API and becomes visible on the map without a page reload

#### Scenario: Duplicate court rejected
- **WHEN** the submitted court matches an existing court of the same sport within ~30 m (API returns 409)
- **THEN** the user sees a clear duplicate message and no duplicate marker is added
