## Context

`CourtCard` (`frontend/src/components/CourtMarker.tsx:14-84`) renders `<h3>{name}</h3>`, three separate `<p>` elements for address/surface/condition (with bold inline labels, e.g. `<strong>Покрытие:</strong> {translateSurface(...)}`), and a photo button — no sport indicator, no action button. It's rendered identically in both hosts (`side-panel__content`, `bottom-sheet__content` in `App.tsx`), with host-specific CSS only for the photo bleed. `frontend/src/utils/labels.ts` already has the `SURFACE_LABELS`/`CONDITION_LABELS` → `translateSurface`/`translateCondition` pattern this change extends for sport names. `CourtMarker` (same file) already has `SPORT_ICONS: Record<string, Icon>` (currently only `basketball: Basketball`, rest fall back to `MapPin`) and `SPORT_PIN_MODIFIERS` — both reusable as-is for the card's sport chip.

## Goals / Non-Goals

**Goals:**
- Reuse existing sport-icon/color infrastructure (`SPORT_ICONS`, `DEFAULT_SPORT_ICON`, `--sport-*` CSS vars, `.court-marker__pin--default` neutral-color fallback pattern) rather than building a second mapping for the card.
- Land the route button as a plain link (`<a>`), not a click-handler-driven `window.open`, so it works without JS obstruction and behaves like a normal external link (right-click → open in new tab, etc.).

**Non-Goals:**
- No new sport→icon mappings beyond what `CourtMarker` already has — football/hockey/tennis keep showing `MapPin` in the card's chip too, same partial coverage as the marker today.
- No in-app routing/directions UI — "Построить маршрут" hands off to Yandex Maps entirely; no distance/ETA shown in-app.
- No change to `.court-card`'s own elevation (still no border/shadow of its own) — reconfirms `surface-components-restyle`'s decision, unaffected by this change.

## Decisions

### 1. Sport label dictionary mirrors `SURFACE_LABELS`/`CONDITION_LABELS`

Add `SPORT_LABELS: Record<string, string>` + `translateSport(value: string): string` to `frontend/src/utils/labels.ts`, keyed by the same `sport_type` values `SPORT_PIN_MODIFIERS` already lists (`basketball`, `football`, `hockey`, `tennis`), falling back to the raw value like the other two translators — same graceful-degradation shape, no new pattern.

### 2. Meta line is plain string interpolation, not a new formatting utility

`` `${address} · ${translateSurface(court.surface)} · ${translateCondition(court.condition)}` `` — `surface`/`condition` are non-optional `string` on the `Court` type (confirmed in `services/api.ts`), so no conditional-join logic is needed; only `address` has the existing null fallback (`'Адрес не указан'`), already handled by the current code's `address` variable.

### 3. Route link target: Yandex Maps `rtext` route-building URL

```tsx
<a
  className="btn btn-secondary"
  href={`https://yandex.ru/maps/?rtext=~${court.latitude},${court.longitude}`}
  target="_blank"
  rel="noopener noreferrer"
>
  Построить маршрут
</a>
```
The leading `~` before the single `lat,lon` pair is Yandex Maps' documented shorthand for "route starts from the user's current location" (no origin point needed from us). **Not verified against Yandex's current URL-API reference in this session** — confirm the exact query parameter and `~` semantics against Yandex Maps' own documentation before shipping (task 1 below), since it's the one piece of this change that isn't just restyling existing markup.

Alternative considered: `https://yandex.ru/maps/?whatshere[point]=...` (drops a pin, doesn't start routing) — rejected, doesn't match "Построить маршрут" (build a route), only shows the location.

### 4. Sport indicator reuses `.sport-chip` naming from the UI kit, not a new component

`docs/courtmap-ui-kit.html` already names this pattern `.sport-chip` (dot + text) in its markup; add the Phosphor icon inside the same element (design-system.md §7 calls for the icon in the card too, beyond what the kit's plain dot-only mockup shows — the `.md` takes priority per this repo's established convention: design-system.md overrides the kit on a conflict). Implemented as inline JSX in `CourtCard`, not a shared component — matches the project's established non-goal (no new component abstractions for small styled elements, see `surface-components-restyle`/`map-navigation-restyle` design docs).

## Risks / Trade-offs

- **[Risk] Yandex Maps route URL syntax is asserted from memory, not verified against current docs** → task 1 verifies it manually (open the constructed URL, confirm it starts routing to the right point) before the task list's other work depends on it; low blast radius since it's an isolated `href`, easy to fix without touching anything else if the syntax turns out stale.
- **[Risk] `translateSport` duplicates three tiny dictionaries' worth of pattern (surface, condition, sport) inside one file** → acceptable, same trade-off the file already made twice; a shared "translate via dictionary with fallback" helper would be a bigger refactor than this change's scope justifies.
