## Context

`CourtMarker.tsx` renders marker icons via a small `Record<string, string>` lookup (`SPORT_ICONS`, currently only `basketball → '🏀'`, default `'📍'`) inside a `.court-marker__pin` button styled in `index.css` with `background: var(--accent)`, a white 2px border, and `box-shadow: var(--shadow)` — the white outline/shadow and the scale-based selection highlight (`--selected` modifier) already satisfy the design system's "gало для отрыва от подложки" and highlight requirements and are **not** touched by this change.

`index.css` already recolors the Yandex zoom/geolocation icon glyphs via `mask-image` + `background-color: var(--accent) !important` on the theme package's icon elements (`.ymaps3--zoom-control__in/__out`, `.ymaps3--geolocation-control` and their `__dark` variants) — see the comment above that block explaining why (the npm theme package exposes no color custom properties). Inspecting that theme package's CSS (`@yandex/ymaps3-default-ui-theme/dist/esm/index.css`) confirms these elements ARE the 24×24 icon boxes themselves (`width: 24px; height: 24px; background: url(...) center no-repeat`) — there is no separate "button chrome" wrapper defined in this package. The rounded/grouped pill appearance visible in the running app must come from a wrapper injected by the core `ymaps3` runtime script (loaded from Yandex's CDN at runtime, not present in `node_modules`), which this project does not currently style at all.

`MapView.tsx` renders `<YMapDefaultSchemeLayer />` with no `theme` prop, so the base map tiles are always light regardless of the app's theme. A generic `useMediaQuery(query)` hook already exists (`frontend/src/hooks/useMediaQuery.ts`) and is reusable for `(prefers-color-scheme: dark)`.

This change consumes `--sport-*` tokens and the `.glass-over-map` class from `design-tokens-foundation` (must be applied first).

## Goals / Non-Goals

**Goals:**
- Marker fill communicates sport via the categorical palette instead of the app accent.
- Marker icon is a real Phosphor icon (not emoji), with a Duotone weight when selected.
- Zoom/geolocation controls read as "floating glass over the map" rather than an opaque themed square.
- Map tiles follow the app's light/dark theme.

**Non-Goals:**
- No manual light/dark toggle UI (tracked as a `design-tokens-foundation` non-goal too) — theme sync in this change only reacts to `prefers-color-scheme`, not a future `[data-theme]` override.
- No new sports beyond what `sport_type` already sends from the backend (`basketball` is the only one seen in current data) — the default-icon/color fallback path covers any future/unmapped value without a code change.
- No redesign of the marker's size, border, shadow, or scale-selection mechanics — already correct per the prior change.

## Decisions

### 1. Sport → color via a CSS modifier class, mirroring the existing `--selected` pattern

Add a `court-marker__pin--<sport_type>` modifier class (e.g. `court-marker__pin--basketball { background: var(--sport-basketball); }`) instead of inline `style={{ background: ... }}`. Matches the codebase's existing convention (`court-marker__pin--selected` is already a class modifier, not an inline style) and keeps color values out of the component. Unmapped sports get `court-marker__pin--default { background: var(--text-secondary); }` — a neutral gray, chosen because it is visually distinct from every defined sport color and from `--accent`, so an unmapped court never gets confused for an interactive/accent element.

### 2. Icon source: `@phosphor-icons/react`, looked up the same way `SPORT_ICONS` is today

Replace the `SPORT_ICONS: Record<string, string>` (emoji) lookup with a `SPORT_ICONS: Record<string, Icon>` lookup of Phosphor components (`Basketball` for `basketball`), default `MapPin`. Render with `weight={isSelected ? 'duotone' : 'regular'}` and a fixed white `color="#fff"` (not the sport color) — the icon sits on top of the already-colored pin fill (decision 1), so it needs to read against an arbitrary sport hue; white matches the existing white cluster-count digits for the same contrast reason. This is a deliberate adaptation of the design system's raw example (`<Basketball color={sportColor} />` on a plain background) to this project's colored-pin context.

### 3. Map tile theme: reuse `useMediaQuery`, no new abstraction

`MapView.tsx` computes `const isDark = useMediaQuery('(prefers-color-scheme: dark)')` and passes `theme={isDark ? 'dark' : 'light'}` to `YMapDefaultSchemeLayer`. No new hook or context needed. When a manual theme toggle ships later (out of scope here), this line is the one spot to revisit.

### 4. Control glass surface: apply `.glass-over-map`'s declarations to the same icon-box selectors already being recolored — pending a devtools check for a possible outer wrapper

The existing `background-color: var(--accent) !important` + `mask-image` technique paints color only inside the icon's own silhouette (CSS `mask` clips everything outside the shape, it does not make it "translucent" — outside the mask, the element renders nothing). A `backdrop-filter: blur()` clipped to a 12px icon glyph would be invisible, so blur cannot be added to the masked icon element itself. Two sub-cases, to be settled during implementation by inspecting the rendered DOM in devtools:
- If the visible rounded/grouped pill chrome comes from a wrapper element injected by the core Yandex runtime (most likely, since it is absent from the theme package's CSS) — apply `.glass-over-map`'s background/blur/border/shadow to that wrapper's selector once identified, and keep the existing icon mask-color override unchanged on top of it.
- If no such wrapper exists and the icon-box elements are genuinely the only rendered surface — give each icon-box element itself a solid (non-masked) glass background as a light `::before`/sized box, falling back to keeping the current opaque accent fill if a clean glass treatment isn't achievable without a wrapper (documented as a risk below, not blocking the rest of this change).

## Risks / Trade-offs

- **[Риск] Реальный селектор wrapper'а для контролов неизвестен на этапе планирования** (см. Decision 4) → не блокирует остальной scope change'а (маркеры, тема карты); если подходящего wrapper'а нет, контролы остаются в текущем непрозрачном виде, и глянцевая обработка контролов переносится в follow-up.
- **[Риск] `@phosphor-icons/react` — новая внешняя зависимость** → пакет широко используется, MIT-лицензия (уже упомянут в дизайн-системе), устанавливается один раз в `frontend/package.json`; проверить фактическое имя экспортируемой иконки (`Basketball`) при установке.
- **[Риск] Белый цвет иконки поверх некоторых цветов спорта (например, лайм `--sport-tennis: #A8C23F`) может давать более низкий контраст, чем на графитовом фоне** → все цветовые токены подобраны на одной светлоте/насыщенности (L≈45–50%) по дизайн-системе §2.3, что должно держать контраст с белым в допустимых пределах; визуально проверяется в задачах верификации.
