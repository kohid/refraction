# Performance: the first screen (0.146.0)

## Animations On The First Screen

Settings > Performance > Animations On The First Screen (`refraction_first_screen_animations`, default `1`).

An element with an entrance animation used to be printed with `refraction-invisible` (`visibility: hidden`) until the
frontend script, loaded at the end of the page, animated it in. On the first screen that delays what the visitor sees
and what speed tests measure (Largest Contentful Paint: a hero heading or picture with an animation counted only once
the scripts had run).

With the setting on (`modules/first-screen`):

- the element is printed visible with `rf-intro` instead (`Element_Base`);
- a short inline script in `wp_footer` (priority 1, before the frontend scripts) sorts them while the page is read:
  on screen now gets `rf-intro-skip` (shown, never animated: the global handler skips it), the rest gets
  `refraction-invisible` and animates when scrolled to, as before;
- the body gets `rf-first-screen`: Pin Board's reveal and Dynamic Container's entrance show at once what is on screen
  when the page opens (and the Pin Board lines between those notes);
- without JavaScript nothing stays hidden;
- the editor and its preview keep the animations as set; changing the setting clears the cached element markup.

Every visitor gets the same page: there is no detection of speed-test tools (serving them something else would make
the score describe a page nobody gets, and Google's ranking uses real visitors' measurements anyway).

## Google Fonts: swap by default

`refraction_font_display` defaults to `swap` (was `auto`): text shows at once in a fallback font while a Google Font
loads. A value saved in Settings is kept.

## Already there

Settings > Performance also has: CSS Print Method (external file), Optimized Image Loading, Optimized Gutenberg Loading,
Lazy Load Background Images, Load Google Fonts Locally; Features (experiments) has Inline Font Icons and Optimized
Markup.

Check: `node scripts/check-first-screen.mjs --site DIR --port N`.
