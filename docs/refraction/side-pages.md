# Pages side by side (0.49.0)

Page Settings (the cog) > **Pages Side By Side**, on pages, posts and landing pages (module `modules/interactions`,
script `assets/js/pages.js`, styles in `assets/scss/frontend.scss`). Reference: an editorial "parallax effect
website" whose pages slide in from the right one at a time, with layered motion, a large `*01` page number, arrows,
and a newsletter as the last page.

## What it does

- **Show The Page As**: one long page (as usual), **pages that slide to the left**, or **pages turned like a book**.
  Each top-level container becomes a page that fills the screen below the theme's header; the page no longer
  scrolls down (`html.rf-hp-on`, body `overflow: hidden`). A page taller than the screen scrolls inside itself; the
  wheel and the up and down keys scroll it to its end first.
- **Turning pages**: the wheel or trackpad (one page per gesture; the tail of a swipe is swallowed), the arrow keys,
  Page Up / Down, Space (Shift+Space back), Home and End (not while typing in a field), a swipe, the arrows, and links
  to a part of the page (`#id` of anything on a page; opening the page with `#id` starts on that page).
- **Slide**: pages sit side by side (`translate` by their distance from the current one). **Parallax Depth** (% of the
  screen width, default 30): the things on each page move as layers while it slides. Automatic layers are each
  page's direct children (or its only child container's children) with depths 0.5, 1, 0.25, 0.75; an element's own
  **Depth When Pages Slide** (Advanced > Interactions, -2 to 2; `data-rf-hp-depth`) replaces the automatic layers of
  its page.
- **Book**: the pages lie one on another; going forward, the current page turns over its left edge (`rotateY`, with
  perspective and a shadow); going back, the previous page turns back over it. Pages get **Page Background** (or the
  site's background) so the page underneath does not show through.
- **Arrows**, **Page Number** (large `01` with **Before The Number**, for example `*`; `1 / 6`; or none),
  **Progress Line**, **After The Last Page, Back To The First** (then the last page's "next" says "Back to the first
  page"), **Time To Turn A Page**, colors of the arrows and number and of the progress line.
- **Phones held upright**: **show the pages in landscape** (default; the stage is turned a quarter to the right to fill
  the screen and the reader turns the phone; a swipe along the page turns it), **ask to turn the phone sideways** (a
  message over the page), or **one long page, as usual**. Held sideways, a phone works like a computer.
- Only the current page can be reached with the keyboard and screen readers (`inert` on the others); each page is a
  group named "Page N of M", and the page change is announced. **Reduced motion**: pages change without movement and
  without layers.
- On the site only: the editor and its preview keep the containers one under another. On a page with this on,
  Scrolling > One section per scroll / Smooth / Snap is not loaded.

Tests: `php scripts/test-interactions.php`; browser: `node scripts/check-side-pages.mjs --site DIR --port N`.
