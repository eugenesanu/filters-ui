# FiltersUI

Free filter components for search and browse screens: one filter per card, dark, ready to copy.

Work in progress. The first version is on its way to [filtersui.com](https://filtersui.com).

Designed and built by [Eugen Eşanu](https://eugenesanu.com).

## Global styles in your project

The filters style themselves with Tailwind utilities, which live in `@layer utilities`. CSS outside any layer wins over every layer, so a global reset such as `button { padding: 8px 16px; background: #eee }` repaints the filters. Put resets like that in `@layer base`.

## Licence

MIT. Use it in anything, paid work included.
