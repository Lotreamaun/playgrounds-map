## 1. Prerequisite

- [ ] 1.1 Confirm `design-tokens-foundation` is applied — `--sport-basketball`/`--sport-football`/`--sport-hockey`/`--sport-tennis`, `--text-secondary`, and `.glass-over-map` exist in `frontend/src/index.css`. Stop and apply that change first if not.

## 2. Marker color by sport

- [ ] 2.1 Add `.court-marker__pin--basketball { background: var(--sport-basketball); }` (and one rule per other sport token added by `design-tokens-foundation`) to `index.css`
- [ ] 2.2 Add `.court-marker__pin--default { background: var(--text-secondary); }` for unmapped sports
- [ ] 2.3 In `CourtMarker.tsx`, compute the modifier class from `court.sport_type` (fall back to `--default`) and append it to the existing `court-marker__pin`/`--selected` className string
- [ ] 2.4 Remove the current `background: var(--accent)` declaration from the base `.court-marker__pin` rule (now fully driven by the sport modifier)

## 3. Phosphor icons on markers

- [ ] 3.1 Add `@phosphor-icons/react` to `frontend/package.json` and install
- [ ] 3.2 Replace the `SPORT_ICONS: Record<string, string>` emoji lookup in `CourtMarker.tsx` with a `Record<string, Icon>` of Phosphor components (`Basketball` for `basketball`), default `MapPin`
- [ ] 3.3 Render the looked-up icon inside `.court-marker__pin` with `weight={isSelected ? 'duotone' : 'regular'}`, fixed `color="#fff"`, sized to fit the existing 24px pin
- [ ] 3.4 Remove the now-unused `DEFAULT_SPORT_ICON` emoji constant and the `sportIcon()` string helper

## 4. Map tile theme sync

- [ ] 4.1 In `MapView.tsx`, compute `const isDark = useMediaQuery('(prefers-color-scheme: dark)')`
- [ ] 4.2 Pass `theme={isDark ? 'dark' : 'light'}` to `<YMapDefaultSchemeLayer />`

## 5. Glass surface on native map controls

- [ ] 5.1 Open the running app in devtools and inspect the rendered zoom/geolocation control DOM to identify whether a wrapper element (outside `.ymaps3--zoom-control__in/__out`/`.ymaps3--geolocation-control`) renders the visible pill/square chrome
- [ ] 5.2 If a wrapper exists: add `.glass-over-map`'s background/`backdrop-filter`/border/shadow declarations to that wrapper's selector in `index.css`, keeping the existing icon mask-color override unchanged
- [ ] 5.3 If no such wrapper exists: document that outcome in this change (append a note to `design.md`) and leave the controls on their current opaque accent fill — do not force a broken glass effect onto a 24px masked icon box

## 6. Verification

- [ ] 6.1 Manually verify each seeded court's marker fill matches its sport's categorical color (not `--accent`), with the Phosphor icon in white centered inside
- [ ] 6.2 Manually verify a court with an unmapped `sport_type` (or temporarily fake one) renders the default `MapPin` icon on the neutral fallback fill, no console error
- [ ] 6.3 Manually verify selecting a marker switches its icon to Duotone weight in addition to the existing scale-up, and reverts on deselection
- [ ] 6.4 Manually verify cluster markers are unaffected (still `--accent` fill, unchanged)
- [ ] 6.5 Toggle OS dark mode and confirm the map base layer switches to Yandex's dark tiles, matching the app's dark theme
- [ ] 6.6 Confirm zoom/geolocation controls remain themed in the app's accent color and, if task 5 found a wrapper, now show the glass blur treatment; otherwise confirm they are unchanged and not visually broken
