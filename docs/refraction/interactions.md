# Interactions (0.47.0)

Module `modules/interactions`: motion that answers the visitor. Background and choices: [motion-research.md](motion-research.md).

## Marquee widget (`refraction-marquee`)

- Content > **Items** (text, icon or image, each with a link; text can be **Outlined**; icons and images get a name
  for screen readers), **Between Items** (an icon, a character or word, or nothing).
- Content > **Motion**: Runs Towards (left or right), Speed (px/s), Rows (one, or two running opposite ways), With The
  Scroll (steady, speeds up, or speeds up and turns with the scroll direction), Pause On Hover (also on keyboard
  focus), Tilt (responsive, makes a slanted ribbon), Fade The Edges and its width.
- Style: band background (and the second row's), padding, space between items and rows; typography, color, link hover
  color, outline width; icon size, separator color, Turn The Separator; image height, corners, Gray Until Hovered.
- Markup: `.rf-marquee[data-rf-marquee]` > `.rf-marquee__row[data-dir]` > `.rf-marquee__track` > `.rf-marquee__group`.
  The second row is `aria-hidden` and `inert`.
- `marquee.js` copies the group until the track is twice the row's width (copies `aria-hidden`, `inert`), sets
  `--rf-mq-shift` (minus one group's width) and `--rf-mq-time` (width / speed), and adds `is-running`; the CSS
  animation then loops without a seam. Scroll response: the animation's `playbackRate` (up to 7x, negative for
  "follow" while scrolling up), eased back each frame. Paused off screen (IntersectionObserver) and on hover. Laid out
  again on resize and when web fonts arrive. Reduced motion: no copies, no animation, the items wrap.
- A page with a marquee gets `body { overflow-x: clip }`, so a tilted band never scrolls the page sideways.

## Site Settings > Motion & Cursor (`settings-interactions` kit tab)

- **Site Cursor**: dot and trailing ring, ring, dot, or an inverting disc (`mix-blend-mode: difference`); Color, Ring
  Size, Follow Speed (the ring's easing; 1 = no trail), Grow Over Links And Buttons, Hide The Usual Cursor (text
  fields keep theirs). Only for a mouse or trackpad (`(hover: hover) and (pointer: fine)`), only on the site.
- **Page Transitions**: cross-fade, rise in, wipe up, step back, with a duration. Printed as CSS in the head
  (`#rf-page-transition`): `@view-transition { navigation: auto }` plus keyframes on `::view-transition-old/new(root)`.
  Browsers without cross-document view transitions change page as usual; off for reduced motion.

## Advanced > Interactions (every element)

- **Magnetic** with Pull (share of the distance to the pointer) and Reach Beyond Its Edges (px): `data-rf-magnetic`;
  `interactions.js` sets `--rf-mag-x/y` and the CSS moves the element's inside with `translate` (the wrapper keeps
  `transform` for entrance animations and `translate` for Scrolling Effects).
- **Cursor Word** (`data-rf-cursor-label`): with the site cursor on, the ring becomes a filled disc with the word.
- **No Site Cursor Here** (`data-rf-cursor-hide`): the site cursor fades out and the usual cursor comes back.

## Reveal additions

Effects **Wipe up / down / from the right / from the left** (`clip-path: inset()` driven by `--rf-rv-p`) and **Light up
from faint** (`opacity` from 0.18 to 1, in place). They are in the whole-element, text and children lists.

## Files

`module.php`, `classes/pure-interaction-settings.php` (clamping, the transition CSS), `classes/kit-tab.php`,
`widgets/marquee.php`, `assets/js/marquee.js`, `assets/js/interactions.js`, `assets/scss/frontend.scss`.

Tests: `php scripts/test-interactions.php`; browser: `node scripts/check-interactions.mjs --site DIR --port N`.
