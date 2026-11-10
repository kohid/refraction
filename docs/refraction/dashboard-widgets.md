# Dashboard widgets: Chart, Data Table, Stat Card (0.63.0)

Module `modules/dashboard-widgets`, always on, with its own **Dashboard** category in the panel. The look is a clean admin dashboard in the spirit of Metronic 8: white cards with 0.75rem corners and a faint shadow on a pale page, a bold ink title (#181C32) over a muted subtitle (#A1A5B7), dashed lines (#E4E6EF), and badges tinted from one palette (blue #3699FF, teal #1BC5BD, violet #8950FC, amber #FFA800, rose #F64E60, dark). Only the visual direction was taken from Metronic; all code and markup are Refraction's own, and no Metronic code or assets are included. Every color and size is a Style setting.

No chart library and no outside requests: the server draws everything. Bars, grid lines, dots and labels are HTML placed in percent, so they scale without stretching text or rounded corners. Lines and areas are one SVG path (`vector-effect: non-scaling-stroke`), and pie and donut slices are SVG circles drawn by their dash.

## Chart (`refraction-chart`)

- **Card** (Content): title, subtitle, a badge with its color, or no card at all. This card is shared with the Data Table (`classes/card-controls.php`).
- **Data**:
  - *Series typed in*: labels plus a list of series (name, values, color). The labels and every series' values accept Dynamic Tags.
  - *A pasted table (CSV)*: the first row names the series and the first column holds the labels. Commas, semicolons, tabs or `|` work, so a spreadsheet paste is fine.
  - *This site*: posts of a type per month, posts per category, comments per month, users per role, or form submissions per month (2 to 24 months).
- **Chart**:
  - Type: bars, horizontal bars, line, area, pie or donut.
  - Bars: stacked series and value labels. Line and area: smooth curves (Catmull-Rom, never past the points) and points.
  - Grid, axis steps, legend (above, below, beside for pie/donut, or none), height.
  - Donut: the total in the middle with a caption. Pie and donut: your own slice colors.
  - Numbers: prefix, suffix, decimals, short numbers (1.2K, 3.4M), drawn in when shown.
- **The axis** steps in round numbers (1, 2, 2.5 or 5 times a power of ten), only whole steps when the data are counts, and shows decimals when a step needs them.
- **For screen readers**, the numbers are a table inside the figure, and the drawing is `aria-hidden`.
- **The tooltip** (`assets/js/dashboard.js`) shows every series' value for a bar group or a line's column, and a slice's value and share.

## Data Table (`refraction-data-table`)

- **Columns** (repeater): heading, then what the column shows:
  - text
  - number (prefix, suffix, decimals)
  - badge: colored by the word (Paid, Active, Done → teal; Pending, In progress → amber; Failed, Cancelled, Overdue → rose; New → violet; anything else → blue), or set to one color
  - progress bar (0 to 100)
  - date (in the site's date format)
  - link (`text | address`)

  Each column also has alignment and a bold option.
- **Rows**:
  - Typed in: one row per item, cells separated by `|`, or (0.66.1, **Type Each Row: Field per column**) one field per column in each row, named after the column's heading by the editor script `assets/js/dashboard-editor.js` (fields `cell_1`...`cell_12`; switching fills them from the line; a row with no field filled still reads its line). Every row and field accepts Dynamic Tags.
  - A pasted table, whose first row can supply the headings.
  - Cell by cell (0.66.0): one repeater item per cell, filling the columns from left to right; **Starts A New Row** begins the next row (a full row starts one by itself). Each cell has its **Content** (shown as its column says, Dynamic Tags allowed), **Small Text Under**, a **Picture** (small, round) or an **Icon** before it, a **Link**, its own **Badge Color**, **Alignment** and **Bold**, **Text Color** and **Background**, and **Spans Columns**. Style > Table adds the picture size and corners, the icon color, and the small text's color and typography.
  - This site's latest posts (title linked, author, date, comments, status).
- **Table**: sorting by clicking a heading (numbers, dates and progress sort as numbers; `aria-sort`), a search box, rows per page with a pager, the text shown when nothing matches, the heading look (muted uppercase, a tinted band, or plain), row lines (dashed, solid, striped, none), the row highlight on hover, and on phones either sideways scrolling or each row as a card with its labels.

## Stat Card (`refraction-stat-card`)

An icon on a tinted square, a label, and a big number that counts up when shown. Below it, the change as a badge: ▲ green / ▼ red, or the other way round with **Down Is Good**. A sparkline (area, line or bars) runs along the bottom. There are six colors and three layouts: icon above, icon beside, or filled with the color. The value, change, label and sparkline accept Dynamic Tags.

## Site Statistic (dynamic tag, Site group)

The number of published posts of a type, approved comments, users (of a role) or form submissions, either all time or for the last 7, 30 or 365 days. It works anywhere a text or number tag does, for example as a Stat Card's value.

## Tests

- `php scripts/test-dashboard.php`: reading numbers ("$1,250.50", "(120)", "1.234,5"), lists, pasted tables, the axis scale, number formats, line paths, shares and colors.
- `node scripts/check-dashboard.mjs --site DIR --port N` builds a whole dashboard page and checks:
  - Stat Cards: the counted value, the tag's value, the badge colors.
  - Charts: bars with the axis and tooltip, a donut with its total, an area from the site's posts, horizontal bars from a table.
  - Data Tables: badges, sorting, search, pages, the latest posts.
  - No sideways scroll on a phone.
  - The editor: the category, Dynamic Tags on the values, the tag listed.
