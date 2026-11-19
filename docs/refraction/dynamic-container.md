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
  height at the top, middle or bottom), **Stop at each item** (scroll snap, on), **Padding** (0.121.0, per screen size,
  in either layout; in the row the left and right padding are also the scroll padding). 0.120.0's "Room at the row's
  ends" (`edge`, now hidden) still counts where it was set and Padding is not.

## Entrance (0.121.0)

- **Animation**: fade in up / down / from the right / from the left, fade, zoom in / out, come into focus (blur), flip up,
  rise and turn. **What appears**: each item then the widgets inside it, each item as a whole, or only the widgets inside
  item by item. **Time between items**, **between the widgets in an item**, **Duration**, **Distance**, **Easing** (the
  shared easings), **Play every time it comes into view**.
- `assets/js/frontend/handlers/dynamic-container.js`: when the list comes into view (IntersectionObserver) the parts get
  `rf-dc-a` and a delay (`--rf-dc-d`: item i × item gap, + widget k × inner gap); `.rf-dc.is-armed` hides them at their
  start (`--rf-dc-from`, `--rf-dc-blur`), `.is-in` brings them in. When all have appeared the classes go, so the
  containers' hover animations and the widgets' own effects work as before. Widgets with their own Reveal or entrance
  animation are left alone. Reduced motion: nothing moves.

## Items: Link and Hover Animation (0.121.0)

Every Container (so every item) has a **Hover Animation** (`hover_animation`, `prefix_class` `refraction-animation-`,
its CSS loaded with the page's assets) and its **Link** shows with the Default tag too: a container with a link and the
Default tag is drawn as `<a>` (`Container::print_html_tag()`).

## How it works

- Markup: `.rf-dc` > the item containers; CSS only (`assets/scss/frontend.scss`), no script on the site.
- The Layout setting's `selectors_dictionary` writes the grid declarations (`grid-template-columns: repeat(var(--rf-dc-cols))`)
  or the row's (`grid-auto-flow: column`, `grid-auto-columns` from `--rf-dc-show`, `overflow-x: auto`, scroll snap) in
  each screen size's media query; the other settings write custom properties. The scrollbar is hidden
  (`scrollbar-width: none`, `::-webkit-scrollbar`); the row still scrolls with a swipe, the trackpad or the keyboard.
- Edit Mode: the containers are placed straight into `.rf-dc` (`get_default_children_placeholder_selector()`), so the
  preview is the same grid or row, and the device switcher shows each screen size's layout.

## Linked containers (0.128.0)

A Link with the Default tag no longer turns the container into an `<a>` (0.121.0 did): a link may not hold another
link, so a card with its own Read more button was split by the browser into several boxes. The container keeps its
tag, gets `refraction-has-link`, and prints `<a class="refraction-container-link">` laid over it (`_global.scss`); the
links, buttons and fields inside sit above it and keep their own links. Link text for screen readers names the link
(empty: "Open"). Choosing the "a" tag still makes the container itself the link. Check:
`scripts/check-dynamic-container.mjs` (linked cards).
