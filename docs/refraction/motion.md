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

`php scripts/test-motion.php` (pure logic), `node scripts/check-motion.mjs --site DIR --port N` (browser, classic and block
theme), fixture `scripts/fixtures/motion-seed.php`.
