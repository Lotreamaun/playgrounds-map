## ADDED Requirements

### Requirement: Map extends to the full screen on devices with notches and home indicators
На мобильных устройствах с вырезом (челкой) или домашним индикатором страница SHALL использовать `viewport-fit=cover`, чтобы карта и наложенные элементы расширялись на весь экран, включая зону выреза и домашнего индикатора, а не инсетились браузером. Safe-area insets SHALL применяться к оверлеям (поиск, контролы, шторки), чтобы контент не перекрывался системными элементами.

#### Scenario: Map reaches screen edges on a notched device
- **WHEN** пользователь открывает приложение на мобильном устройстве с вырезом или домашним индикатором
- **THEN** карта занимает весь экран, включая зону выреза и домашнего индикатора, без полос по краям

#### Scenario: Safe-area insets are non-zero and applied
- **WHEN** страница загружена с `viewport-fit=cover` на устройстве с вырезом
- **THEN** `env(safe-area-inset-top)` и `env(safe-area-inset-bottom)` возвращают ненулевые значения, и оверлеи учитывают их в своих отступах
