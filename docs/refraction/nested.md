# Off-Canvas, Mega Menu and Nested Carousel

Three container-based widgets (roadmap B3), always on. Each is a nested widget like Nested Tabs: its content is made of containers that hold any widgets. Modal is covered by the Popups module and is not part of this module.

Widget names: `refraction-off-canvas`, `refraction-mega-menu`, `refraction-nested-carousel`. Modules: `modules/off-canvas`, `modules/mega-menu`, `modules/nested-carousel` (PHP widget, editor view, frontend handler, `assets/scss/frontend.scss`). Pure option logic is in each module's `classes/*-logic.php` and tested by `php scripts/test-nested.php`.

## Off-Canvas

- One locked container is the panel content. Position: left, right, top, bottom or center. Mode: overlay, or push (left, right, top; the page is moved with a margin on `body`, nothing covers it).
- Open with the built-in button (optional), with any element via a CSS selector, or with a link to `#refraction-offcanvas:PANEL-ID` (set Panel ID). Loading a page with that hash opens the panel. `window.refractionOffCanvas.open(id) / close(id) / isOpen(id)` is available; the panel dispatches `refraction-offcanvas:open` and `:close`.
- Dialog semantics: `role="dialog"`, `aria-modal`, accessible name, closed panel is `inert` and `aria-hidden`, focus moves in on open, Tab is trapped, Escape and overlay click close (each can be switched off), focus returns to the opener. Scroll lock is counted, so stacked panels release it correctly. Reduced motion removes the animation.
- In the editor the panel is shown open, in the page flow, so its container can be edited.

## Mega Menu

- Items (repeater): title, type (link or dropdown), link, icon, CSS ID. Every item owns a container; only dropdown items print theirs, closed (`hidden`, no layout cost) until opened.
- Layout horizontal or vertical; dropdown width: menu width, full width or custom (aligned to the item); open on hover (open and close delays) or click; one dropdown open at a time; click outside, Escape and focus leaving close it.
- Keyboard: arrow keys, Home and End move between top-level items; ArrowDown (ArrowRight in the vertical layout) opens a dropdown and focuses its first control; Escape closes it and returns focus. `aria-haspopup`, `aria-expanded`, `aria-controls`, region labelled by its trigger, `aria-current="page"` on the current page link.
- Mobile: from the chosen breakpoint (stylesheet media queries, so custom breakpoints are honoured) the items sit behind a menu button as a stacked list or a slide-in panel (scrim, focus trap, scroll lock). A Mega Menu placed inside an Off-Canvas panel is always the stacked list without a button.
- In the editor the dropdown of the item selected in the panel is shown.

## Nested Carousel

- Slides (repeater) are containers on the shared Swiper. Slides per view per device, spacing per device, effect slide or fade, horizontal or vertical (set a height), speed, loop, autoplay (time, pause on hover), arrows, pagination (bullets, fraction, progress bar), accessible name.
- Accessibility: region with `aria-roledescription="carousel"`, slides are groups with "n / total" labels, slides out of view are `inert`, keyboard arrows, autoplay stops on focus and has a pause button, live region off while autoplay runs, no autoplay for reduced motion.
- Slides out of view use `content-visibility: auto` (lazy rendering by the browser).
- The Swiper is rebuilt in the editor when slides are added, removed, duplicated or moved, and is built (or re-measured) when its box first gets a size, so carousels inside tabs, dropdowns and panels work.

## Limits

- Loop rewinds to the first slide; slides are not cloned (clones would duplicate the widgets inside).
- The off-canvas layer is `position: fixed`; an ancestor with a CSS `transform` becomes its containing block. Push mode moves `body` with a margin, so fixed elements outside the panel do not move.
- Mega Menu dropdowns are positioned against the menu or the item; a dropdown wider than the viewport is capped for the custom width.
- Pop-up (Modal) behaviour comes from the Popups module; a carousel inside a popup was not tested here because that module is not in this branch (it was tested inside tabs, mega menu dropdowns and a centered Off-Canvas panel).
