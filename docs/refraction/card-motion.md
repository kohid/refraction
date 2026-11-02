# Card motion

Module `modules/card-motion` (0.28.0): the **Card stack** of the Image and Image Box widgets, and the script and styles of the Slides widget's **Timed cards** layout.

## Card stack (Image, Image Box)

Content > **Card stack** (after the Image section): the widget's own image plus **More images (up to 4)**, five cards in all, as

- **Fan**: fanned out around the front card (reference: Travel Guide Card UI).
- **Deck**: a tilted deck; the top card is thrown off to the side and slides in at the back (reference: Card Animation).
- **Carousel**: the front card with its neighbours waiting smaller at the sides, with dots (reference: Jupi).
- **Shuffle**: a pile leaning back; the front card lifts and drops to the back; with the glow and reflection options it matches the Destination Cards reference.

Options: card shape (3/4, 4/5, 1/1, 2/3, 4/3, 16/9), card width (320 px, 280 px tablet, 56 % phone), tilt, spacing, **Play by itself** and time per card (not the fan), **Hovering a card behind**: brings it to the front, lifts it, or nothing, **Click for the next card** (off when the image has a link), dots (carousel), **Glow in the front card's color** (the average color of the image, read from the picture), **Reflection**, corners and shadow.

How it works: `assets/js/card-stack.js` turns the widget's `<img>` into the front card and adds the others; each card's place comes from its position in the order (front first), CSS transitions move them, and the spacing shrinks when the spread would not fit (phones). Entrance: the cards spread out when the stack comes into view. It pauses while hovered, off screen or in a hidden tab, never plays for reduced motion. Site: config in `data-rf-stack` (`Classes\Pure_Stack_Settings`, alt texts from the library); editor: the same rules from the live settings, so it updates while editing. Without JavaScript the widget shows its one image.

## Slides: Timed cards

Slides > Slider Options > **Layout: Timed cards** (reference: Timed Card Opening). The current slide fills the widget with its text (a new per-slide **Small text above the title**, title, description, button) on the left; the slides that come next wait as cards on the right. Going to a slide grows its card from where it sits to the whole widget while the other cards move along; the title and text rise in. A line at the top times each slide (Autoplay and its speed; pauses on hover and focus), the line in the controls and a large counter show the position; arrows, clicking a card and the arrow keys move. **Card width**, **Card shape** (3/4, 4/5, 1/1, 2/3, 4/3, 16/9, the same shapes as the Card stack; video slides show their YouTube thumbnail in that shape), **Card corners** and **Timer and progress color** are in the same section; Height, Transition Speed and the existing typography and button styles apply. The slider always takes the full width of its container, also in a container laid out as a row (where content made only of positioned layers would otherwise shrink to nothing). Script `assets/js/slides-cards.js`; markup in `Slides::render_cards()`.

Tests: `php scripts/test-card-motion.php`, browser check `node scripts/check-card-motion.mjs --site DIR --port N`.
