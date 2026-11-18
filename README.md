# FiltersUI

Free filter cards for search pages. Play with one live, then copy the code or a ready prompt for Claude Code, Cursor, v0 or Lovable.

**[filtersui.com](https://filtersui.com)**

<a href="https://filtersui.com">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset=".github/readme/cover-light.png">
    <img src=".github/readme/cover-dark.png" width="100%" alt="FiltersUI filters in a grid: colour swatches, price range, sentence search, rules, body style, budget and a filter panel">
  </picture>
</a>

## What's inside

24 components, free and MIT licensed:

- **19 filters**: price range, year range, upper limit, chips, colour swatches, icon tiles, segmented choice, searchable list, bar list, cascading dropdown, date range, budget, sentence search, recent searches, rules, filter pills, applied filters, no results and all filters.
- **3 basics**: dropdown, select, buttons and links.
- **2 full sets**: every filter on one board, and a filter panel.

Most come with loading, error, empty and disabled states. All of them work with a keyboard and a screen reader, lay out right to left, and print numbers and dates in your locale. Dark by default, with a light theme.

<a href="https://filtersui.com/#filters">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset=".github/readme/more-light.png">
    <img src=".github/readme/more-dark.png" width="100%" alt="More filters: date range, recent searches, bar list, year range, no results, all filters, chips and applied filters">
  </picture>
</a>

## Use one

Open a filter on [filtersui.com](https://filtersui.com) and try it. Then take it one of three ways:

1. **Prompt**: copy a ready prompt for Claude Code, Cursor, v0 or Lovable.
2. **Code**: copy the files from the Code tab.
3. **Install** with the shadcn CLI:

   ```bash
   npx shadcn@latest add https://filtersui.com/r/range-histogram.json
   ```

Needs React 19, Tailwind CSS 4.2 or later and TypeScript.

<a href="https://filtersui.com/filters/range-histogram">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset=".github/readme/copy-light.png">
    <img src=".github/readme/copy-dark.png" width="100%" alt="The price range filter live on the left, its prompt for Claude Code on the right">
  </picture>
</a>

## The full set

All the filters on one board, with Clear all and a Show button.

<a href="https://filtersui.com/sets/cars">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset=".github/readme/set-light.png">
    <img src=".github/readme/set-dark.png" width="100%" alt="The full set: price, seats, year, body style, colour and fuel filters on one board">
  </picture>
</a>

## Fixed in 1.3.1

- **Date range**: a Clear from outside the calendar also ends a half-picked range, so the next click starts a new one and Escape no longer brings the cleared dates back. "Feb 29" typed without a year finds the last leap year.
- **Focus stays in the filter** after Clear and Clear search in all filters, after removing a name in rules, and after unticking a bar list row that is down to 0.
- **Filter pills and dropdown menus** open on the first click after being opened with the keyboard and closed with the mouse.
- **Chrome**: the page scrolls again with the pointer over the bar list, the all-filters pane or an open pill panel. They hold the scroll only when they have more to show.
- **Windows High Contrast**: sliders keep their rail, range and handles, and chosen chips, tiles, swatches, segments and presets show the system highlight.
- **Small screens**: at 320px the year, price and down payment fields stack instead of cutting their values.
- **Builds**: no unused code in budget or the dropdown example, so a Vite project's `tsc -b` passes. The code needs **Tailwind CSS 4.2 or later** (it uses `inset-s-*` and `inset-e-*`), and the docs now say so. With shadcn's `rtl` option on, filter pills' panels stay under their pill.
- **Smaller fixes**: decimal prices in sentence search ("under 30.5k"), its completion after a leading space, Budget's switch from a tiny monthly budget, right-to-left bars and full stops in no results and budget, the selected preset's fill after Retry, the searchable list's fades after Retry, and the cascading dropdown's `popular` default in its doc comment.
- **On the site**: the home page fetches an item page when you point at, focus or touch its tile, not every page as you scroll (about 7 MB less). Item pages are about a quarter smaller. Unknown addresses show a proper "Page not found" page, focus never hides under the header, and the footer fits at 320px.

## New in 1.3

- **Empty states** have a picture, one line and a way on. A search with no match offers the nearest name or "Clear search". The picture is one small file, `public/filters-ui/search.svg`, which the shadcn install saves for you.
- **Searchable list**: the counts stay where they are when the full list opens and its scrollbar appears.
- **On the site**: the notes under each filter are closed rows that open, and the chosen stage option is a filled pill.

## New in 1.2

- **Drag a number.** Under a mouse, the number fields in price range, upper limit, budget and rules show a thin handle. Drag it and the field fills like a slider.
- **Rules** shows which row or group a cross will delete before you press it, and keeps every row's controls on one top line.
- **Budget** is calmer: the picked option has no fill, and nothing that cannot be pressed is blue.
- **Price range and upper limit**: dragging a number field moves the chart's handle too, and the bars it passes rise with it.
- **No results** says what a press will do. Point at a suggestion and its count becomes "Remove" or "Apply".
- **Unavailable options** show the not-allowed cursor, and an unavailable colour shows "0 cars" under the pointer.
- **Filter panel** has a clearer head: a larger "Filters" title, with row values and both Clear links at one size.
- **Faster.** On a slow phone, filter pages answer taps about 0.2 s sooner, a tile tapped early opens up to a second sooner, and the full set keeps up with a dragged handle.

## Global styles in your project

The filters style themselves with Tailwind utilities, which live in `@layer utilities`. CSS outside any layer wins over every layer, so a global reset such as `button { padding: 8px 16px; background: #eee }` repaints the filters. Put resets like that in `@layer base`.

## Run the site

```bash
npm install
npm run dev
```

## Licence

MIT. Use it in anything, paid work included.

Designed and built by [Eugen Eşanu](https://eugenesanu.com).
