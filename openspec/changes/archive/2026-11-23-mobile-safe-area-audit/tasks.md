## 1. Stable viewport height

- [x] 1.1 In `frontend/src/index.css`, remove the `#root { min-height: 100dvh; }` override inside the `@media (max-width: 767px)` block (the base `:root`/`#root` rule already sets `100svh` — let it apply on mobile too)
- [x] 1.2 Remove the `.map-view { height: 100dvh; }` override in the same mobile `@media` block for the same reason (base rule already sets `100svh`)
- [x] 1.3 Confirm `.bottom-sheet--modal { height: 100dvh; max-height: 100dvh; }` is left untouched in both the base and mobile blocks — this is the deliberate keyboard-aware exception, not part of this fix

## 2. FAB safe-area buffer

- [x] 2.1 In `frontend/src/index.css`, change `.fab`'s `bottom: calc(env(safe-area-inset-bottom) + 24px);` to `bottom: calc(env(safe-area-inset-bottom, 0px) + 24px + 16px);`

## 3. Keyboard-aware viewport meta

- [x] 3.1 In `frontend/index.html`, add `interactive-widget=resizes-content` to the `<meta name="viewport">` content attribute (alongside the existing `width=device-width, initial-scale=1.0`)

## 4. Verification

- [ ] 4.1 On a mobile viewport (devtools device emulation or a real device), scroll the page and confirm the map/root container height does not visibly jump when the browser's address bar collapses/expands — **partially verified**: source confirmed on `100svh` with no `100dvh` override anywhere in the mobile block (root cause fixed), computed `#root`/`.map-view` height matches viewport with no discrepancy in a sandboxed browser pane; real address-bar collapse/expand behavior needs a real mobile browser to fully confirm, not reproducible in this environment
- [ ] 4.2 Confirm the FAB stays fully tappable and clear of the browser's own bottom chrome when it is expanded (not just when collapsed) — **partially verified**: computed `.fab` `bottom` is `40px` (`env(safe-area-inset-bottom, 0px)` = 0 here + `24px` + `16px`), buffer math confirmed correct; actual expanded-chrome clearance on a real device not reproducible in this sandboxed environment
- [ ] 4.3 Open the full-screen add-court form on mobile, focus the address field, and confirm the visible layout adjusts sensibly for the on-screen keyboard instead of being covered or clipped — **partially verified**: `interactive-widget=resizes-content` confirmed present in `frontend/index.html`'s viewport meta; real on-screen-keyboard resize behavior not reproducible in this sandboxed environment
- [x] 4.4 Confirm the bottom sheet (card/list) and its safe-area content padding are visually unchanged from before this change — confirmed via computed style: `.bottom-sheet__content` padding-bottom `24px` (`calc(24px + env(safe-area-inset-bottom))` with 0 inset here), matches source, untouched by this change
- [x] 4.5 Confirm no permanently docked full-width bottom bar was introduced or already exists — only the FAB (floating) and the on-demand sheet remain at the bottom — confirmed visually (mobile screenshot): FAB and "Список" are floating pills, not full-width; list sheet opens on demand at peek height, no permanent bottom bar
