# Dynamic Container

Widget **Dynamic Container** (`refraction-dynamic-container`, module `modules/dynamic-container`, 0.120.0), in the Pro
widgets category. A list of containers laid out as a grid or as a row scrolling sideways. Check:
`scripts/check-dynamic-container.mjs`.

## Items

- Every item is a container under the widget, the same as a Container, with all its settings (layout, background,
  border, and any widgets inside). A new widget starts with three (Item #1 to #3, with room and a soft outline);
  **Add Item** gives a new one like them (`new_items_like_defaults()`).
- The list in the panel (`items`, a nested repeater) names them for the panel and the Navigator.

## Layout (per screen size)

- **Layout**: *Grid* or *Row scrolling sideways*. Defaults: grid on desktop and tablets, the row on phones.
- **Columns** (grid): 3 / 2 / 1 by default.
- **Items in view** (row): 3.2 / 2.2 / 1.15 by default; a fraction lets the next item peek in. Each item is
  `(100% - (n - 1) × gap) / n` wide.
- **Space between columns** and **rows** (16px), **Item height** (all as tall as the tallest in their row, or their own
  height at the top, middle or bottom), **Stop at each item** (scroll snap, on), **Room at the row's ends** (padding and
  scroll padding at both ends of the row).

## How it works

- Markup: `.rf-dc` > the item containers; CSS only (`assets/scss/frontend.scss`), no script on the site.
- The Layout setting's `selectors_dictionary` writes the grid declarations (`grid-template-columns: repeat(var(--rf-dc-cols))`)
  or the row's (`grid-auto-flow: column`, `grid-auto-columns` from `--rf-dc-show`, `overflow-x: auto`, scroll snap) in
  each screen size's media query; the other settings write custom properties. The scrollbar is hidden
  (`scrollbar-width: none`, `::-webkit-scrollbar`); the row still scrolls with a swipe, the trackpad or the keyboard.
- Edit Mode: the containers are placed straight into `.rf-dc` (`get_default_children_placeholder_selector()`), so the
  preview is the same grid or row, and the device switcher shows each screen size's layout.
