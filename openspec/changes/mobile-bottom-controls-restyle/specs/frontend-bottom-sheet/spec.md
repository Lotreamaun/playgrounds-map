## REMOVED Requirements

### Requirement: Floating mobile controls use a translucent glass surface

**Reason**: FAB and search-pill are switching from a translucent glass surface to opaque surfaces ahead of a later, separate full visual redesign of this area. Glass no longer applies to either control.

**Migration**: See the new "Floating mobile controls use opaque surfaces matching existing app card styles" requirement below for the replacement behavior.

Плавающие элементы управления, размещённые поверх карты на мобильном (кнопка добавления FAB, поиск-pill), SHALL отображаться с полупрозрачной поверхностью с блюром, а не сплошной непрозрачной заливкой — чтобы читаться как парящие над картой, а не как отдельная непрозрачная панель. Верхнего бара больше нет (см. `frontend-mapping`); стекло не распространяется на zoom/геолокацию — они непрозрачные (см. `frontend-mapping`).

#### Scenario: FAB floats with a glass surface
- **WHEN** пользователь видит кнопку добавления (FAB) на мобильном
- **THEN** она отображается полупрозрачной с блюром, карта частично просматривается сквозь неё

#### Scenario: Top bar floats with a glass surface
- **WHEN** пользователь смотрит на экран карты на мобильном
- **THEN** отдельного верхнего бара с этой стеклянной кнопкой больше нет — точка входа в список и стеклянное оформление перенесены на поиск-pill (см. требование «Search-pill is the entry point for opening the court list on mobile» ниже)

#### Scenario: Search-pill floats with a glass surface
- **WHEN** пользователь видит поиск-pill на мобильном
- **THEN** он отображается полупрозрачным с блюром, карта частично просматривается сквозь него

## ADDED Requirements

### Requirement: Floating mobile controls use opaque surfaces matching existing app card styles

Плавающие элементы управления, размещённые поверх карты на мобильном (кнопка добавления FAB, поиск-pill), SHALL отображаться непрозрачной поверхностью без блюра и прозрачности, переиспользуя уже существующие в приложении токены стиля, а не собственную стеклянную заливку. Поиск-pill SHALL использовать те же токены, что и карточка площадки в списке (`.court-list__row`): фон `var(--surface)`, граница 1px `var(--border)`, тень `var(--shadow-1)`, цвет текста `var(--text-h)` — сохраняя при этом форму капсулы (`border-radius: var(--radius-pill)`); меняется только поверхность, не форма. Кнопка добавления (FAB) SHALL использовать то же непрозрачное оформление уровня элевации 2, что и элементы управления картой: `var(--surface)` + `var(--shadow-2)`, без блюра и полупрозрачной границы.

#### Scenario: FAB is opaque, matching the map controls' elevation
- **WHEN** пользователь видит кнопку добавления (FAB) на мобильном
- **THEN** она отображается непрозрачной поверхностью (`var(--surface)` + `var(--shadow-2)`), без блюра и прозрачности, карта под ней не просматривается

#### Scenario: Search-pill is opaque, matching the court-list card style
- **WHEN** пользователь видит поиск-pill на мобильном
- **THEN** он отображается непрозрачной поверхностью с теми же токенами, что и карточка площадки в списке (`var(--surface)`, граница `var(--border)`, тень `var(--shadow-1)`), сохраняя форму капсулы, без блюра и прозрачности

### Requirement: Search-pill is centered with equal margins, and the FAB stacks above it

Поиск-pill на мобильном SHALL располагаться по горизонтальному центру экрана с одинаковыми отступами слева, справа и снизу (`var(--space-4)`/16px от границ безопасной области, включая `env(safe-area-inset-bottom)` снизу), вместо растягивания от фиксированного левого края с местом под FAB справа. Кнопка добавления (FAB) SHALL располагаться непосредственно над поиск-pill, по той же горизонтальной оси центрирования, а не сбоку от него в одном ряду.

#### Scenario: Search-pill has equal left, right, and bottom margins
- **WHEN** пользователь видит поиск-pill на мобильном
- **THEN** он центрирован по горизонтали, а отступы слева, справа и снизу от него равны

#### Scenario: FAB sits directly above the centered search-pill
- **WHEN** пользователь видит кнопку добавления (FAB) на мобильном
- **THEN** она расположена по центру непосредственно над поиск-pill, а не рядом с ним
