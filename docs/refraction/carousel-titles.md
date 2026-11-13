# Nested Carousel: Slide Titles (0.73.0)

The slides' titles as buttons on the page (`modules/nested-carousel`): a click shows that slide, and the current one is
marked as the carousel moves. Made for the Vertical direction; works with Horizontal, Fade and Stack too.

- **Content > Options**: Slide Titles (`title_nav`), Titles Position (`title_nav_position`: left, top, bottom, right;
  prefix class `refraction-nc-titles-*`), Titles On Phones (`title_nav_mobile`: `same`, `top` (default), `bottom`,
  `hide`; prefix class `refraction-nc-titles-m-*`, applied below 768px), Number Before Each Title
  (`title_nav_numbers`; a slide without a title always shows its number).
- **Markup** (PHP `print_title_nav()` and the same in `content_template()`): with two or more slides the root gets
  `has-titles`, a `nav.refraction-nc__titles` of `button.refraction-nc__title[data-index]` (`aria-current` on the
  current one), and the viewport, arrows, dots and pause button move into `.refraction-nc__stage`, so the arrows stay
  centred on the slides. Without Slide Titles the markup is unchanged.
- **Layout** (`assets/scss/frontend.scss`): the root is a grid; left / right put the titles in a column
  `--rf-nc-titles-w` wide (240px), `contain: size` so it is as tall as the slides and scrolls when longer; top / bottom
  make a row that scrolls sideways. The marker (`::after`) is on the side facing the slides.
- **Script** (`frontend/handlers/nested-carousel.js`): a click calls `goToSlide()` (Swiper `slideTo` or the Stack's
  `stackGo`); `syncTitles()` runs on Swiper init / slideChange and after every Stack layout, marks the current title
  and scrolls only the titles list to keep it in view.
- **Style > Slide Titles**: Width Of The Titles, Space To The Slides, Space Between Titles, Alignment, Typography,
  Padding, Corners, Border Width, Normal / Hover / Current tabs (text, background, border colours; marker colour and
  thickness on Current), Number Color, Transition.
- **Check**: `node scripts/check-carousel-titles.mjs --site DIR --port N`.

## Icons and marker (0.74.0)

Each slide can have a Title Icon (`slides[].slide_icon`), placed by Icon Position (`title_nav_icon_position`: before,
above, after; prefix class `refraction-nc-title-icon-*`). Style > Slide Titles: Icon Color / Icon Background in the
Normal, Hover and Current tabs, Title Icons (`Icon_Box_Style`: size, padding, corners) and Space Between Icon And
Title. Current Marker: Show Marker (`refraction-nc-marker-yes`, default on), Marker Color, Thickness, Length (%),
Distance From The Edge and Corners (`--rf-nc-marker-*`).
