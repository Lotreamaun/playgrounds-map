## MODIFIED Requirements

### Requirement: Map remains a full-screen canvas behind sheets on mobile
На мобильном карта SHALL оставаться полноэкранной постоянной подложкой. Вторичный UI (компактный верхний бар, кнопка добавления FAB, шторки, модалка формы) SHALL накладываться поверх карты, не заменяя её отдельной страницей.

#### Scenario: Map persists behind the top bar and FAB
- **WHEN** пользователь работает на мобильном
- **THEN** поверх карты отображаются компактный верхний бар и кнопка добавления (FAB), а карта остаётся полноэкранной под ними

#### Scenario: Map stays interactive when a sheet is closed
- **WHEN** пользователь закрывает шторку или модалку
- **THEN** карта вновь на весь экран и принимает касания без перезагрузки
