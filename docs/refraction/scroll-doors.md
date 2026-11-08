# Scrolling effects of containers (0.51.0)

Container > **Layout** > **Scrolling Effect** (module `modules/interactions`, script `assets/js/doors.js`, styles in
`assets/scss/frontend.scss`). Each top-level container chooses how it leaves the screen as the page scrolls down; one
page can mix them. (0.50 had this as a page setting, "Sections Open Like Doors"; it was never released and moved here.)

## The choices (When The Page Scrolls Past)

| Choice | What happens over one screen of scrolling | The next container |
| --- | --- | --- |
| Scrolls away as usual | nothing special | |
| Opens like a door to the left | swings away from the viewer on its left edge | waits in place behind it |
| Opens like a door to the right | the same on its right edge | waits in place behind it |
| Sinks back as the next slides over it | shrinks a little, rounds its corners, darkens | slides up over it |
| Slides to the left as the next comes in | moves out to the left | comes in from the right at the same height |
| Turns over like a book page | turns towards the viewer and over to the left | waits behind it, like the next page |

Options: **How Far It Opens** (doors, 30 to 120 degrees, default 100), **Parallax Depth** (slide: what is on the
outgoing and the incoming container moves as layers, trailing behind them; 0 = as one piece; an element's own depth
in Advanced > Interactions > Depth When Pages Slide), **Shade As It Goes** (darkens; doors and pages cast a shadow),
**Also On Phones**. The page's last container always stays. A container taller than the screen scrolls through first
and leaves at its end. Scrolling back up brings everything back.

## How it works

- `data-rf-door` on a container holds its clamped settings (`Pure_Interaction_Settings::scroll_effect()`); the script is
  loaded only on pages with such a container. Only containers at the top level of the page take part.
- Moving containers are `position: sticky` (top 0, or minus their extra height); a door, a slide or a page lies above
  the next container (`z-index`), a sinking one below it. `doors.js` measures where each sits in the page's flow
  (with sticking, turning and shifting off: `.rf-doors-measure`) and on scroll gives each `--rf-door-p` (0 to 1 over
  one screen from its start), `is-opening`, `is-open` (then `visibility: hidden`). The next container is held in place
  with `translate` (and, after a slide, moved in from the right); a sliding pair gets `--rf-door-x` for its layers.
- The CSS draws it: doors and pages `rotateY` about their edge with the perspective moved to the middle of the screen,
  the page with `backface-visibility: hidden`; the slide `translateX`; sinking `scale` and `border-radius`; shade
  `filter: brightness()`. Moving containers keep only their color transitions (a transition on `transform` would lag
  behind the scroll); their own `transform` (an entrance animation) is replaced while they move.
- Site only (the editor shows the containers one under another); off for reduced motion; not on a page shown as
  Pages Side By Side. Works best with full-width containers (use the Full Width or Canvas template).

Tests: `php scripts/test-interactions.php`; browser: `node scripts/check-scroll-doors.mjs --site DIR --port N`.
