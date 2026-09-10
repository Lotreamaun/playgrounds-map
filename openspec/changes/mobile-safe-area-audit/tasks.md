## 1. Stable viewport height

- [ ] 1.1 In `frontend/src/index.css`, remove the `#root { min-height: 100dvh; }` override inside the `@media (max-width: 767px)` block (the base `:root`/`#root` rule already sets `100svh` — let it apply on mobile too)
- [ ] 1.2 Remove the `.map-view { height: 100dvh; }` override in the same mobile `@media` block for the same reason (base rule already sets `100svh`)
- [ ] 1.3 Confirm `.bottom-sheet--modal { height: 100dvh; max-height: 100dvh; }` is left untouched in both the base and mobile blocks — this is the deliberate keyboard-aware exception, not part of this fix

## 2. FAB safe-area buffer

- [ ] 2.1 In `frontend/src/index.css`, change `.fab`'s `bottom: calc(env(safe-area-inset-bottom) + 24px);` to `bottom: calc(env(safe-area-inset-bottom, 0px) + 24px + 16px);`

## 3. Keyboard-aware viewport meta

- [ ] 3.1 In `frontend/index.html`, add `interactive-widget=resizes-content` to the `<meta name="viewport">` content attribute (alongside the existing `width=device-width, initial-scale=1.0`)

## 4. Verification

- [ ] 4.1 On a mobile viewport (devtools device emulation or a real device), scroll the page and confirm the map/root container height does not visibly jump when the browser's address bar collapses/expands
- [ ] 4.2 Confirm the FAB stays fully tappable and clear of the browser's own bottom chrome when it is expanded (not just when collapsed)
- [ ] 4.3 Open the full-screen add-court form on mobile, focus the address field, and confirm the visible layout adjusts sensibly for the on-screen keyboard instead of being covered or clipped
- [ ] 4.4 Confirm the bottom sheet (card/list) and its safe-area content padding are visually unchanged from before this change
- [ ] 4.5 Confirm no permanently docked full-width bottom bar was introduced or already exists — only the FAB (floating) and the on-demand sheet remain at the bottom
