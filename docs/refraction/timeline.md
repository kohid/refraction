# Timeline (0.139.0)

`modules/timeline`: a nested widget (like Showcase Wheel and Dynamic Container). Each entry is a container to design
freely; the widget draws the line, a marker per entry, a pointer from the entry to the line and, with the line in the
middle, a text across the line.

## Settings

- **Content > Entries**: Title (panel and Structure), Marker Text (Text markers; empty: the number), Marker Icon (Icon
  markers), Side (middle layout: alternate, left or right of the line), Text On The Other Side (middle layout).
- **Content > Line And Markers**: Layout per screen size (line on the left, in the middle with alternate sides, on the
  right; default middle, phones left), Markers (dot, icon, number, text), Numbers (1 or 01), Marker Beside The Entry
  (at the top with a distance, or in the middle; per screen size), Line Fills As The Page Scrolls, Pointer To The Line.
- **Style > Spacing**: Room For The Line (the line's column), Space Between Line And Entries, Space Between Entries,
  Padding; all per screen size, with smaller phone defaults.
- **Style > Line**: colour, filled colour, width (per screen size), style (solid, dashed, dotted), Line Reaches (first
  to last marker, or the whole height).
- **Style > Markers**: dot size, marker size, icon size (per screen size), typography; Normal / Reached colours
  (background, icon/text, ring); ring width; roundness.
- **Style > Pointer**: colour (the entries' background) and size. **Style > Text On The Other Side**: colour, typography.

## How it works

Markup: `.rf-tl > .rf-tl__line (> .rf-tl__fill) + .rf-tl__items > .rf-tl__item` (marker, pointer, other-side text,
container). Each entry is a CSS grid row; the Layout's `selectors_dictionary` writes the columns and the line's place
as custom properties for each screen size (`--rf-tl-cols`, `--rf-tl-mark-col`, `--rf-tl-line-x`, and `--rf-tl-l-*` /
`--rf-tl-r-*` for an entry left or right of the line: its column, the pointer's side and shape, the other-side text's
column and alignment), so Edit Mode shows each screen size at once. Odd entries are left of the line in the middle
layout, even ones right, unless an entry's Side says otherwise.

`assets/js/frontend/handlers/timeline.js` trims the line to the first and last markers' middles and, with the scroll
fill, sets `--rf-tl-progress` down to the middle of the screen and `.is-reached` on the entries whose marker it passed.
It measures again when the widget's size changes.

**Zigzag** is the middle layout plus `--rf-tl-zigzag: 1`: the script gives each entry a negative top margin worked out
from the entries' heights only (so drawing again gives the same), starting it at Zigzag: Next Entry Starts At (%) of the
entry before, but never over an earlier entry on its own side (it waits for it, with the space between entries) nor
level with the previous marker. Other layouts (phones) clear the margins. An entry's row takes no pointer, only its
parts do, so the entry beside it stays clickable where the rows overlap.

In the editor each entry's container goes into the slot of its place (`child_container_placeholder_selector`
`.rf-tl__item`), like Showcase Wheel's slides; adding, moving and removing entries keep each container with its row
(0.138.0).

## Check

`node scripts/check-timeline.mjs --site DIR --port N`.
