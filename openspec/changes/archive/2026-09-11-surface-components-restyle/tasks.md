## 1. Prerequisite

- [x] 1.1 Confirm `design-tokens-foundation` is applied — `--surface`, `--shadow-1`/`--shadow-2`, `--radius-sm`/`--radius-md`/`--radius-lg`/`--radius-pill`, `--accent-focus`, `--feedback-error`/`--feedback-error-bg`, `--motion-instant`, `.glass-over-map` all exist in `frontend/src/index.css`. Stop and apply that change first if not.

## 2. Shared button classes

- [x] 2.1 Add `.btn`, `.btn-primary`, `.btn-secondary`, `.btn:disabled` to `index.css` per design.md decision 1
- [x] 2.2 `CourtForm.tsx`: submit button → `className="btn btn-primary"` (keep `court-form__actions` wrapper for layout), cancel button → `className="btn btn-secondary"`
- [x] 2.3 `CourtForm.tsx`: "Указать на карте" button (in `court-form__loc-fallback`) → `className="btn btn-secondary"`
- [x] 2.4 `App.tsx`: side panel "Добавить площадку" button → add `btn btn-primary` alongside `side-panel__add-btn` (position/width rules stay on `side-panel__add-btn`)
- [x] 2.5 `App.tsx`: FAB → add `btn btn-primary` alongside `fab`; FAB cancel variant → add `btn btn-secondary` alongside `fab fab--cancel` (remove now-redundant color rules from `.fab`/`.fab--cancel`, keep position/size/pill-radius)
- [x] 2.6 `CourtList.tsx`: sort-toggle button → add `btn btn-primary` alongside `court-list__sort-toggle` (remove now-redundant color rules, keep pill-radius/position)
- [x] 2.7 Remove the now-unused old per-component button color/radius declarations these replace (`.court-form__actions button`, `button[type='button']`, `.court-form__loc-fallback button` color rules, redundant parts of `.fab`/`.court-list__sort-toggle`/`.side-panel__add-btn`)

## 3. Input focus state

- [x] 3.1 Add `.court-form input:focus, .court-form select:focus` rule per design.md decision 4

## 4. Toggle component (unused, library only)

- [x] 4.1 Add `.toggle`/`.toggle.off`/`.toggle i` CSS per the design system's Toggle spec (§7) — no `.tsx` changes, nothing renders it yet

## 5. Error vs. neutral message styling

- [x] 5.1 Restyle `.court-form__message` to the left-bar error treatment (`border-left: 3px solid var(--feedback-error); background: var(--feedback-error-bg);`), dropping the old `--accent-bg`/`--accent-border` box style
- [x] 5.2 Restyle `.court-form__loc-fallback` to neutral `--surface`/`--border`, dropping `--accent-bg`/`--accent-border`

## 6. Elevation: side panel, bottom sheet, list rows

- [x] 6.1 `.side-panel`: drop `box-shadow: var(--shadow)`, add `border-right: 1px solid var(--border)`, keep `background: var(--bg)`
- [x] 6.2 `.bottom-sheet`: switch `background: var(--bg); box-shadow: var(--shadow);` to `background: var(--surface); box-shadow: var(--shadow-2);`
- [x] 6.3 `.court-list__row`: switch `background: var(--bg); box-shadow: var(--shadow);` to `background: var(--surface); box-shadow: var(--shadow-1);`
- [x] 6.4 Update border-radius on `.side-panel` (if any), `.bottom-sheet`, `.court-list__row` to `--radius-lg`/`--radius-md` as appropriate, replacing hardcoded px values

## 7. Glass surface on FAB and mobile top bar

- [x] 7.1 `.fab`: replace `background: var(--bg); box-shadow: var(--shadow);` with `.glass-over-map`'s declarations (background/backdrop-filter/border/shadow), keep pill radius and position rules
- [x] 7.2 `.mobile-top-bar__btn`: same glass treatment as 7.1
- [x] 7.3 Confirm `.fab--cancel` (secondary variant, now also `btn btn-secondary` per task 2.5) still reads correctly on top of the glass background

## 8. Verification

- [x] 8.1 Run `npm run dev`, confirm no console/network errors
- [x] 8.2 Manually verify: submit button filled accent, cancel button outlined/transparent, both 44px tall, in the add-court form on both desktop (side panel) and mobile (full-screen modal) — confirmed on mobile modal form (screenshot); desktop side-panel form renders the same shared `.btn`/`.btn-primary`/`.btn-secondary` classes, same CSS applies
- [x] 8.3 Manually verify: tabbing to / clicking an input or select shows a visible accent focus ring; losing focus removes it — confirmed, clicking the "Адрес" input and the "Покрытие" select shows the accent border + glow ring
- [ ] 8.4 Manually verify: submitting a duplicate court (409) and submitting with missing fields both show the error (red left-bar) message style; the geolocation-unavailable fallback message stays neutral, not red — **not fully verifiable in this session**: local backend couldn't start (sandbox blocks `getcwd`/venv access from this path), so the 409/submit-failure path couldn't be reproduced live. Confirmed instead by inspection: `.court-form__message` now renders `border-left: 3px solid var(--feedback-error); background: var(--feedback-error-bg)`, and `.court-form__loc-fallback` renders neutral `--surface`/`--border` (visually confirmed in the mobile form screenshot — geolocation-unavailable box is neutral white/bordered, not red). Re-run this check with the backend up before shipping.
- [x] 8.5 Manually verify: side panel is flat (bg + right border, no shadow); bottom sheet and list rows read as elevated surfaces (`--surface` + shadow) distinguishable from the page background — confirmed via computed styles: `.side-panel` → `box-shadow: none`, `border-right: 1px solid #E4E4E7`, `background: #FAFAFA` (no court rows were available to check `.court-list__row`/`.bottom-sheet` live, since the backend couldn't start in this sandbox — their rules were verified by reading `index.css` instead: both use `--surface` + `--shadow-1`/`--shadow-2`)
- [x] 8.6 Manually verify on mobile: FAB and the "Список" top-bar button are translucent with visible blur (map partially visible through them), not opaque — confirmed via screenshot and computed styles (`background: rgba(42,45,52,.28)`, `backdrop-filter: blur(14px)`) for both `.fab` and `.mobile-top-bar__btn`; also fixed two bugs found during this check (see below) and re-verified after the fix
- [x] 8.7 Toggle OS reduced-motion and confirm the new button hover/active transitions still respect the existing reduced-motion fallback (extend it if task 2 introduced a transition not yet covered)
