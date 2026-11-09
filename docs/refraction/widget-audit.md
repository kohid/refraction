# Widget audit (0.62.0)

A pass over every widget. It renders them all with test values and looks for settings that do nothing and for render problems, then fills the clearest style gaps.

## How it was checked

1. `node scripts/audit-widgets-editor.mjs PORT SITE out.json` opens the editor and reads every widget's controls. It keeps the color settings that apply with the default content: visible by their conditions, and not hover, active, open or current states.
2. `node scripts/audit-widgets-render.mjs PORT SITE out.json results.json` renders 84 widgets (desktop and phone). Each of the 480 color settings gets a color of its own, and the script reports any color that appears nowhere in the widget's computed styles (including `::before`/`::after`). It also reports widgets that render nothing, phone overflow, JavaScript errors and PHP notices.

Skipped:
- the form builder's field widgets (they need a form);
- the WordPress sidebar widgets;
- third-party embeds (Facebook, Google Maps);
- floating-element-only widgets.

## Findings

- **No setting found that does nothing** beyond the tooltip background fixed in 0.61.1. Every color reported missing styles a part that the default content leaves out. Examples: tooltip colors while the description is not a tooltip, button colors with no button text, events widgets with no events, a table of contents with no headings, a blockquote with no author title, Post Info icons with no items.
- **Widgets that print nothing by default**, and correctly so: galleries without images, Lottie without a file, the post widgets outside a post.
- **No JavaScript errors or PHP notices.**
- **Fixed: Phone Showcase on phones.** The glow behind the device (35% beyond it) and floating cards near the device's edge pushed the page sideways. On phones the cards now stay inside the device (centred between 35% and 65%, at most 70% wide), and `.rf-showcase` clips sideways (`overflow-x: clip`, no scroll box).
- **Fixed: Loop Carousel Dots Color.** It painted the current dot too, which made it impossible to see the current slide. It now applies to `:not(.swiper-pagination-bullet-active)`, and the current dot has its own color.

## Style added

- **Nested Carousel**:
  - Arrows: hover color and background, icon size, corners, border, shadow, distance from the edge (side-by-side layout).
  - Pagination: current bullet width (a pill), space between bullets, distance from the slides, fraction typography and color, progress bar height.
- **Loop Carousel** (it had two colors only):
  - Arrows: background, hover colors, button and icon size, corners, distance from the edge.
  - Dots: current dot color, size, current dot width, space, distance from the slides.
- **Share Buttons**: Primary and Secondary hover colors (custom color mode).

`node scripts/check-widget-styles.mjs PORT SITE` checks the Nested Carousel arrows and bullets, the Share Buttons hover color, and the Phone Showcase cards and page width on a phone.

## Gaps left

Most widgets without their own padding, border, background or shadow for the whole widget get them from the Advanced tab, which every widget has. Smaller ideas not done yet:

- hover colors on the legacy Accordion and Toggle titles;
- a card hover lift for Posts and Archive Posts;
- styles for the Video Playlist list.
