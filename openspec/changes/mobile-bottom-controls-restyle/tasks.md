## 1. Layout: shared wrapper for search-pill + FAB

- [ ] 1.1 In `frontend/src/App.tsx`: wrap the existing `<button className="search-pill">` and the FAB buttons (`fabVisible`/`cancelFabVisible`) in a new `.mobile-bottom-stack` container, keeping their existing JSX order.
- [ ] 1.2 In `frontend/src/index.css`: add `.mobile-bottom-stack` in the `@media (max-width: 767px)` block: `position: fixed; left: 16px; right: 16px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); z-index: 1850; display: flex; flex-direction: column-reverse; align-items: center; gap: var(--space-3);`.
- [ ] 1.3 Update `.search-pill` in the same media block: remove its own `position`/`left`/`right`/`bottom`/`z-index` (now inherited from the wrapper), keep it as a flex item stretched to the wrapper's width (`align-self: stretch` or `width: 100%`) so it keeps equal left/right margins.
- [ ] 1.4 Update `.fab` in the same media block: remove its own `position`/`right`/`bottom`/`z-index` (now a centered flex item via the wrapper's `align-items: center`); keep its own `width`/`height`/`border-radius`/icon layout.
- [ ] 1.5 Confirm `.mobile-add-hint` (positioned independently, `bottom: calc(env(safe-area-inset-bottom) + 100px)`) still clears the taller stack; adjust its offset if the FAB's new position changes the visual overlap.

## 2. Styling: drop glass, adopt opaque tokens

- [ ] 2.1 In `frontend/src/index.css`: change `.search-pill`'s surface from `background: rgba(42, 45, 52, 0.28); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.5);` to `background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-1); color: var(--text-h);` — same tokens as `.court-list__row`, capsule shape (`border-radius: var(--radius-pill)`) unchanged.
- [ ] 2.2 In `frontend/src/index.css`: change `.fab`'s surface from the same glass declarations to `background: var(--surface); box-shadow: var(--shadow-2);` (no border) — matching `.map-control-btn`/`.map-geolocation-btn`.
- [ ] 2.3 Remove `.fab` and `.search-pill` from the `@media (prefers-reduced-transparency: reduce)` override block (now redundant since both are opaque unconditionally); leave `.glass-over-map` in that block untouched.

## 3. Geolocation control: center above the FAB

- [ ] 3.1 In `frontend/src/components/MapView.tsx`: change the mobile `YMapControls` `position` prop from `'bottom right'` to `'bottom'` so the SDK centers the geolocation control horizontally.
- [ ] 3.2 In `frontend/src/index.css`: recalculate `.ymaps3--controls_vertical`'s mobile `margin-bottom` to clear the new stack height: `env(safe-area-inset-bottom, 0px) + 16px (wrapper margin) + 48px (pill height) + 12px (gap) + 56px (FAB height) + 12px (gap)`; update the inline comment above the rule to describe the new three-tier stack.

## 4. Verification

- [ ] 4.1 `npm run dev`: on a mobile viewport, confirm the search-pill is horizontally centered with visually equal left, right, and bottom margins.
- [ ] 4.2 Confirm the FAB ("+") sits directly above the search-pill, centered on the same horizontal axis, with a consistent gap.
- [ ] 4.3 Confirm the geolocation button sits directly above the FAB, centered on the same axis, with no overlap; adjust the `margin-bottom` value from 3.2 if the SDK's rendered group doesn't land exactly where expected.
- [ ] 4.4 Confirm `.search-pill` and `.fab` render as fully opaque (`--surface` + shadow, no blur, map not visible through them) in both light and dark theme.
- [ ] 4.5 Confirm `.search-pill`'s color/border/shadow visually match `.court-list__row` (e.g. compare against the court list sheet).
- [ ] 4.6 Confirm `handleOpenList`, `handleAddToggle`/add-mode cancel, and geolocate-on-tap still work unchanged after the repositioning (click handlers untouched by this change, but the new wrapper markup could still break event wiring).
- [ ] 4.7 Confirm desktop layout (side panel, map controls) is unaffected.
- [ ] 4.8 `npm run build` and `npm run lint` pass.
