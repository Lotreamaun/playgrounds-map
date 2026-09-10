## Why

Фронтенд всё ещё использует дефолтную тему Vite-скаффолда (`system-ui`, фиолетовый акцент `#aa3bff`), не связанную с продуктом. Разработана дизайн-система CourtMap (`docs/courtmap-design-system.md`) и визуальный UI-kit (`docs/courtmap-ui-kit.html`): шрифт Commissioner, графитовый интерактивный акцент, отдельная категориальная палитра видов спорта, feedback-цвета форм, уровни элевации, сетка/отступы/радиусы, моушн-токены и accessibility-фолбэки (`prefers-reduced-motion`, `prefers-reduced-transparency`). Это первый из серии change'ей по внедрению дизайн-системы — токеновый фундамент, от которого зависят следующие (перекраска карты/маркеров, перестройка карточек/панелей/форм, мобильный layout).

## What Changes

- Подключить шрифт Commissioner (Google Fonts, `wght@400;500;600;700;800`) как единственное семейство интерфейса взамен `system-ui`.
- Заменить нейтральную и акцентную палитру: `--bg`, `--surface`, `--border`, `--text-secondary`, `--text-primary` (светлая/тёмная тема), графитовый `--accent`/`--accent-hover`/`--accent-focus` (`#2A2D34` светлая / `#E4E4E7` тёмная — инверсия) взамен текущего `--accent: #aa3bff` и производных `--accent-bg`/`--accent-border`.
- Добавить отдельную категориальную палитру видов спорта (`--sport-basketball`, `--sport-football`, `--sport-hockey`, `--sport-tennis`) — не смешивается с `--accent` и не используется для кнопок/фона.
- Добавить пару feedback-токенов для форм (`--feedback-error`, `--feedback-error-bg`); успех формы переиспользует `--accent`, отдельного цвета успеха не заводится.
- Добавить токены spacing (`--space-1`…`--space-9`), radius (`--radius-sm/md/lg/pill`) и motion (`--motion-instant/fast/base/spring`) по спецификации дизайн-системы.
- Формализовать 4 уровня элевации (канва / поверхность / плавающий элемент / модальное) как переиспользуемые тени/границы, включая `.glass-over-map` для элементов, парящих над картой (тонировка нейтральным графитом, `backdrop-filter: blur(14px)`, `prefers-reduced-transparency` → сплошной fallback).
- Расширить существующий `prefers-reduced-motion` fallback новыми motion-токенами (в т.ч. `--motion-spring`), сохранив уже работающее поведение для side panel/маркеров/списка.
- **Вне рамок этого изменения:** применение новых токенов к конкретным компонентам (карточка, боковая панель, маркеры, контролы карты, bottom sheet) — это последующие change'и (`map-chrome-and-markers`, `surface-components-restyle`, `mobile-safe-area-audit`). Здесь только сам набор токенов и их подключение в `index.css`; существующий код, ссылающийся на `--accent` и другие переопределяемые переменные, перекрасится автоматически без изменений разметки.

## Capabilities

### New Capabilities
- `frontend-design-tokens`: центральный набор дизайн-токенов (шрифт, цветовые роли, категориальная палитра спорта, feedback-цвета, spacing/radius/motion, уровни элевации, `.glass-over-map`, accessibility-фолбэки), подключаемый в `frontend/src/index.css` и используемый всеми остальными frontend-capability.

### Modified Capabilities
(нет — существующие требования не завязаны на конкретные цветовые значения; `frontend-mapping`'овское требование "controls match the app's accent theme" формулируется через переменную `--accent`, а не конкретное значение, и продолжает выполняться после смены палитры)

## Impact

Только frontend, только `frontend/src/index.css` (подключение шрифта, переопределение `:root`/`[data-theme="dark"]`/`@media (prefers-color-scheme: dark)` блоков, новые токены). Разметка компонентов (`.tsx`) не меняется — все текущие использования `var(--accent)` и других токенов подхватят новые значения автоматически. Нет изменений backend/API.
