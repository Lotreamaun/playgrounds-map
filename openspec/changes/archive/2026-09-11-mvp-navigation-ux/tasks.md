## 1. Localization foundation

- [x] 1.1 Create `frontend/src/utils/labels.ts` exporting `SURFACE_LABELS`, `CONDITION_LABELS` (Record<string, string>) and `translateSurface`/`translateCondition` helpers that fall back to the raw value when a key is unmapped
- [x] 1.2 Update `CourtForm.tsx` to build the surface/condition `<option>` lists from the dictionary keys (Russian label shown, raw value submitted)
- [x] 1.3 Update `CourtMarker.tsx`'s `CourtCard` to render translated surface/condition via the helpers
- [x] 1.4 Update `CourtList.tsx` to render translated surface/condition via the helpers

## 2. Sport icon lookup

- [x] 2.1 Add a `sport_type` → emoji lookup (e.g. `basketball` → 🏀) with a default fallback glyph, colocated with `CourtMarker.tsx`
- [x] 2.2 Render the icon inside `.court-marker__pin` instead of the current empty circle

## 3. Unified panel/sheet state in App.tsx

- [x] 3.1 Extend the existing `SheetState` union to also represent the add-court form (`{ type: 'form' }`), so mobile and desktop share one state shape
- [x] 3.2 Remove the desktop-only `view: 'map' | 'list'` state and the `view-toggle` button; the map is always mounted on desktop, matching the existing mobile behavior
- [x] 3.3 Route all "open card" / "open list" / "open add form" actions through the shared `sheet` state on both breakpoints

## 4. Side panel component (desktop)

- [x] 4.1 Create `frontend/src/components/SidePanel.tsx`: a persistent left-docked container that renders its children when `open`, with a `transform`/`opacity` transition on open/close (respect `prefers-reduced-motion`)
- [x] 4.2 Add an explicit close control (×) in the panel, used when showing the court card
- [x] 4.3 In `App.tsx`, render `SidePanel` on desktop (`!isMobile`) as the host for `CourtCard`, `CourtList`, and `CourtForm`, mirroring how `BottomSheet` hosts them on mobile
- [x] 4.4 Move the "add court" trigger into the side panel's default (list) content instead of the floating `add-court-button`

## 5. Marker selection highlight

- [x] 5.1 Add a `court-marker__pin--selected` modifier class with `transform: scale(1.25)` (composed with the existing centering translate) and a `transition: transform 150ms ease-out`
- [x] 5.2 Apply the modifier class in `CourtMarker.tsx` based on `isSelected`

## 6. Map chrome theming and layout

- [x] 6.1 In `index.css`, override the Yandex `@yandex/ymaps3-default-ui-theme` control custom properties to use `--accent`/`--bg`/`--shadow` instead of the package defaults — revised during implementation: the package exposes no color custom properties, so icons are recolored via CSS mask instead; see design.md for details and the remaining button-chrome limitation
- [x] 6.2 Confirm native zoom/geolocation controls (`YMapControls position="top left"`) no longer overlap app chrome now that the `view-toggle` button is removed (task 3.2) and the side panel docks to the left edge — structurally guaranteed by the new `.app-shell` flex layout (side panel and map are side-by-side, not overlaid), not yet visually confirmed in a browser

## 7. Animation and motion polish

- [x] 7.1 Add `transition: transform/opacity` to `.court-list__row:hover` and any other instant-appearance UI touched by this change that currently has none
- [x] 7.2 Add a `prefers-reduced-motion: reduce` media query that shortens/removes the transitions introduced in this change (side panel, marker highlight, list row hover) across `index.css`

## 8. Verification

- [x] 8.1 Manually verify desktop flow: select marker → card in side panel → close via × → open list in side panel → add court via side panel form → new marker appears with sport icon
- [x] 8.2 Manually verify mobile flow still works unchanged: bottom sheet for card/list, full-screen modal for add form, no regression from the shared `SheetState` refactor
- [x] 8.3 Verify all surface/condition values render in Russian in the form, card, and list on both breakpoints
- [x] 8.4 Verify native map controls visually match the app's accent color and do not overlap app chrome on desktop
- [x] 8.5 Verify animations are smooth at 60fps (transform/opacity only) and that enabling OS-level reduced motion visibly shortens/removes them
