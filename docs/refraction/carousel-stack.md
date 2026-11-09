# Nested Carousel: Stack effect (0.57.0)

Effect **Stack (cards open in place)** on the Nested Carousel. One card is open; the cards around it show as bars above and below. A bar shows the top strip of its card, so put each card's title row at its top. On each step the next bar grows into the open card, the open card shrinks into a bar on the other side, the bar at the far end fades out, and a new bar fades in. The reference was a "widgets in motion" card stack.

## Settings (Content > Carousel, with Effect: Stack)

- **Next Card Comes From**: Above (the default, as in the reference) or Below.
- **Bars On Each Side**: 0 to 3. Bars further away are narrower (8% less each) and dimmer.
- **Bar Height** (56px), **Bar Width** (90% of the open card), **Space Between Cards** (10px), **Bar Opacity**.
- **Minimum Height**: the stack stays centred in it, so the page below doesn't move when cards of different heights open.
- These also apply: **Transition speed**, **Loop** (round and round; without it the ends stop and the arrow at an end is off), **Autoplay** with **Time per slide**, **Pause on hover** and the pause button, **Arrows** (under the stack: up and down either side of the dots), **Pagination** (dots, fraction or progress).

## Use

- Click a bar to open its card. The arrows, the dots and the arrow keys work too (Up opens the card above).
- Bars are `inert` and `aria-hidden`: they're out of the keyboard order, and screen readers only see the open card. Focus inside the carousel pauses autoplay. With reduced motion there's no autoplay and the changes are instant.

## How it works

- No Swiper. `buildStack()` in `modules/nested-carousel/assets/js/frontend/handlers/nested-carousel.js` places the slides in one column (`order`) by `stackRoles()`: the signed distance from the open card, the shorter way round with a loop. It mirrors `Carousel_Logic::stack_roles()` in PHP, which is tested in `scripts/test-nested.php`.
- Classes: `is-stack-open`, `is-stack-bar`, `is-stack-far`, `is-stack-hidden` on the slides; `is-stack`, `is-stack-ready` and `is-flow-top` / `is-flow-bottom` on `.refraction-nc`. Styles are in `modules/nested-carousel/assets/scss/frontend.scss`.
- The open card's height is measured and animated from the bar height to its own height (and back when it closes), so it animates in every browser. A card coming round from the far end grows in place instead of crossing the stack.
- In the editor, choosing a slide in the panel opens it.

## Check

`node scripts/check-carousel-stack.mjs --site DIR --port N` checks:

- The layout: open card, bar above, bar below, bar width, inert.
- Clicking a bar, the arrow, a dot and the arrow keys, round the loop.
- From below with two bars and no loop (far bar, ends, fraction).
- Autoplay and pause.
- A phone.
- The editor.

`scripts/check-nested.mjs --only carousel` still passes for the slide and fade effects.
