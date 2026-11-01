# Motion Effects, Sticky, Custom Fonts, Custom Icons

Roadmap item B2b. Four always-on features in three modules (`modules/motion-effects`, `modules/custom-fonts`,
`modules/custom-icons`). Everything is local: no remote requests at runtime, no icons or fonts from the web.

## Motion Effects

Advanced tab of containers, sections, columns and widgets, three sections after "Motion Effects" (the entrance animation):

- **Scrolling Effects**: Vertical Scroll, Horizontal Scroll, Transparency, Blur, Rotate, Scale. Each has a direction, a
  speed or level, and a viewport start/end (percent of the viewport height, 0 = element centre at the bottom edge, 100 = at
  the top edge). "Apply effects on" picks devices (every active breakpoint); "Relative to" is the viewport or the entire page.
- **Mouse Effects**: Mouse Track (with or against the cursor, speed) and 3D Tilt (intensity, optionally keep the tilt when
  the pointer leaves). Default device: desktop only.

How it works: PHP clamps the settings (`Pure_Motion_Settings`) and prints them as `data-rf-fx` on the wrapper; the script
(`motion.js`, enqueued only when an element on the page uses a motion effect, always in the editor preview) watches elements
with an IntersectionObserver and one requestAnimationFrame loop writes only `translate`, `rotate`, `scale`, `filter` (and
`transform` for the tilt). The individual transform properties and `filter: opacity()` are used on purpose: an entrance
animation animates `transform` and `opacity` on the same wrapper, so the two stack instead of overwriting each other. On an
element with an entrance animation the tilt is written into `rotate` (axis-angle, no perspective) for the same reason.
`prefers-reduced-motion: reduce` switches every effect off (and back on if the setting changes). In the editor the config
is built from the element settings with the same limits and updates live when a control changes.

Limits: effects of elements that are off screen are not updated until they come into view (with a 150px margin); the tilt
reacts only while the pointer is over the element; touch pointers are ignored.

## Reveal (0.20.0)

Advanced tab of every widget and container, section **Reveal** (before Scrolling Effects). Things come into view on their own:

- **Whole element / Whole container**: fade up, fade down, fade in from either side, fade, zoom in, zoom out, sharpen from blur, rise and turn. Use it or the Entrance Animation, not both on one element (the Entrance Animation wins).
- **Text** (widgets): **line by line**, **word by word** or **letter by letter**, each piece **up from behind a line** (masked) or with any of the effects above. The text is split into word spans (letters inside them) around its existing markup, so bold, links and line breaks stay; screen readers get the whole text once (`.rf-rv-sr`) and the pieces are `aria-hidden`. Lines are measured after splitting and measured again after a resize.
- **Its elements, one after another** (containers): the widgets and inner containers directly inside come in with a delay each (elements with their own Entrance Animation are left alone).
- **Plays**: **once** when it comes into view (`Starts when this far into the screen`), **every time** (hidden again once it has left the screen completely), or **with the scroll**: a progress from Viewport start to Viewport end (0 = the element's top at the bottom of the screen) drives every piece, so it plays backwards when scrolling up.
- Duration, delay, time between pieces, distance, movement (easing) and devices.

How it works: PHP clamps the settings (`Pure_Reveal_Settings`) into `data-rf-reveal` and adds `rf-rv-wait` (hidden; a CSS animation shows it after 3 seconds if the script never runs). `reveal.js` (enqueued only when used, always in the editor preview) gives every piece `--rf-rv-p` from 0 to 1 and the CSS draws it (`opacity`, `transform`, and `filter` for the blur effect). `--rf-rv-p` is a registered custom property, so a timed reveal simply transitions it with a delay per piece, and a scroll-linked one sets it frame by frame with the same stagger. Scrolling Effects use the separate `translate` / `rotate` / `scale` properties, so both stack on one element. `prefers-reduced-motion: reduce` shows everything at once without splitting. In the editor the config is built from the settings and rebuilt when one changes.

## Parallax presets (0.20.0)

Scrolling Effects has a **Preset** for layered art: far layer (slow), middle layer, near layer (fast), float and turn, drift left or right, and come closer. A preset switches on its effects with fixed values (start 0, end 100) and hides the hand-made ones (`Pure_Reveal_Settings::PRESETS`, mirrored in `motion.js`). Give the pieces of an illustration different layers to make them move at different speeds.

## Sticky

Sticky (none/top/bottom), Sticky On (devices), Offset, Effects offset, Stay in column, Shrink when scrolled (padding) and
Background when scrolled. `sticky.js` (no jQuery, enqueued only when used) switches the element to `position: fixed` and
inserts a hidden placeholder of the same size, so the page does not jump. The admin bar height is added to a top offset
only when the bar is really fixed (it is not below 601px). After the effects offset the wrapper gets `.rf-sticky--effects`,
which the shrink and background controls style. "Stay in column" keeps the element inside its parent container or column.
A sticky container in a Theme Builder header works the same way (the header template is rendered through the normal element
pipeline).

Limits: a sticky element whose ancestors use `transform`, `filter` or `perspective` can be positioned relative to that
ancestor by the browser (a CSS rule for fixed positioning); stay in column assumes the parent is taller than the element.

## Custom Fonts

Refraction > Custom Fonts. Families with variations (weight 100-900, style normal/italic/oblique), each with up to four
files (woff2, woff, ttf, otf), `font-display` and an optional preload of the woff2 files. Validation
(`Pure_Font_Validator`): extension, declared MIME type and magic bytes must agree, double extensions with php/svg/html are
refused, files containing `<?php`, `<script`, `<svg` or `<html` are refused, 5 MB per file; nothing is stored unless every
file in the request passes. Files go to `uploads/refraction-fonts/<family>/<random>.<ext>`. The `@font-face` stylesheet
(`Pure_Font_Face_Css`, every value whitelisted or escaped) is generated into `uploads/refraction/css/custom-fonts.css` by the
files manager (a missing file is rebuilt on demand, so "Regenerate CSS" is safe) and is printed when a custom font is used,
and always in the editor and its preview. Fonts are added to the `refraction/fonts/groups` and
`refraction/fonts/additional_fonts` filters, so every font-family control lists them under "Custom Fonts".

Limits: family names are limited to letters, digits, spaces, dashes and underscores; uploads are not in the Media Library.

## Custom Icons

Refraction > Custom Icons. Upload a ZIP with SVG files (one icon each) or an IcoMoon / Fontello download
(`selection.json` or `config.json` plus a woff2/woff/ttf/otf). `Pure_Zip_Validator` checks the entry list first
(no `..`, absolute or drive paths, at most 500 files, 10 MB unpacked, 100 KB per SVG, compression-ratio guard) and entries
are read into memory and written under generated names (never `extractTo`). SVGs go through `Pure_Svg_Sanitizer` (element and
attribute whitelist, no script, style, foreignObject, image, links, external `url()`/`href`, doctype or entities) and
fonts through the font validator. Sets live in `uploads/refraction-icons/<set>/` with a generated `style.css` and
`icons.json`, are registered through `refraction/icons_manager/additional_tabs` (one tab per set, named after the set) and are
deletable. SVG sets render inline on the front end (sanitised again when read) and as CSS masks in the picker and the
editor preview; font sets render as `<i>` classes with their CSS.

Limits: the tab is per set, not one merged "Custom icon sets" tab (an icon's library is its set); the picker preview of an
SVG icon is single-colour (mask), the front end keeps the SVG's own fills.

## Tests

`php scripts/test-motion.php` (pure logic, reveal and presets included), `node scripts/check-motion.mjs --site DIR --port N` (browser, classic and block
theme), fixture `scripts/fixtures/motion-seed.php`, and `node scripts/check-reveal.mjs --site DIR --port N` (text, children, once / every time / with the scroll, presets, reduced motion, no-script failsafe, editor; saves a scroll recording).
