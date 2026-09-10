## Context

`App.tsx` currently has two disconnected UI models: a mobile `SheetState` (`none | card | list`) that a `BottomSheet` renders, and a desktop model where `view` (`map | list`) does a full-screen swap and the court card renders as a small popup positioned next to the marker inside `CourtMarker.tsx`. The add-court form follows a third pattern (`CourtForm.tsx`) — a full-screen modal on mobile, a floating absolutely-positioned box on desktop. Enum values (`surface`, `condition`) come straight from the API and are rendered verbatim in three places: `CourtForm.tsx` (`<option>` labels), `CourtMarker.tsx`'s `CourtCard`, and `CourtList.tsx`. Map chrome (Yandex zoom/geolocation controls) is themed by an imported stylesheet (`@yandex/ymaps3-default-ui-theme`) that ships its own colors, independent of the app's `--accent` custom property.

See proposal.md - Why, for the motivation.

## Goals / Non-Goals

**Goals:**
- One interaction model for secondary UI (court card, list, add-form) that mobile renders as a bottom sheet and desktop renders as a persistent left side panel, sharing the same state shape and content components.
- One source of truth for translating `surface`/`condition` enum values to Russian labels, used by every place that displays or lets the user pick them.
- Map chrome (native controls) and app chrome (buttons, panel, markers) draw from the same color token (`--accent`).
- Animations use only `transform`/`opacity` transitions (already the pattern in `BottomSheet.tsx`) and respect `prefers-reduced-motion`.

**Non-Goals:**
- No new sport types, filter UI, or search bar — out of scope per proposal.md.
- No backend/API changes — `sport_type`/`surface`/`condition` values and the API contract are untouched; only their frontend presentation changes.
- No visual redesign of the add-court form's field set — only its container/positioning and enum option labels change.

## Decisions

### Unified panel/sheet state, rendered differently per breakpoint

Keep a single state shape — the existing mobile `SheetState` (`{ type: 'none' } | { type: 'card'; court } | { type: 'list' } | { type: 'form' }`, extended to cover the add-form) — lifted as the one source of truth in `App.tsx` regardless of breakpoint. `isMobile` selects only the *rendering shell*: `BottomSheet` on mobile, a new `SidePanel` component on desktop. Both shells receive the same children (`CourtCard`, `CourtList`, `CourtForm`) and the same close handler.

Alternative considered: keep two separate state trees (mobile sheet state, desktop panel state) and just restyle the desktop popup into a panel. Rejected — this is how the current mobile/desktop divergence happened in the first place; a shared state shape is what actually forces the two breakpoints to stay behaviorally consistent as the app grows.

This also removes the desktop-only `view: 'map' | 'list'` full-screen swap and the `view-toggle` button: on desktop the map is always mounted (mirroring the mobile "map is a persistent canvas" requirement in `frontend-mapping`), and the list becomes one more thing the side panel can show.

### Side panel as a new capability, not folded into court-ui

`frontend-side-panel` is modeled as its own capability, parallel to the existing `frontend-bottom-sheet` (mobile). Both are "container" capabilities whose requirements are about open/close/host behavior, not about what a court *is*. `frontend-court-ui` keeps owning what the card/form contain; it references the panel/sheet only for *where* the card renders.

### Enum-to-label translation: one static dictionary module

A single module (e.g. `frontend/src/utils/labels.ts`) exports `SURFACE_LABELS` and `CONDITION_LABELS` (`Record<string, string>`) plus a `translateSurface`/`translateCondition` helper that falls back to the raw value if a key is unmapped (so an unexpected/future backend value degrades to showing itself rather than crashing or showing blank). `CourtForm` builds its `<option>` list from the dictionary keys (so labels and values stay in sync by construction), `CourtCard` and `CourtList` call the helpers instead of rendering `court.surface`/`court.condition` directly.

Alternative considered: a full i18n library (react-i18next). Rejected as disproportionate — the app has one locale (Russian) and no plans for others; a plain dictionary is simpler and has zero runtime cost.

### Sport icon on the marker: static lookup, not derived from data

Since only `basketball` exists today, the marker icon is a small `Record<string, string>` (sport_type → emoji) with a default fallback glyph, colocated with the marker component. Adding a sport later is a one-line addition to that map — no component changes required. The marker pin shape itself (circle, `--accent` background) is unchanged; only its empty interior gets the emoji.

### Selected-marker highlight via CSS class + transform scale

`CourtMarker` already receives `isSelected`; add a modifier class that scales the pin (`transform: scale(1.25)` composed with the existing centering `translate`) with a `transition: transform 150ms ease-out`. Pure CSS, no JS animation loop, consistent with the bottom sheet's existing transform-transition approach.

### Yandex control theming via CSS mask recolor (revised during implementation)

Investigating `@yandex/ymaps3-default-ui-theme`'s shipped stylesheet during implementation showed it does **not** expose CSS custom properties for control colors — only for popup-tail geometry (`--ymaps3-default-*`). The zoom and geolocation control icons are hardcoded data-URI SVG backgrounds (`fill="#4d4d4d"` / `#cccccc` for a `__dark` variant). There is no documented hook to recolor them via a custom-property override as originally planned.

Revised approach: override the theme's known icon selectors (`.ymaps3--zoom-control__in/__out` and their `__dark-*` variants, `.ymaps3--geolocation-control` and `__dark`) directly in `index.css`, after the theme import. Each rule sets `background-image: none`, reuses the same data-URI as a `mask-image` (mask only reads the alpha channel, so the original hardcoded fill color is irrelevant), and sets `background-color: var(--accent)`. This recolors the icons to the app's accent color and tracks light/dark mode automatically through `--accent`'s existing media-query definition, without needing to know which `__dark` variant the library activates.

Limitation: the round white button chrome (background/box-shadow) surrounding each icon is not produced by this theme package — it is presumed to come from the base `@yandex/ymaps3` control-button wrapper, loaded from Yandex's CDN at runtime rather than shipped in `node_modules`. Its class names could not be confirmed statically (the CDN script requires a whitelisted referer, and no browser tool was available in this session to inspect the live DOM), so that chrome keeps its own default styling. Only the icon glyph color is guaranteed to match `--accent`; a follow-up with live DOM inspection (or the vendor's own theming API, if one exists beyond this stylesheet) is needed to close that gap.

### Desktop control layout

Native Yandex controls (`YMapControls position="top left"`) stay top-left, matching every major map product's convention. The app's own chrome (side panel) now occupies the left edge as a full-height column rather than a top-left floating button, so the overlap disappears structurally — there is no more `view-toggle` button competing for the same corner. The add-court trigger moves to the top of the side panel's default (list) view rather than floating bottom-left.

## Risks / Trade-offs

- **[Risk]** Widening `SidePanel`/`BottomSheet` to share a state shape touches most of `App.tsx`'s control flow. → Mitigation: no behavior change to mobile is intended; the mobile code path keeps using the same components, just reorganized. Manual pass on mobile after the change to confirm no regression.
- **[Risk]** Overriding third-party theme custom properties is brittle across `@yandex/ymaps3-default-ui-theme` version bumps if property names change. → Mitigation: pin the current version (already the case via lockfile); revisit the override if the package is intentionally upgraded.
- **[Risk]** A permanent left side panel reduces map width on smaller desktop/tablet windows. → Mitigation: panel width is fixed at a reasonable size (~360-400px) and the map remains usable at typical laptop widths (1280px+); no further responsive tuning is in scope for this MVP change.
