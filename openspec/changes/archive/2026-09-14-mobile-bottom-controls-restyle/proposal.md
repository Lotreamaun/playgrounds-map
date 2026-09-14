## Why

The mobile bottom UI (search-pill, add-court FAB, geolocation control) still carries the "Liquid Glass" translucent styling from an earlier design pass. The app owner is planning a separate, dedicated redesign of this area later and wants the glass/blur removed now, along with three layout problems that predate glass: the search-pill isn't centered (it stretches from a fixed left edge to leave room for the FAB on its right), the FAB sits beside the search-pill instead of above it, and the geolocation control (already opaque per a prior change) sits in the bottom-right corner rather than continuing that same vertical stack.

## What Changes

- Search-pill (`.search-pill`) becomes horizontally centered with equal left, right, and bottom margins (`var(--space-4)`/16px, bottom offset additionally clearing `env(safe-area-inset-bottom)`), instead of spanning from a fixed left edge to a right edge carved out for the FAB.
- Search-pill drops its translucent glass surface (`rgba(42, 45, 52, 0.28)` + `backdrop-filter: blur(14px)`) for the same opaque tokens as `.court-list__row`: `var(--surface)` background, 1px `var(--border)` border, `var(--shadow-1)` shadow, `var(--text-h)` text — keeping its pill/capsule shape (`border-radius: var(--radius-pill)`), only the surface treatment changes, not the shape.
- Add-court FAB (`.fab`) moves from beside the search-pill to directly above it, centered on the same horizontal axis, instead of sitting to its right in the same row.
- FAB drops its translucent glass surface for an opaque surface matching the app's existing map-control treatment (`var(--surface)` + `var(--shadow-2)`, the same elevation language as `.map-control-btn`/`.map-geolocation-btn`) — no blur, no translucent border.
- The mobile geolocation map control moves from the bottom-right corner to directly above the search-pill on the right side, sharing the same tier as the centered FAB (not stacked above the FAB) — its right margin matches the search-pill's own 16px right edge — replacing the previous "controls stacked bottom-right, beside a separate search-pill/FAB row."
- **BREAKING (spec-level)**: supersedes `frontend-bottom-sheet`'s "Floating mobile controls use a translucent glass surface" requirement — FAB and search-pill are no longer glass. This reverses a previously shipped, deliberate design decision; it is not an oversight, and it is explicitly interim (see Non-Goals).

**Non-Goals**: no change to `.court-list__row` itself (it's the style source, not a target); no change to which controls exist, their icons, tap targets, or click behavior — only glass removal and repositioning of FAB/search-pill/geolocation on mobile; no change to desktop layout (the side panel is unaffected, this is mobile-only); no new visual redesign of these controls beyond removing glass and fixing the stack order — a further redesign is planned separately later and is explicitly out of scope here.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `frontend-bottom-sheet`:
  - "Floating mobile controls use a translucent glass surface" is replaced: FAB and search-pill become opaque (search-pill matches `.court-list__row`'s tokens; FAB matches the map controls' `--surface`/`--shadow-2` treatment) instead of translucent/blurred.
  - New requirement: search-pill is horizontally centered with equal left/right/bottom margins, and the FAB is stacked directly above it (centered on the same axis) instead of beside it.
- `frontend-mapping`:
  - "Map controls do not overlap app chrome" is revised: on mobile, the geolocation control now sits directly above the search-pill on the right side, sharing the FAB's tier (not stacked above the FAB), instead of the bottom-right corner beside a search-pill/FAB row.

## Impact

- **Code**: `frontend/src/index.css` (`.search-pill`, `.fab` rules in the `@media (max-width: 767px)` block; the `.ymaps3--controls_vertical` mobile positioning rule, whose `margin-bottom` now clears only the search-pill; the `@media (prefers-reduced-transparency: reduce)` override block, where `.fab`/`.search-pill` become redundant since they're opaque by default and can be dropped from it), `frontend/src/App.tsx` (search-pill/FAB markup likely needs a shared positioning wrapper to switch from a side-by-side row to a centered column), `frontend/src/components/MapView.tsx` (the mobile `YMapControls` stays `position="bottom right"` so the geolocation control lands above the search-pill on the right, level with the FAB).
- **Dependencies**: none.
- **Spec**: `frontend-bottom-sheet` loses its glass requirement for FAB/search-pill and gains a centered-pill/centered-FAB layout requirement; `frontend-mapping`'s mobile control-position scenario is rewritten so geolocation sits above the pill on the right, level with the FAB. No backend or API impact.
