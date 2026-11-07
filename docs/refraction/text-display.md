# Text display: cut to lines, Show more, tooltip (0.46.0)

How a widget shows its description or main text. One trait, `Text_Display_Trait`
(`includes/widgets/traits/text-display-trait.php`), used by:

| Widget | Text | Modes |
| --- | --- | --- |
| Text Editor | the editor content | text, cut to lines, tooltip (on a trigger text and icon) |
| Icon Box, Image Box | the description (through `Box_Extras_Trait`, which adds the button) | text, cut to lines, tooltip |
| Testimonial | the content | text, cut to lines, tooltip |
| Alert | the description | text, cut to lines, tooltip |
| Author Box (Theme Builder) | the biography | text, cut to lines, tooltip |
| Call to Action | the description | text, cut to lines (its box clips what overflows it, so no tooltip) |

Not included: Flip Box (two faces, the back one already shows on hover), Slides and Price Table (text per item in a
repeater), Blockquote.

## Settings (Content, under the text)

- **Show The Description / Text / Biography** (`box_description_display`, prefix class
  `refraction-box-desc-<text|clamp|tooltip>`).
- Cut to lines: **Lines** (responsive, `--rf-box-lines`), **Show More Toggle** (`box_read_more`) with its **Show More
  Text**, **Show Less Text** (empty: the toggle goes away once the text is open), **Toggle Style** (button, the
  default, full width and rounded; or a text link) and **Toggle Icon** (a chevron by default, turned when open); **Full
  Text In A Tooltip**.
- Tooltip: **Tooltip Position** (under or above), and in Text Editor a **Tooltip Trigger Text** and **Trigger Icon**
  (the text is hidden, so something has to be hovered).
- Style > **Show More Toggle**: alignment (start, center, end, full width), typography, normal and hover colors (text,
  background, border), padding, radius, border width, space above, icon size. Style > **Tooltip**: background, text
  color, typography, width, padding, radius, border, and the trigger's color and typography.

The control names start with `box_` because they began in Icon Box and Image Box (0.44); those boxes keep their saved
settings.

## How it works

- Markup: the text element gets `refraction-box-description` (plus `refraction-box-tooltip` in tooltip mode) from
  `text_display_classes()`; after it, `text_display_after_html()` prints the full-text tooltip and
  `<div class="refraction-read-more-wrap"><button class="refraction-read-more" aria-expanded aria-controls>`. Text
  Editor wraps its content in its own element when cut or shown as a tooltip (on the page it otherwise has none) and,
  in tooltip mode, puts the trigger and the text in `.refraction-text-tooltip-anchor`. The editor templates use
  `print_text_display_template()` (`textDisplay`, `textDescClass`, `textAfter`, `textTrigger`).
- Styles: `assets/dev/scss/frontend/partials/_text-display.scss`, imported by `frontend.scss` (so every widget has
  them). The cut uses `-webkit-line-clamp`, which counts lines through paragraphs and lists; the first and last child
  lose their outer margin so the lines are exact.
- Script: `assets/dev/js/frontend/handlers/read-more.js`, run by the global element handler for every element (page
  and editor preview). It toggles `is-text-expanded` on the widget and `aria-expanded`, and sets `is-text-short` (no
  toggle) while the text fits in its lines, measured again on resize.
- The tooltip shows while the widget (or the Text Editor trigger) is hovered or has the keyboard focus; the full-text
  tooltip not while the text is open.

Check: `node scripts/check-text-display.mjs --site DIR --port N`.
