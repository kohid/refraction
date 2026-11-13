# Timed Slides

Module `modules/timed-slides` (0.31.0): the **Timed Slides** widget (Advanced category). It looks and moves like the
Slides widget's Timed cards layout (the current slide fills the widget, the next slides wait as cards that grow into
the slide, a timer line, a progress line and a slide number), but every slide's content is a **container**: drop any
widgets into it (headings, text, buttons, forms, images, other sliders...).

## Settings

- **Slides** (a nested repeater: each item has its container, like Nested Carousel and Nested Tabs). Per slide: Card
  title and the small text above it (shown on the slide's card, in the navigator and to screen readers), Background
  image (with an Image description), Background color, YouTube video (plays muted behind the slide, with its thumbnail
  as background and card picture when there is no image), Next slide when the video ends, Sound button. A new widget
  starts with three slides, each with an example eyebrow, title, text and button to edit or replace.
- **Slider**: Height (responsive; 100vh, 640 px on phones), Autoplay, Time per slide, Pause on hover, Timer line at the
  top, Transition speed, Shade over the background.
- **Content Position** (responsive): Horizontal, Vertical, Text Alignment, Width, Space from the edges, and how the
  content comes in (rising one widget after another, fading, at once).
- **Cards** (responsive, separate from the content): show the cards, Horizontal, Vertical, Width (cards that do not fit
  run off the edge), Space from the edges, Card width, Card shape (3/4, 4/5, 1/1, 2/3, 4/3, 16/9), Space between cards,
  Card corners, Titles on the cards, Arrows, Progress line, Progress number (0.79.0: percent, fraction, spaced
  fraction, "2 of 5" or padded "02 / 05"; before or after the line; off by default), Slide number.
- **Style**: Slider background and text color, Shade color (empty: a dark gradient), Timer and progress color, Timer
  line thickness; Cards: title and small text typography, text color, shade under the title, shadow, lift on hover;
  Arrows, line and number: space above, space after the number, arrow size, colors and background, line color (the filled part) and track color, line thickness and corners (0.79.0), progress number typography and
  color,
  number typography and color.

Phones by default: the content at the top, the cards at the bottom, full width.

## How it works

`widgets/timed-slides.php` renders `.rf-tco.rf-ts` (the shared Timed cards styles of `modules/card-motion`): a stage
with each slide's background, video and shade; a content layer `.rf-ts__layer--content` with the slide containers
(each marked `.rf-tco__text`, only the current one shows); and a cards layer `.rf-ts__layer--cards` with the rail
(cards, sound buttons, arrows, line, number). The two layers are flex boxes covering the widget, so Horizontal and
Vertical are `justify-content` and `align-items`, each set separately. The script
`assets/js/frontend/handlers/timed-slides.js` runs the engine shared with the Slides widget
(`modules/card-motion/assets/js/timed-cards.js`). In the editor the slider follows the slide picked in the panel,
does not autoplay, and is rebuilt when slides are added, removed or moved. Styles: `assets/scss/frontend.scss` (built to
`widget-timed-slides`). Check: `scripts/check-timed-slides.mjs`.

## Transitions (0.61.0)

Slider > **Transition** chooses how the next slide comes in:

- **Card grows into the slide** (the default, as before)
- **Fade**
- **Slide in from the side** (the old slide moves away a little) and **Slide up**
- **Zoom in** and **Zoom out**
- **Blur**
- **Circle opens from the card**: from the clicked card's centre, or from the middle for the arrows and autoplay
- **Wipe from the side** and **Wipe up**
- **Curtain**: opens from the middle
- **Diagonal wipe**
- **Flip**

Going back (the previous arrow, the left arrow key) runs the side, wipe, diagonal and flip transitions the other way. **Transition speed** applies to all of them. With reduced motion, slides change at once.

How it works:

- The engine (`modules/card-motion/assets/js/timed-cards.js`) takes `cfg.effect`.
- For anything but `grow`, `transition()` lays a copy of the new slide's picture (with its shade) over the whole slider as `.rf-tco__grow--full`, and animates it with `transitionFrames( effect, dir, at )`. For some effects the old slide moves too.
- When the animation ends, the slides switch at once underneath and the copy is removed.
- The Slides widget's Timed cards layout uses the same engine and keeps the grow transition.

`scripts/check-timed-slides.mjs` runs all twelve transitions on one page. For each, it checks the transition is under way halfway through, then that the second slide shows, no copy is left and nothing is still moving. It also checks that the previous arrow slides in from the left.

## Notes (0.79.0)

- The progress number is `.rf-tco__progress[data-format]`, printed for the first slide by `Timed_Slides::progress_text()`
  and kept current by `progressText()` in `modules/card-motion/assets/js/timed-cards.js` (same formats); the translated
  "%1$d of %2$d" travels in `data-of`.
- Headings with Highlight Words inside a slide keep their own mark and colors: `Heading_Dual_Style` now puts the
  section's condition on each of its settings (a widget that highlights nothing prints no highlight CSS or classes), and
  its selector stops at nested elements (`:not({{WRAPPER}} .refraction-element *)`).

## Box of the slider (0.89.0)

Style > Slider > **Box**: Normal / Hover tabs with border (Hover: border color), **Rounded Corners** and box shadow
(`ts_box_*`, on `.rf-tco`, which already cuts its content to its corners), and a change duration. Style > Cards has a
**Border** (`card_border`). The controls come from `Refraction\Includes\Widgets\Traits\Box_Style`, shared with the Image
Box (Style > Box: also background, padding and **Cut The Content To The Corners**, which applies only once a corner is
rounded). Check: `node scripts/check-box-style.mjs --site DIR --port N`.

