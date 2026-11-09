# Dual Heading

The Heading widget can add a highlighted part after its title: "Pet pros who found their **stride with GoPet AI**." The part has its own color or gradient and its own typography, with a mark behind it, and the mark can draw itself when the heading scrolls into view.

## Settings

Content > Heading:

- **Dual Heading** turns it on.
- **Highlighted Text** is the part shown highlighted, right after the title.
- **Text After** is in the title color, for example the full stop. Punctuation joins it directly; words get a space.
- **Highlighted Text On A New Line** puts a line break before the part.

Style > Highlighted Text:

- **Text Fill**: a color (Text Color; empty keeps the title color) or a gradient (start, end, angle). With a gradient, the words are filled with it and no mark is drawn, because both use the part's background.
- **Typography** of the part only.
- **Mark Behind**: Rounded highlighter (the default, lime `#D4F25A`), Highlighter (a straight band), Underline, Background (behind the whole words, with a corner radius) or None.
- **Mark Color**, **Mark Thickness** and **Distance From The Bottom** (both in em by default, so they scale with the text), **Reach Past The Words**, **Corner Radius** (Background).
- **Draw When Scrolled Into View**, with **Drawing Time** (800 ms by default) and **Delay** (150 ms). With reduced motion the mark is there at once.

## How it works

- Markup: `<span class="refraction-heading-dual">` inside the heading, then the text after it (`includes/widgets/traits/heading-dual-trait.php`, used by `includes/widgets/heading.php`; the editor template builds the same).
- The widget carries `refraction-dual-fill-<color|gradient>`, `refraction-dual-mark-<style>` and `refraction-dual-draw-yes`.
- The mark is the span's background with `box-decoration-break: clone`, so it follows the words onto every line they wrap to. The rounded highlighter is three layers: two round ends and the band.
- Drawing: `--rf-dual-p` (registered with `@property`) goes from 0 to 1 in a CSS transition. `assets/dev/js/frontend/handlers/heading-dual.js` (run by the global handler) adds `is-drawn` when the part is well in view. The round end that closes the stroke shows when the band arrives.
- Styles: `assets/dev/scss/frontend/partials/_heading-dual.scss` (in frontend.css).
- Inline editing of the title is off while the dual parts are shown: it would write the whole heading back into the title. Edit the texts in the panel.

## Check

`node scripts/check-heading-dual.mjs --site DIR --port N`: the sentence and spacing, the colors, each mark, the gradient fill, the new line, drawing on scroll and with reduced motion, wrapping on a phone, the plain heading when off, and the editor (settings, preview, a changed text).
