## Context

Today `App.tsx` renders `.search-pill` and `.fab` as two independent `position: fixed` siblings, each with its own hand-computed `left`/`right`/`bottom` offsets (`.search-pill`'s `right` is carved out to leave room for `.fab`, so they sit side by side in one row) and the same translucent glass surface (`rgba(42, 45, 52, 0.28)` + `backdrop-filter: blur(14px)`). `MapView.tsx` mounts the geolocation button through the base ymaps3 `YMapControls` primitive with `position={isMobile ? 'bottom right' : 'top left'}`; on mobile, `index.css`'s `.ymaps3--controls_vertical` rule adds a `margin-bottom` to push that SDK-rendered group above the search-pill/FAB row (see proposal.md - Why).

`@yandex/ymaps3-types` (`imperative/YMapControls/index.d.ts`) defines `YMapControlsProps.position` as `VerticalPosition | HorizontalPosition | \`${VerticalPosition} ${HorizontalPosition}\` | \`${HorizontalPosition} ${VerticalPosition}\`` where `VerticalPosition = 'top' | 'bottom'`. A bare vertical keyword is valid on its own, and `prepareProps` resolves the missing horizontal component to `'center'` — the SDK has native support for horizontal centering; no bespoke CSS transform is needed for the geolocation control.

## Goals / Non-Goals

**Goals:**
- Centered, full-width search-pill with equal left/right/bottom margins; FAB stacked directly above it, centered on the same axis (unchanged from the currently shipped layout — this revision does not move the FAB); geolocation placed directly above the pill on the right side, sharing the FAB's tier (not stacked above the FAB) with a right margin matching the pill's own 16px right edge.
- Search-pill and FAB become opaque (search-pill via `.court-list__row`'s exact tokens; FAB via the same `--surface`/`--shadow-2` tokens already used for `.map-control-btn`/`.map-geolocation-btn`), with no blur or translucency.

**Non-Goals:**
- No change to desktop layout (side panel), to which controls exist, to their icons, or to click behavior.
- No change to `.court-list__row` itself, or to the shape of the search-pill (stays a capsule) — only its surface tokens change (per explicit product decision).
- Not the full visual redesign of this area planned separately later; this is an interim, glass-free layout adjustment only.

## Decisions

### 1. Wrap search-pill + FAB in one fixed-position flex column instead of positioning each independently

Add a new wrapper (e.g. `.mobile-bottom-stack`) around the existing `<button className="search-pill">` and `<button className="fab">` in `App.tsx`: `position: fixed; left: 16px; right: 16px; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); display: flex; flex-direction: column-reverse; align-items: center; gap: var(--space-3);`.

- `left`/`right` both `16px` gives the search-pill equal side margins for free (it becomes `align-self: stretch` / `width: 100%` inside the wrapper, replacing its old hand-computed `right: calc(16px + 56px + 12px)`), and the wrapper's own `bottom` offset gives the same `16px` value on that third side, satisfying "equal margins on all three sides" without three separately-tuned numbers.
- `flex-direction: column-reverse` keeps the JSX/DOM order unchanged (search-pill still declared before the FAB, matching today's source order and any conditional-render logic around `fabVisible`/`cancelFabVisible`) while visually placing the FAB above the pill.
- `align-items: center` centers the FAB (a fixed 56px circle, not stretched) on the same axis as the stretched pill, with no separate transform math. This wrapper only contains the pill and FAB — the geolocation control is a separate, SDK-rendered element (see Decision 2) and isn't a flex child here.

**Alternative considered**: keep both elements independently `position: fixed` with hand-computed `bottom` offsets (as today, just with new numbers). Rejected — it requires duplicating the pill's height + gap into the FAB's own offset calculation, which is fragile if the pill's height ever changes (e.g. in the later redesign), whereas the flex wrapper computes that spacing automatically.

### 2. Place the geolocation control above the pill via `position="bottom right"`, clearing only the pill (not the FAB)

Keep the mobile `YMapControls` `position` prop at `'bottom right'`, its value before this change, rather than switching to bare `'bottom'`. Bare `'bottom'` was tried and reverted during this change's implementation: it caused the geolocation control not to render at all in real usage (found via manual testing on 2026-09-14). Separately, product direction settled on the FAB staying centered above the pill (unchanged from the shipped layout) with geolocation moving to the right, sharing the FAB's tier rather than stacking above it — so `'bottom right'` is also the correct horizontal choice on its own merits, not just the safe fallback.

Recalculate `.ymaps3--controls_vertical`'s `margin-bottom` to clear only the search-pill, since geolocation now lands beside the FAB (same vertical tier) instead of above it: `env(safe-area-inset-bottom, 0px) + 16px (wrapper bottom margin) + 48px (pill height) + 12px (gap)` — this places the geolocation control's bottom edge level with the FAB's bottom edge. No `margin-right` override is added: the SDK's default `'bottom right'` corner offset already matches the search-pill's 16px right margin (the same assumption that held for the FAB's own 16px right margin before this change), giving equal right-side spacing between the pill and the geolocation control above it.

**Rejected alternatives**:
- Bare `position="bottom"` for native SDK horizontal centering — tried and reverted: it left the geolocation control unrendered in real usage.
- Stacking geolocation directly above the FAB (a two-tier right-aligned column, with the FAB itself also moved to the right) — considered as an intermediate revision of this change, but rejected in favor of leaving the FAB where it already is and placing geolocation independently above the pill on the right.

### 3. Reuse existing token sets verbatim; no new CSS custom properties

- `.search-pill`: replace `background: rgba(42, 45, 52, 0.28); backdrop-filter: blur(14px); border: 1px solid rgba(255, 255, 255, 0.5);` with `background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow-1); color: var(--text-h);` — the exact `.court-list__row` token set, confirmed with the app owner to cover tokens only, not shape (capsule `border-radius: var(--radius-pill)` is unchanged).
- `.fab`: replace the same glass declarations with `background: var(--surface); box-shadow: var(--shadow-2);` (no border) — the same pairing already used by `.map-control-btn`/`.map-geolocation-btn`, so all three controls read as one consistent "opaque elevated surface" language even though the pill is a stretched capsule and the FAB/geolocation are circles.
- Drop `.fab` and `.search-pill` from the `@media (prefers-reduced-transparency: reduce)` override block in `index.css` (it exists purely to force glass elements opaque as an accessibility fallback; once they're opaque unconditionally, listing them there is dead code). `.glass-over-map` stays in that block untouched — it isn't part of this change.

## Risks / Trade-offs

- **[Risk] The SDK-rendered control group's exact box model (internal padding/margins around the geolocation button) isn't visible from source (compiled bundle), so the hand-computed `margin-bottom`/right-edge alignment may need empirical adjustment** → Mitigated by a Verification step (tasks.md) that visually checks the geolocation button lands level with the FAB, with matching right margins, on a real mobile viewport, adjusting the margin value if needed.
- **[Risk] Introducing a new wrapper element around `.search-pill`/`.fab` changes `App.tsx`'s DOM structure, which could affect other selectors or test locators scoped to those two classes as top-level fixed elements** → Mitigated by keeping both elements' own class names and behavior unchanged (only their positioning strategy moves from independently-fixed to flex children of a fixed wrapper); grep the codebase for other `.search-pill`/`.fab` references before implementing.
- **[Risk] The margin-bottom clearance formula for the geolocation control is a brittle, hand-maintained pixel sum (safe-area + wrapper margin + pill height + gap)** → Accepted as interim, consistent with the rest of this change being explicitly temporary ahead of a later full redesign; documented inline in the CSS comment, matching the existing convention for that rule.
- **[Risk] An earlier draft of this change centered the FAB and stacked geolocation above it (bare `position="bottom"`); that draft shipped, was found to leave geolocation unrendered in real usage, and is now superseded by this two-item-tier layout** → No open action; recorded so a future reader of `App.tsx`/`index.css` history understands why the position prop and margin values moved more than once.
