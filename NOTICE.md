# Атрибуция

GreenPixel Web: © 2026 Турбориум. GNU GPL version 3: [LICENSE](LICENSE).

Автор настольной версии разрешил восстановление и попросил заменить свой прежний
бренд на «Турбориум». Интерфейс, переводы и адаптированная справка используют это имя.
Исторический дистрибутив сохранён в Git, коммит `5b381f6`.

Из дистрибутива используются значки, переводы, справка, палитры и примеры в
`reference/`. Тексты адаптированы к новому бренду. Справка описывает настольный
оригинал; готовность веб-функций отражает [матрица](docs/PARITY.md).

Сторонняя атрибуция:

- Greenfish Icon Editor Pro: © 2007–2013 Balázs Szalkai, GPL-3.0-or-later.
  Материалы в `reference/upstream/` из https://github.com/JonathanILevi/gfie-src
  использованы для проверки форматов, слоёв и цветовой модели. Заголовки лицензий
  сохранены; HSBMap и ColorSwatches содержат отдельные уведомления zlib.
- omggif: © 2014 Dean McNamee, MIT, лицензия в `src/vendor/omggif/omggif.js`.
  Добавлен ES-module export.
- OpenJPEG: BSD-2-Clause, `src/vendor/openjpeg/LICENSE`. JS-обёртка Chris Hafey:
  MIT, `reference/upstream/OPENJPEG-WRAPPER-LICENSE`. Пакет
  `@cornerstonejs/codec-openjpeg` 1.3.6, добавлен ES-module export.
- libicns: Michael Spencer и другие авторы, LGPL. RLE-исходник
  `reference/upstream/icns_rle24.c` содержит лицензионный заголовок и служит
  описанием структуры формата; JS-кодек написан отдельно.

Исходники самого GreenPixel 4.0.3.1 не восстановлены. Браузерный код — новая
реализация. EXE и DLL не поставляются и не исполняются веб-приложением.
