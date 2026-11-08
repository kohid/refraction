# Sections that open like doors (0.50.0)

Page Settings (the cog) > **Sections Open Like Doors**, on pages, posts and landing pages (module `modules/interactions`,
script `assets/js/doors.js`, styles in `assets/scss/frontend.scss`).

## What it does

As the page scrolls down, each top-level container stays on the screen while the next one comes, then:

- **opens like a door to the left** (hinge on its left edge) or **to the right** (hinge on its right edge): it swings
  away from the viewer over one screen of scrolling, showing the next section, which waits in place behind it;
- or **sinks back**: it shrinks a little, its corners round and it darkens, while the next section slides up over it.

**As The Page Scrolls Down**: sections scroll away as usual (off), each opens like a door **left, then right, then
left...** (alternate), each **to the left**, each **to the right**, or each **sinks back**. Each container can choose
its own in Advanced > Interactions > **When The Page Scrolls Past** (as the page says, door left, door right, sink back,
scroll away as usual). The last container always stays.

Also: **How Far A Door Opens** (30 to 120 degrees, default 100), **Shade As It Opens** (darkens with the movement, and
a door casts a shadow), **Also On Phones** (default on), **Section Background** (behind containers without a
background of their own, so the next one does not show through; otherwise the site's background).

A section taller than the screen scrolls through first and opens at its end. Scrolling back up closes the doors again.

## How it works

- Each moving section is `position: sticky` (top: 0, or minus its extra height for a tall one). A door has a higher
  `z-index` than the next section, a sinking one a lower one.
- `doors.js` measures where each section sits in the page's flow (sticking, turning and shifting switched off with
  `.rf-doors-measure`), and on scroll gives each its progress `--rf-door-p` from 0 to 1 over one screen from its start;
  `is-opening` and `is-open` (out of the way: `visibility: hidden`) follow. Behind a door the next section is lifted
  with `translate` by what it still has to rise, so it is already in place.
- The CSS draws it: doors `rotateY` about their hinge with the perspective moved to the middle of the screen
  (`translateX(50%) perspective(1800px) translateX(-50%) rotateY(...)`); sinking `scale` and `border-radius`; shade
  `filter: brightness()`.
- Site only (the editor keeps a plain page); off for reduced motion; not together with Pages Side By Side (the pages
  win). The containers' own `transform` (an entrance animation on a top-level container) is replaced while it moves.
  Works best with full-width containers (a theme's narrow content column holds them in: use the Full Width or Canvas
  template).

Tests: `php scripts/test-interactions.php`; browser: `node scripts/check-scroll-doors.mjs --site DIR --port N`.
