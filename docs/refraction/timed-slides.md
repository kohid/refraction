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
  Card corners, Titles on the cards, Arrows, Progress line, Slide number.
- **Style**: Slider background and text color, Shade color (empty: a dark gradient), Timer and progress color, Timer
  line thickness; Cards: title and small text typography, text color, shade under the title, shadow, lift on hover;
  Arrows, line and number: space above, space after the number, arrow size, colors and background, line track color,
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
