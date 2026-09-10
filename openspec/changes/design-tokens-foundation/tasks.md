## 1. Typography

- [ ] 1.1 Add `@import url('https://fonts.googleapis.com/css2?family=Commissioner:wght@400;500;600;700;800&display=swap');` to `frontend/src/index.css`, right after the existing `@yandex/ymaps3-default-ui-theme` import
- [ ] 1.2 Update `--sans` and `--heading` to `'Commissioner', system-ui, sans-serif` (fallback stack preserved)

## 2. Neutral and accent color roles

- [ ] 2.1 Update `:root` light values: `--bg: #FAFAFA`, `--border: #E4E4E7`, `--text-h: #18181B`, `--text: #71717A`, `--accent: #2A2D34`
- [ ] 2.2 Add `--surface: #FFFFFF` (new token, light) and `--surface: #1B1B1E` (dark) — no existing consumer, purely additive
- [ ] 2.3 Add alias tokens `--text-primary: var(--text-h)` and `--text-secondary: var(--text)`
- [ ] 2.4 Redefine `--accent-bg` (light: `rgba(42, 45, 52, .14)`, used as the basis for `--accent-focus`) and repoint `--accent-border` to resolve to `var(--accent)` instead of a translucent purple
- [ ] 2.5 Add `--accent-hover: #3F434C` (light) and `--accent-focus: var(--accent-bg)`
- [ ] 2.6 Update the `@media (prefers-color-scheme: dark)` block with the dark-theme counterparts: `--bg: #121214`, `--border: #2C2C30`, `--text-h: #F4F4F5`, `--text: #9A9AA0`, `--accent: #E4E4E7`, `--accent-hover: #C7C7CC`, `--accent-bg`/`--accent-focus` alpha-adjusted, `--surface: #1B1B1E`
- [ ] 2.7 Scope the dark-mode media block to `:root:not([data-theme="light"])` and duplicate the same declarations under a new `[data-theme="dark"]` selector, per design.md decision 2 (no `data-theme` attribute is set anywhere yet — purely additive)

## 3. Category and feedback color roles

- [ ] 3.1 Add categorical sport tokens: `--sport-basketball: #C56A3D`, `--sport-football: #4F8A54`, `--sport-hockey: #A83A46`, `--sport-tennis: #A8C23F` (same values in light and dark — verify none collides with `--accent`)
- [ ] 3.2 Add form feedback tokens: `--feedback-error: #B3261E`, `--feedback-error-bg: rgba(179, 38, 30, .08)`, `--feedback-success: var(--accent)`

## 4. Spacing, radius, and motion scale

- [ ] 4.1 Add spacing scale `--space-1` through `--space-9` (4/8/12/16/20/24/32/48/64px)
- [ ] 4.2 Add radius scale `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-pill: 999px`
- [ ] 4.3 Add motion tokens `--motion-instant: 120ms`, `--motion-fast: 200ms`, `--motion-base: 300ms`, `--motion-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`

## 5. Elevation levels and glass-over-map

- [ ] 5.1 Add `--shadow-1: 0 1px 3px rgba(0,0,0,.06)` (surface), `--shadow-2: 0 4px 16px rgba(0,0,0,.12)` (floating), `--shadow-3: 0 12px 32px rgba(0,0,0,.18)` (modal reference) as new tokens alongside the untouched legacy `--shadow`
- [ ] 5.2 Add a reusable `.glass-over-map` class: `background: rgba(42, 45, 52, .28)`, `backdrop-filter: blur(14px)` + `-webkit-backdrop-filter`, `border: 1px solid rgba(255,255,255,.5)`, `box-shadow: var(--shadow-2)`
- [ ] 5.3 Add a `@media (prefers-reduced-transparency: reduce)` override for `.glass-over-map` that drops the blur/alpha in favor of a solid `var(--surface)` background with the same `--shadow-2`

## 6. Reduced-motion fallback

- [ ] 6.1 Extend the existing `@media (prefers-reduced-motion: reduce)` block in `index.css` to also neutralize any new usage of `--motion-spring`/`--motion-fast`/`--motion-base`/`--motion-instant` introduced by this change (the block itself currently only targets `.side-panel`, `.court-marker__pin`, `.court-list__row` — confirm it still covers everything this change touches, i.e. `.glass-over-map` needs no motion since it has no transition of its own)

## 7. Verification

- [ ] 7.1 Run `npm run dev` and confirm the app still renders without console/network errors after the token changes (no component markup changed, so this is a regression check)
- [ ] 7.2 Confirm computed `font-family` on body text is Commissioner (dev tools) and that the page remains readable if the Google Fonts request is blocked (fallback stack)
- [ ] 7.3 Visually confirm the interactive accent (buttons, focus ring, selected list row) is now graphite, not purple, in both light and OS dark mode
- [ ] 7.4 Toggle OS-level reduced-motion and confirm existing transitions (side panel, marker selection, list row hover) still shorten/disable as before
- [ ] 7.5 Confirm none of the 47 existing `var(--text|--text-h|--bg|--border|--accent|--accent-bg|--accent-border|--shadow)` call sites in `index.css` was left referencing an undefined token (no visual "broken" spots)
