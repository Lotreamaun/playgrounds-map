## Context

Every clickable action in `index.css` currently has its own bespoke rule: `.court-form__actions button` (submit, radius 4px), `.court-form__actions button[type='button']` (cancel — solid `var(--border)` fill, same visual weight as submit), `.side-panel__add-btn` (radius 6px), `.court-list__sort-toggle` (radius 6px), `.fab`/`.fab--cancel` (radius 30px), `.court-form__loc-fallback button` (radius 4px). None share a base rule. No `input`/`select` in the app has a `:focus` style at all. `.court-form__message` (used for duplicate-409, missing-fields, and submit-failure) and `.court-form__loc-fallback` (geolocation unavailable — not an error) both currently render identically: `background: var(--accent-bg); border: 1px solid var(--accent-border);` — this also conflicts with `design-tokens-foundation`'s own accent-role rule (`--accent`/`--accent-bg` reserved for interactive elements, not informational boxes), so today's styling is already inconsistent with the tokens this change builds on.

Comparing `docs/courtmap-ui-kit.html`'s actual CSS (not just the prose in `courtmap-design-system.md`) for the desktop sidebar vs. the mobile sheet is informative: the kit's `.sidebar` uses `background: var(--bg)` + a plain `border-right` (docked column, not elevated), while `.sheet` (bottom sheet) uses `background: var(--surface)` + `box-shadow: var(--sh-2)` (floating element, elevation level 2) and `.list-row` uses `background: var(--surface)` + `box-shadow: var(--sh-1)` (elevation level 1). The standalone `.card` demo in the kit also carries its own border/shadow, but every *screen* mockup (sidebar row, sheet card, sheet form) renders the card's content flush inside its host container, with no second nested box — matching this project's current `.court-card` (it has no background/border/shadow rule of its own today; it relies on whatever hosts it).

This change depends on `design-tokens-foundation` (`--surface`, `--shadow-1`/`--shadow-2`, `--radius-*`, `--accent-focus`, `--feedback-error*`, `.glass-over-map`) and `map-chrome-and-markers`'s marker work does not overlap it.

## Goals / Non-Goals

**Goals:**
- One shared `.btn`/`.btn-primary`/`.btn-secondary` base every button-like control composes into, instead of N bespoke rules.
- Visible focus state on every form input.
- Error messages distinguishable from neutral/informational ones.
- Side panel reads as a docked column (flat, bg-matched); bottom sheet and list rows read as elevated surfaces (`--surface` + shadow), matching the kit's actual CSS, not just the prose table.
- FAB and mobile top bar read as floating glass over the map.

**Non-Goals:**
- No new React abstraction (no `<Button>` component) — this codebase styles plain HTML elements by CSS class throughout; introducing a component wrapper here would be an unrelated architectural change.
- No `.court-card` own border/shadow — it stays flush inside its host (side panel / bottom sheet), matching every screen mockup in the kit (only the kit's isolated component demo boxes it, not its embedded usage).
- No `has_lighting` field wired into `CourtForm` — confirmed with the user: the `.toggle` style is added as an unused library component only.
- No popover-over-marker restyle — that component doesn't exist in the current architecture (card opens straight into the sheet/panel).

## Decisions

### 1. Shared `.btn` base, composed via multiple classNames rather than duplicated per component

```css
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 44px; padding: 0 20px; border: none; border-radius: var(--radius-sm);
  font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
  transition: background var(--motion-instant) ease-out, transform var(--motion-instant) ease-out; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-hover); }
.btn-primary:active { transform: scale(0.97); }
.btn-secondary { background: transparent; color: var(--text-primary); border: 1px solid var(--border); }
.btn:disabled { opacity: 0.6; cursor: default; }
```

Components that need a different shape (pill radius on `.fab`, `.court-list__sort-toggle`) keep their existing class name for position/size/radius, and add `btn btn-primary` alongside it in JSX (e.g. `className="btn btn-primary fab"`) so color/hover/active/disabled come from the shared rule instead of being redeclared. This avoids both a new component abstraction and duplicated CSS.

### 2. `--surface` applies to elevated containers only, not to the side panel

Per the kit's actual CSS (not the elevation table's prose, which is more general): `.side-panel` stays on `--bg` + gains a plain `border-right: 1px solid var(--border)` (its current `box-shadow: var(--shadow)` is dropped — a docked column does not float, so it should not cast a shadow). `.bottom-sheet` and `.court-list__row` switch from `--bg`/`--shadow` (legacy) to `--surface`/`--shadow-2` and `--surface`/`--shadow-1` respectively, since both are floating/elevated relative to what's behind them (map, or the panel's own background).

### 3. Error vs. neutral message split

`.court-form__message` (duplicate/validation/submit-failure — always an error today, there is no success message path since success just closes the form) switches to `border-left: 3px solid var(--feedback-error); background: var(--feedback-error-bg);` — the left-bar treatment from the design system's Alert spec, not the current centered box-border. `.court-form__loc-fallback` switches to plain `--surface`/`--border` (neutral card), dropping `--accent-bg`/`--accent-border` entirely — it is not an error and, per `design-tokens-foundation`, `--accent*` is reserved for interactive elements.

### 4. Focus ring reuses `--accent-focus` from the tokens change

```css
.court-form input:focus, .court-form select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-focus);
}
```

### 5. `.toggle` is added as an inert library style, not wired anywhere

Matches the design system's spec (`off` → `--border` fill, `on` → `--accent` fill, animated knob) as plain CSS with no React usage yet — confirmed with the user this change stays visual-only, no `has_lighting` UI.

## Risks / Trade-offs

- **[Риск] Много точек касания в `.tsx` (className на 6+ элементов в 3 файлах)** → каждое изменение — чисто косметическое (замена/добавление className), без изменения логики компонентов; проверяется визуально в задачах верификации.
- **[Риск] Убираем `box-shadow` у `.side-panel`, а не заменяем его на `--shadow-1`/`--shadow-2`** → осознанное решение по референсу UI-kit (docked column, не floating-поверхность); если впоследствии окажется, что панель визуально "сливается" с картой без тени, добавление тонкой тени — тривиальный follow-up, не требующий новой спеки.
