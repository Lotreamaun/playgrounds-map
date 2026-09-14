## Context

Today `App.tsx` renders `.search-pill` and `.fab` as two independent `position: fixed` siblings, each with its own hand-computed `left`/`right`/`bottom` offsets (`.search-pill`'s `right` is carved out to leave room for `.fab`, so they sit side by side in one row) and the same translucent glass surface (`rgba(42, 45, 52, 0.28)` + `backdrop-filter: blur(14px)`). `MapView.tsx` mounts the geolocation button through the base ymaps3 `YMapControls` primitive with `position={isMobile ? 'bottom right' : 'top left'}`; on mobile, `index.css`'s `.ymaps3--controls_vertical` rule adds a `margin-bottom` to push that SDK-rendered group above the search-pill/FAB row (see proposal.md - Why).

`@yandex/ymaps3-types` (`imperative/YMapControls/index.d.ts`) defines `YMapControlsProps.position` as `VerticalPosition | HorizontalPosition | \`${VerticalPosition} ${HorizontalPosition}\` | \`${HorizontalPosition} ${VerticalPosition}\`` where `VerticalPosition = 'top' | 'bottom'`. A bare vertical keyword is valid on its own, and `prepareProps` resolves the missing horizontal component to `'center'` — the SDK has native support for horizontal centering; no bespoke CSS transform is needed for the geolocation control.

## Goals / Non-Goals

**Goals:**
- Centered search-pill with equal left/right/bottom margins, FAB stacked directly above it, geolocation stacked directly above the FAB — one shared horizontal axis for all three.
- Search-pill and FAB become opaque (search-pill via `.court-list__row`'s exact tokens; FAB via the same `--surface`/`--shadow-2` tokens already used for `.map-control-btn`/`.map-geolocation-btn`), with no blur or translucency.

**Non-Goals:**
- No change to desktop layout (side panel), to which controls exist, to their icons, or to click behavior.
- No change to `.court-list__row` itself, or to the shape of the search-pill (stays a capsule) — only its surface tokens change (per explicit product decision).
- Not the full visual redesign of this area planned separately later; this is an interim, glass-free, centered-stack layout only.

## Decisions

### 1. Wrap search-pill + FAB in one fixed-position flex column instead of positioning each independently

Add a new wrapper (e.g. `.mobile-bottom-stack`) around the existing `<button className="search-pill">` and `<button className="fab">` in `App.tsx`: `position: fixed; left: 16px; right: 16px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); display: flex; flex-direction: column-reverse; align-items: center; gap: var(--space-3);`.

- `left`/`right` both `16px` gives the search-pill equal side margins for free (it becomes `align-self: stretch` / `width: 100%` inside the wrapper, replacing its old hand-computed `right: calc(16px + 56px + 12px)`), and the wrapper's own `bottom` offset gives the same `16px` value on that third side, satisfying "equal margins on all three sides" without three separately-tuned numbers.
- `flex-direction: column-reverse` keeps the JSX/DOM order unchanged (search-pill still declared before the FAB, matching today's source order and any conditional-render logic around `fabVisible`/`cancelFabVisible`) while visually placing the FAB above the pill.
- `align-items: center` centers the FAB (a fixed 56px circle, not stretched) on the same axis as the stretched pill, with no separate transform math.

**Alternative considered**: keep both elements independently `position: fixed` with hand-computed `bottom` offsets (as today, just with new numbers). Rejected — it requires duplicating the pill's height + gap into the FAB's own offset calculation, which is fragile if the pill's height ever changes (e.g. in the later redesign), whereas the flex wrapper computes that spacing automatically.

### 2. Center the geolocation control via the SDK's native `position="bottom"`, not a CSS override

Change the mobile `YMapControls` `position` prop from `'bottom right'` to `'bottom'` (bare vertical keyword). Per `@yandex/ymaps3-types`, this resolves to a horizontally-centered computed position natively, avoiding a third place (alongside the wrapper's `align-items: center` and the pill's stretch) that has to independently reimplement centering.

The existing `.ymaps3--controls_vertical` `margin-bottom` override (already used today to clear the old row) is kept but its value is recalculated to clear the new, taller stack: `env(safe-area-inset-bottom, 0px) + 16px (wrapper bottom margin) + 48px (pill height) + 12px (gap) + 56px (FAB height) + 12px (gap)`, so the geolocation button lands directly above the FAB with the same `var(--space-3)` gap used between the FAB and the pill.

**Alternative considered**: keep `position="bottom right"` and center the SDK-rendered group with a CSS transform on `.ymaps3--controls_vertical` (`left: 50%; transform: translateX(-50%)`, mirroring what a hand-built element would need). Rejected in favor of the SDK's native centering — one fewer CSS override to maintain, and it can't drift out of sync if the SDK's own internal right-edge math changes.

### 3. Reuse existing token sets verbatim; no new CSS custom properties

- `.search-pill`: replace `background: rgba(42, 45, 52, 0.28); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.5);` with `background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-1); color: var(--text-h);` — the exact `.court-list__row` token set, confirmed with the app owner to cover tokens only, not shape (capsule `border-radius: var(--radius-pill)` is unchanged).
- `.fab`: replace the same glass declarations with `background: var(--surface); box-shadow: var(--shadow-2);` (no border) — the same pairing already used by `.map-control-btn`/`.map-geolocation-btn`, so all three stacked controls read as one consistent "opaque elevated surface" language even though the pill is a stretched capsule and the FAB/geolocation are circles.
- Drop `.fab` and `.search-pill` from the `@media (prefers-reduced-transparency: reduce)` override block in `index.css` (it exists purely to force glass elements opaque as an accessibility fallback; once they're opaque unconditionally, listing them there is dead code). `.glass-over-map` stays in that block untouched — it isn't part of this change.

## Risks / Trade-offs

- **[Risk] The SDK-rendered centered control group's exact box model (internal padding/margins around the geolocation button) isn't visible from source (compiled bundle), so the hand-computed `margin-bottom` clearance value may need empirical adjustment** → Mitigated by a Verification step (tasks.md) that visually checks the geolocation button clears the FAB with a consistent gap on a real mobile viewport, adjusting the margin value if needed.
- **[Risk] Introducing a new wrapper element around `.search-pill`/`.fab` changes `App.tsx`'s DOM structure, which could affect other selectors or test locators scoped to those two classes as top-level fixed elements** → Mitigated by keeping both elements' own class names and behavior unchanged (only their positioning strategy moves from independently-fixed to flex children of a fixed wrapper); grep the codebase for other `.search-pill`/`.fab` references before implementing.
- **[Risk] The margin-bottom clearance formula for the geolocation control is a brittle, hand-maintained pixel sum (safe-area + wrapper margin + pill height + gap + FAB height + gap)** → Accepted as interim, consistent with the rest of this change being explicitly temporary ahead of a later full redesign; documented inline in the CSS comment, matching the existing convention for that rule.
