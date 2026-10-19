# Pro widgets, batch 1 (Advanced category)

Twelve widgets in the editor category **Advanced** (`refraction-advanced`), always on, no toggle, no remote calls.
Module: `modules/pro-widgets/` (`Refraction\Modules\ProWidgets`). Each widget is server-rendered, so the editor preview
re-renders from the same PHP as the front end. Front-end behaviour sits in lazy handlers registered in
`assets/dev/js/frontend/elements-handlers-manager.js`; styles are `modules/pro-widgets/assets/scss/widgets/<name>.scss`
(compiled by the existing widgets pipeline to `assets/css/widget-<name>.min.css`).

| Widget | Name | What it does |
|--------|------|--------------|
| Nav Menu | `refraction-nav-menu` | Any WordPress menu as a horizontal, vertical or dropdown menu. Real `button` submenu toggles (keyboard and touch), CSS-drawn indicators (chevron, caret, plus), hover effects (underline, overline, double line, framed, fill), hamburger below a chosen breakpoint (mobile, tablet, never) or always (dropdown layout). The opened mobile panel floats over the page, so it works inside sticky headers; Escape and outside click close it. |
| Slides | `refraction-slides` | Hero slider on the bundled Swiper. Per-slide background colour or image, overlay, title, text and button; slide or fade; autoplay (off for reduced motion), loop, pause on hover, arrows and dots. |
| Price List | `refraction-price-list` | Items with image, title, price, description, optional link, dotted/dashed/solid separator. |
| Price Table | `refraction-price-table` | Header, price with currency and sale price, period, feature list (included or not), button, additional info, corner ribbon. |
| Flip Box | `refraction-flip-box` | Two sides with flip, slide, push, zoom or fade effects in four directions. Flips on hover and keyboard focus, or on click/Enter; always on tap for touch screens. |
| Call to Action | `refraction-call-to-action` | Classic (image beside or above) or cover skin, button, optional whole-box link (still one real link), corner ribbon. |
| Animated Headline | `refraction-animated-headline` | Rotating text (typing, clip, flip, swirl, blinds, drop-in, wave, slide, fade) or a highlighted phrase (highlight, underline, circle, strikethrough). |
| Countdown | `refraction-countdown` | Due date (site timezone) or evergreen timer remembered per visitor in a cookie (`rf_cd_<id>`, localStorage as a second place, memory if both are blocked). When it ends: keep zeros, hide, show a message, or redirect. |
| Share Buttons | `refraction-share-buttons` | Facebook, X, LinkedIn, Pinterest, WhatsApp, Telegram, Email as plain links; Copy link and Print as buttons. No third-party script or SDK. |
| Blockquote | `refraction-blockquote` | `figure > blockquote` with author, four skins and an optional "Tweet" link to the X compose page (quote shortened to fit). |
| Progress Tracker | `refraction-progress-tracker` | Reading progress of the whole page, the post content or a CSS selector, as a bar (inline or fixed top/bottom) or a ring. A `progressbar` with a live `aria-valuenow`. |
| Table of Contents | `refraction-table-of-contents` | Built in the browser from the headings on the page: unique ids, hierarchical numbers (1., 1.1, 1.1.1), bullets or none, collapsible, sticky, smooth scroll with offset, current-section highlight. |

## Tests

* `php scripts/test-pro-widgets.php` - share links, countdown maths, headline rules (no WordPress needed).
* `node scripts/test-pro-widgets-js.mjs` - Table of Contents ids and numbering.
* `node scripts/check-pro-widgets.mjs --site <dir> --port <port>` - Playwright against a real WordPress site installed from
  `dist/refraction.zip`: panel search and category, a real drag into a container, front-end HTML, interactions, control
  changes in the editor, reduced motion, console and PHP errors.

## Limits and notes

* The Table of Contents needs JavaScript (there is no server-side list). Without it the widget stays empty.
* Sticky Table of Contents sticks inside its parent container; that container has to be as tall as the article.
* Countdown redirects and "hide" never act inside the editor. Evergreen timers need a cookie or localStorage to survive a
  reload; with both blocked the timer restarts on every page view.
* Flip Box and Animated Headline animate with CSS/JS timers; with "reduce motion" they show the first phrase / flip at once.
* Share Buttons: Pinterest needs an image (the featured image by default); Print and Copy depend on the browser.
* The page still contacts Google Fonts when the kit's default typography uses a Google font (documented in `readme.txt`);
  none of these widgets adds a request.
* Batch 2 (Media Carousel, Testimonial Carousel, Reviews, Hotspot, Code Highlight, Lottie, Video Playlist, Gallery,
  Facebook embeds) is documented in `pro-widgets-2.md`.

## Fixes made along the way

* The editor's widget search threw two uncaught errors (a stale Marionette `ui.input` in `trackWidgetSearch`, and a call to
  a removed upsell template in `appendStickyPromotion`). Both are fixed in `assets/dev/js/editor/regions/panel/pages/elements/`.
