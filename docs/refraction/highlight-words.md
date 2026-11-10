# Highlight Words and Pill Labels (0.67.0)

Module `modules/highlight-words`.

## Highlight Words

Content > **Highlight Words** on the Heading, Text Editor, Image Box, Icon Box, Testimonial, Call to Action, Flip Box (after the back side), Price Table (after the header) and Blockquote:

- **Words To Highlight**: one word or phrase per line, any number (up to 30). Each is highlighted wherever it appears in the widget's text, titles and descriptions alike, also inside links.
- **Match Upper And Lower Case**: off by default, so "Safe" and "safe" both match.

Matching is on whole words, longest phrase first; only text changes, never tags, attributes, or the text of script, style, textarea or a part already highlighted (a Dual Heading). Logic in `classes/pure-highlight.php` (tests: `php scripts/test-highlight-words.php`).

The highlighted parts look and behave like the Dual Heading's part (`<span class="refraction-heading-dual rf-hl">`): Style > **Highlighted Text** has the text fill (a color, or a gradient), typography, the mark behind (rounded highlighter, highlighter, underline, background), its color, thickness, distance and reach, and **Draw When Scrolled Into View**. The section is shared with the Heading's Dual Heading (`includes/widgets/traits/heading-dual-style.php`), so on a Heading both use one style.

On the site the spans come from the server (`refraction/widget/render_content`); in the editor's preview, where widgets are drawn by their JS templates, `assets/js/highlight-preview.js` adds them with the same rules.

## Pill Label

- **Heading > Style > Pill Label**: **Show As A Pill Label** turns a small heading into a rounded tinted label: pill background and border, padding and corners, **Capital Letters, Spaced Out** (on by default), and a round **badge** before the text, with a number or short word (**Badge Text**, for example 3) or an icon, its background, color and size, and the space after it. Styles in `assets/dev/scss/frontend/partials/_pill-label.scss`.
- **Phone Showcase > Style**: **Text Above The Steps As A Pill**, with the same look; its icon sits in the round badge.

## Check

`node scripts/check-highlight-words.mjs --site DIR --port N`: phrases in a Heading (drawn mark), a Text Editor (gradient, inside a link), an Icon Box and a Call to Action (own color, underline); the Heading and Phone Showcase pills; the editor preview and a live change.
