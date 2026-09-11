## 1. Prerequisite

- [ ] 1.1 Verify the installed ymaps3 types accept `position="bottom right"` on `<YMapControls>` (check `@yandex/ymaps3-types`/the package's own `.d.ts`, per design.md decision 1 risk). If not supported literally, note the closest supported corner and adjust decision 2's offset math accordingly before continuing.

## 2. `MapView.tsx`: responsive control position

- [ ] 2.1 Add `isMobile: boolean` to `MapViewProps` in `frontend/src/components/MapView.tsx`.
- [ ] 2.2 Pass `isMobile={isMobile}` from `App.tsx`'s existing `<MapView ... />` call (reuse the existing `isMobile` from `useMediaQuery('(max-width: 767px)')` — no new hook).
- [ ] 2.3 `<YMapControls position={isMobile ? 'bottom right' : 'top left'}>` — switch the fixed `"top left"` to the conditional value.

## 3. `App.tsx`: remove top bar, add search-pill, compact FAB

- [ ] 3.1 Remove the `.mobile-top-bar` block and its `.mobile-top-bar__btn` button (the one currently calling `handleOpenList`).
- [ ] 3.2 Add a new `<button type="button" className="search-pill" onClick={handleOpenList}>` (rendered under the same `isMobile` condition the top bar used), containing the `MagnifyingGlass` icon (`@phosphor-icons/react`) + text "Искать площадки".
- [ ] 3.3 FAB: replace the `+ Добавить` text children with `<Plus weight="bold" size={24} />` (import from `@phosphor-icons/react`), add `aria-label="Добавить площадку"` to the `<button className="fab btn btn-primary">`.
- [ ] 3.4 `.fab--cancel` ("Отмена") — leave its text label and behavior unchanged (design.md decision 6, explicitly out of scope).

## 4. `index.css`: layout, elevation, glass scope

- [ ] 4.1 Remove `.mobile-top-bar`/`.mobile-top-bar__btn` rules (now unused).
- [ ] 4.2 Add `.search-pill`: `.glass-over-map` declarations (background/backdrop-filter/border/`--shadow-2`), `--radius-pill`, height matching `.fab`'s row, positioned in the same bottom row as `.fab` with the existing safe-area buffer (`calc(env(safe-area-inset-bottom, 0px) + 24px + 16px)`), flex-grow to fill the width left of the FAB.
- [ ] 4.3 `.fab`: change from pill (`padding`/`--radius-pill`) to a fixed-size circle (`width`/`height` equal, `border-radius: 50%`), center its icon child (`display:flex;align-items:center;justify-content:center`), drop the now-unused `gap`/text sizing.
- [ ] 4.4 Recolored ymaps3 control selectors (`.ymaps3--zoom-control > .ymaps3--control-button`, `.ymaps3--control-button:has(> .ymaps3--geolocation-control)`): drop `background: rgba(...)`/`backdrop-filter`/the translucent `border` (the `.glass-over-map`-style declarations), replace with `background: var(--surface); box-shadow: var(--shadow-2);`, no border/blur (per the modified `frontend-mapping` requirement — controls are no longer glass).
- [ ] 4.5 Remove those same ymaps3 control selectors from the `@media (prefers-reduced-transparency: reduce)` block — nothing to fall back from once they're already opaque (design.md decision 3).
- [ ] 4.6 Add mobile-only (`@media (max-width: 767px)`) bottom offset to the same ymaps3 control selectors so the stack clears the search-pill/FAB row: `margin-bottom: calc(56px + 12px)` (FAB height + gap, matching the `--space-3`/56px buffer math already written into `docs/courtmap-design-system.md` §10's `.map-controls-stack` example) — verify against the control's actual rendered position (ymaps3 applies its own internal corner margin) and adjust the constant if it doesn't clear the row.

## 5. Zoom/geolocation icon redesign (design.md decision 7)

- [ ] 5.1 Source the raw SVG markup for Phosphor `Plus`, `Minus`, `Crosshair` (`Regular` weight) from the installed `@phosphor-icons/core` package (or render each React component to a scratch page and copy the rendered `<svg>`) — do not hand-approximate the path data.
- [ ] 5.2 Replace the base64 SVG inside `-webkit-mask-image`/`mask-image` on `.ymaps3--zoom-control__in`/`.ymaps3--zoom-control__dark-in` with the `Plus` glyph, and on `.ymaps3--zoom-control__out`/`.ymaps3--zoom-control__dark-out` with the `Minus` glyph — keep `background-color: var(--accent) !important` and the other mask properties untouched.
- [ ] 5.3 Replace the base64 SVG inside `-webkit-mask-image`/`mask-image` on `.ymaps3--geolocation-control`/`.ymaps3--geolocation-control__dark` with the `Crosshair` glyph.
- [ ] 5.4 Check each new icon's actual size against its selector's `-webkit-mask-size`/`mask-size` (explicit `24px 24px` on geolocation today, implicit/auto on zoom) — adjust the value if the Phosphor SVG's viewBox differs from what the replaced Yandex icon assumed, so the glyph isn't clipped or shrunk inside the 40px control button.
- [ ] 5.5 Visually confirm all three icons render centered, legible, and the same size as each other inside their buttons (not just individually correct).

## 6. Verification

- [ ] 6.1 Run `npm run dev`, confirm no console/network errors.
- [ ] 6.2 Manually verify on mobile: no "Список" button anywhere; tapping the поиск-pill opens the same list bottom sheet the old button used to.
- [ ] 6.3 Manually verify on mobile: FAB is a plain circle with only a "+" icon, no visible text, still 44px+ touch target; screen-reader/accessibility tree shows its `aria-label`.
- [ ] 6.4 Manually verify on mobile: zoom +/- and geolocation controls sit stacked in the bottom-right corner, above the поиск-pill/FAB row, with no visual overlap between the two groups.
- [ ] 6.5 Manually verify on mobile: zoom/geolocation controls are opaque (`--surface` + shadow), not translucent/blurred — map is fully hidden behind them, unlike the FAB/поиск-pill which stay translucent.
- [ ] 6.6 Manually verify on desktop: map controls are unchanged (top-left, existing style, same Phosphor icons per task 5) — this change must not alter desktop layout.
- [ ] 6.7 Toggle OS reduced-transparency and confirm `.fab`/`.search-pill` still fall back to solid `--surface` correctly, and that removing the ymaps3 selectors from that media block (task 4.5) didn't leave them stuck on a stale translucent style.
- [ ] 6.8 Zoom in/out and geolocate using the redesigned controls end-to-end — confirm they still function (not just look right) after the mask-image swap.
