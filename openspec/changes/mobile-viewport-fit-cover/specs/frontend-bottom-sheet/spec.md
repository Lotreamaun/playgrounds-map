## ADDED Requirements

### Requirement: Viewport uses cover fit so safe-area insets are available
На мобильном viewport SHALL использовать `viewport-fit=cover`, чтобы `env(safe-area-inset-*)` возвращали реальные (ненулевые на устройствах с вырезом) значения, а не `0`. Все оверлеи (поиск-pill, контролы карты, шторки, полноэкранные слои) SHALL использовать эти insets для отступов от системных элементов.

#### Scenario: Safe-area insets are available to overlays
- **WHEN** приложение загружено на мобильном устройстве с вырезом
- **THEN** `env(safe-area-inset-top)` и `env(safe-area-inset-bottom)` ненулевые, и отступы оверлеев рассчитываются с их учётом

#### Scenario: No clipping of overlays under system chrome
- **WHEN** пользователь взаимодействует с приложением на устройстве с домашним индикатором
- **THEN** плавающие элементы и содержимое шторок не перекрываются системным chrome
