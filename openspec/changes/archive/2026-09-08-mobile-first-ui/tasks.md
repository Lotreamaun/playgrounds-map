## 1. BottomSheet component

- [x] 1.1 Create `frontend/src/components/BottomSheet.tsx` — container with slide-up animation, drag handle, rounded top, background overlay, safe-area handling.
- [x] 1.2 Implement drag gesture (touch + pointer) with `translateY`, expand/peek/dismiss thresholds, and tap-outside-to-dismiss.
- [x] 1.3 Add `modal` variant (full-height `100dvh`, no drag-out, closes via internal action) for the add-court form.
- [x] 1.4 Add mobile CSS for the sheet: media query block, `env(safe-area-inset-*)`, overlay, handle, transitions.

## 2. Court card in bottom sheet

- [x] 2.1 Move `CourtCard` content out of the marker-anchored popup to render inside `BottomSheet` (keep photo lightbox logic).
- [x] 2.2 Wire marker tap to open the card sheet; keep selected marker highlight.
- [x] 2.3 Verify card adapts to sheet width on mobile (address, surface, condition, photo).

## 3. List in bottom sheet

- [x] 3.1 Render `CourtList` inside the bottom sheet instead of a separate full-screen page.
- [x] 3.2 Keep "sort by proximity" toggle and list rows working inside the sheet.
- [x] 3.3 Wire row tap to center the court on the map and show its card, keeping map as the canvas.

## 4. Add-court form as full-screen modal

- [x] 4.1 Render `CourtForm` inside the `BottomSheet` `modal` variant (full-height).
- [x] 4.2 Ensure map click (in add mode) still sets coordinates and address autosuggest works in the modal.
- [x] 4.3 Keep submit, duplicate (409), and cancel behaviors; close modal on success/cancel.

## 5. App state restructure (remove view swap)

- [x] 5.1 Remove `view: 'map'|'list'` full-page swap from `App.tsx`; keep `MapView` mounted as the persistent canvas.
- [x] 5.2 Introduce sheet state (`none | card | list`) and `addFormOpen`; drive card/list/form from it.
- [x] 5.3 Add FAB ("+ Добавить") and compact top bar (list entry / locate) over the map for mobile.
- [x] 5.4 Add mobile CSS for FAB, top bar, and touch/thumb-reach sizing (min 44px targets, safe-area).

## 6. Russian localization

- [x] 6.1 Translate `CourtForm` strings ("Add a court", "Cancel", "Surface", "Condition", "Adding…", messages, placeholders).
- [x] 6.2 Translate court card and marker strings ("Surface:", "Condition:", "Court #N", "Адрес не указан" consistency).
- [x] 6.3 Translate FAB, top bar, and any remaining visible app strings to Russian.

## 7. Verification

- [x] 7.1 Verify mobile layout at ≤767px (sheet, modal, FAB, top bar, safe-area) on a phone-sized viewport.
- [x] 7.2 Verify no desktop/tablet regression at ≥768px (map, list page, card popup, form panel unchanged where not isolated).
- [x] 7.3 Run `npm run lint` and `npm run build` in `frontend/`.
