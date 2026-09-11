## 1. Verify the route link before building on it

- [ ] 1.1 Confirm the Yandex Maps route-building URL syntax (`https://yandex.ru/maps/?rtext=~{lat},{lon}` per design.md decision 3) against Yandex's current documented URL API — open the constructed URL manually and confirm it starts route-building to the right point, adjust the query format if it's stale.

## 2. `labels.ts`: sport name translation

- [ ] 2.1 Add `SPORT_LABELS: Record<string, string>` (`basketball`/`football`/`hockey`/`tennis` → Russian names) to `frontend/src/utils/labels.ts`, matching `SPORT_PIN_MODIFIERS` in `CourtMarker.tsx`.
- [ ] 2.2 Add `translateSport(value: string): string`, same fallback-to-raw-value shape as `translateSurface`/`translateCondition`.

## 3. `CourtMarker.tsx`: `CourtCard` markup

- [ ] 3.1 Add the sport indicator above the title: `--sport-*` dot (8px) + the existing `SPORT_ICONS[court.sport_type] ?? DEFAULT_SPORT_ICON` icon + `translateSport(court.sport_type)`, styled via a new `.court-card__sport-chip` class.
- [ ] 3.2 Replace `<h3>{name}</h3>` with the same element styled to H1 typography (or swap the tag if semantics call for it — keep one heading element, just restyle).
- [ ] 3.3 Replace the three separate `<p className="court-card__address/__surface/__condition">` elements with one line: `{address} · {translateSurface(court.surface)} · {translateCondition(court.condition)}`.
- [ ] 3.4 Add the route link: `<a className="btn btn-secondary" href={...} target="_blank" rel="noopener noreferrer">Построить маршрут</a>` using `court.latitude`/`court.longitude`, full width, placed after the meta line.

## 4. `index.css`: typography and new classes

- [ ] 4.1 Restyle `.court-card h3` (or whatever selector task 3.2 lands on) to H1: `font-size: 26px; font-weight: 700;` (replace the current unstyled browser default).
- [ ] 4.2 Add `.court-card__sport-chip` (flex row, gap, `margin-bottom`) and its dot element (8px circle, `background` set inline per sport color like the existing marker/list-row pattern).
- [ ] 4.3 Replace `.court-card__address`/`__surface`/`__condition` rules with one rule for the new single meta line (`--text-secondary`, 13px, matching §2.4's existing secondary-text convention used elsewhere, e.g. `court-list__row-address`).
- [ ] 4.4 Route link: confirm `.btn.btn-secondary` (from `surface-components-restyle`) renders correctly as a full-width `<a>` in both hosts (side panel and bottom sheet) — add `width: 100%; justify-content: center;` if the existing class doesn't already center/stretch on its own (it doesn't by default — `.btn` is `inline-flex`).

## 5. Verification

- [ ] 5.1 Run `npm run dev`, confirm no console/network errors.
- [ ] 5.2 Open a court card with a photo, one without — confirm both still render correctly (photo bleed unaffected) alongside the new sport chip/title/meta/route button.
- [ ] 5.3 Confirm the sport chip's color, icon, and name are correct for at least two different `sport_type` values (one with a dedicated icon, one falling back to `MapPin`/default).
- [ ] 5.4 Confirm the meta line reads correctly both with and without an address (`Адрес не указан` case) — one line, middot-joined, no orphaned separators.
- [ ] 5.5 Click "Построить маршрут" — confirm it opens a new tab with Yandex Maps route-building to the court's actual coordinates.
- [ ] 5.6 Confirm the card still looks correct in both hosts — desktop side panel and mobile bottom sheet — not just one.
- [ ] 5.7 Confirm `.court-card` still has no border/shadow of its own (flush inside its host) — this change must not reintroduce the elevation `surface-components-restyle` deliberately left out.
