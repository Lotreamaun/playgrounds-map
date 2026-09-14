## Context

Current mobile chrome (`frontend/src/App.tsx`): `isMobile` (from the existing `useMediaQuery('(max-width: 767px)')` hook) gates a `.mobile-top-bar` containing a single `.mobile-top-bar__btn` ("Список", calls the existing `handleOpenList`), and a separate `.fab`/`.fab--cancel` pair. `MapView.tsx` renders `<YMapControls position="top left"><YMapZoomControl /><YMapGeolocationControl .../></YMapControls>` unconditionally — one fixed corner for every viewport, no `isMobile` awareness at all today (`MapViewProps` doesn't carry it). `index.css` already recolors the rendered ymaps3 control DOM via `.ymaps3--zoom-control`/`.ymaps3--geolocation-control` selectors (graphite mask-image) — this is the existing, working pattern for reaching into ymaps3's own markup from outside React. See `proposal.md` for why this needs to change; `docs/courtmap-design-system.md` §7/§10 (already updated) is the target visual/behavioral spec.

## Goals / Non-Goals

**Goals:**
- Reuse the existing `isMobile` signal end-to-end instead of introducing a second viewport-detection mechanism.
- Reuse `handleOpenList` as-is for the search-pill's tap handler — no new "open list" logic.
- Keep the zoom/geolocation `mask-image` mechanism (CSS targeting ymaps3's own class names) rather than replacing it with something else — extend it to swap the masked SVG's shape (icon redesign), not just reuse it for positioning/elevation.

**Non-Goals:**
- No real search/filter input. The поиск-pill is tap-to-open only (matches `docs/courtmap-design-system.md` §7: "тап открывает bottom sheet со списком") — typing/filtering courts by text is a separate, unrequested feature.
- No change to desktop layout or `MapControls`/`map-controls` desktop positioning — confirmed out of scope in proposal.md.
- No new npm dependency — `Plus`/`Minus`/`Crosshair`/`MagnifyingGlass` icons are already available via `@phosphor-icons/react` (already used in `CourtMarker.tsx`); the zoom/geolocation icons don't render this React component directly (see Decision 7) but source their shape from the same icon family.

## Decisions

### 1. `isMobile` becomes a `MapView` prop, drives `YMapControls` position

`App.tsx` already computes `isMobile`. Pass it down as a new `MapViewProps.isMobile: boolean` and switch the control position with it:
```tsx
<YMapControls position={isMobile ? 'bottom right' : 'top left'}>
  <YMapZoomControl />
  <YMapGeolocationControl onGeolocatePosition={handleGeolocateFallback} />
</YMapControls>
```
Alternative considered: keep controls always `"top left"` and only restyle via CSS `transform`/`position` overrides on the rendered ymaps3 DOM. Rejected — fighting the library's own absolute positioning with CSS overrides is more fragile than using the `position` prop it already exposes for exactly this purpose, and ymaps3 recalculates control layout internally (stacking multiple controls in the same corner), which a CSS override would not replicate correctly.

### 2. Bottom-right stacking clearance via CSS margin on the existing recolored selectors, scoped to mobile

The ymaps3 library stacks controls flush to the chosen corner with its own internal margin; it has no concept of "leave room for the app's FAB row below." Add a mobile-only bottom margin to the same selectors `index.css` already targets (`.ymaps3--zoom-control`, `.ymaps3--control-button:has(> .ymaps3--geolocation-control)`) equal to the FAB row height + gap, matching the `--space-3` gap and buffer math already written into `docs/courtmap-design-system.md` §10 (`.map-controls-stack` example). No new wrapper element needed.

### 3. Controls lose `.glass-over-map`, gain flat elevation-2

Per the modified `frontend-mapping` requirement, the control container's background/blur/border declarations (currently duplicating `.glass-over-map`'s values directly on the `.ymaps3--zoom-control`/`.ymaps3--geolocation-control` selectors — same duplication pattern flagged and worked around in `surface-components-restyle`) switch to `background: var(--surface); box-shadow: var(--shadow-2);` with no `backdrop-filter`/border. This also means these selectors can be **dropped** from the `prefers-reduced-transparency` media query block (nothing to fall back from once they're already opaque) — the reduced-transparency fallback there stays scoped to `.fab`/`.search-pill` only.

### 4. Search-pill is a plain `<button>`, not a new component file

It's a single static-content trigger (icon + placeholder-style text, `onClick={handleOpenList}`), the same shape as the FAB it sits next to. Add it as inline JSX in `App.tsx` next to the FAB block, styled via a new `.search-pill` class — consistent with how `.fab` itself is inline JSX, not a `<FAB>` component (matches `surface-components-restyle`'s established non-goal of not introducing new component abstractions for simple styled elements).

### 5. FAB becomes icon-only via children swap, not a new class

`.fab`'s existing position/size/glass CSS is kept; only its **content** changes (`+ Добавить` text → `<Plus weight="bold" size={24} />`) plus explicit `width`/`height`/`border-radius: 50%` replacing the pill `padding`/`--radius-pill`, and `aria-label="Добавить площадку"` on the `<button>` itself (the visible text it replaces).

### 6. `.fab--cancel` keeps its text label, stays out of scope

The user's original complaint ("сладкое массивная, занимает много места") was specifically about the primary "+ Добавить" FAB; the cancel variant (shown during add-mode/pick-on-map) isn't mentioned in the proposal or specs. Compacting it too would be scope creep beyond what was asked and requested — it stays a labeled `.fab--cancel` button ("Отмена"), unchanged by this design.

### 7. Zoom/geolocation icon shape swap: replace the embedded SVG inside the existing `mask-image` rules, don't render React icons

`index.css` already has (from `map-chrome-and-markers`, archived) a documented reason this is CSS-only: `@yandex/ymaps3-default-ui-theme` exposes no CSS custom property for control icon color, so the icon ships as a fixed-fill data-URI SVG background, recolored today via `mask-image: url('data:image/svg+xml;base64,...')` + `background-color: var(--accent) !important`. `YMapZoomControl`/`YMapGeolocationControl` are library-rendered — there's no React children slot to drop a `<Plus />`/`<Minus />`/`<Crosshair />` into. So the redesign is: keep the exact same CSS mechanism (selectors `.ymaps3--zoom-control__in`/`__out`, `.ymaps3--geolocation-control`/`__dark`), replace only the embedded SVG's `<path>` data inside each `mask-image`/`-webkit-mask-image` data URI with the corresponding Phosphor `Plus`/`Minus`/`Crosshair` (`Regular` weight) glyph, re-encoded as base64. `background-color: var(--accent)` (already there) does the fill — a plain shape swap, not a new mechanism.

Sourcing the replacement SVGs: pull the raw `<svg>` markup for `Plus`, `Minus`, `Crosshair` from the installed `@phosphor-icons/core` assets (the `-react` package's icons are generated from that same source, so the shapes match what's used elsewhere in the app) — either by reading the SVG file directly from `node_modules/@phosphor-icons/core/assets/regular/` or by rendering the React component in a scratch page and copying its output — rather than approximating the path by hand. Phosphor's own viewBox is not necessarily the same as the Yandex icon it replaces (check the source file rather than assuming 24×24) — the existing `-webkit-mask-size`/`mask-size` declarations (explicit `24px 24px` on the geolocation selector, implicit/auto on the zoom selectors) need to be set explicitly to match whatever the new SVG's viewBox actually is, or the icon renders at the wrong scale inside the button.

## Risks / Trade-offs

- **[Risk] `YMapControls`'s `position` prop may not literally accept the string `"bottom right"`** (exact accepted literals aren't verified from source here) → verify against `@yandex/ymaps3-types`/the installed package's type declarations as the first implementation task; if the exact corner isn't supported, the closest available corner + margin offset achieves the same visual result.
- **[Risk] Removing `.mobile-top-bar`/`.mobile-top-bar__btn` CSS and markup is a one-way visual change with no feature-flag** → low risk since it's pure presentation with an existing equivalent handler (`handleOpenList`) reused, not new logic; verified manually per tasks.md before merge, same as `surface-components-restyle`'s verification approach.
- **[Trade-off] Stacking clearance (Decision 2) is a fixed pixel/space-token offset, not a measured one** → if the FAB row's actual height ever changes, the offset needs a matching update; acceptable since both live in `index.css` and are easy to keep in sync, same trade-off already accepted for the existing `.fab` safe-area buffer math.
