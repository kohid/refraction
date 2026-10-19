# Pro widgets batch 2 (A5) - implementation plan

> Execute with superpowers:executing-plans, one widget per commit, test first.

**Goal:** Media Carousel, Testimonial Carousel, Reviews, Hotspot, Code Highlight, Lottie, Video Playlist, Gallery and four Facebook embed widgets in the `Advanced` category (`refraction-advanced`), inside the existing `modules/pro-widgets/` module.

**Architecture:** Same as batch 1: PHP classes in `modules/pro-widgets/widgets/`, pure logic in `classes/` (covered by `scripts/test-pro-widgets-2.php`), SCSS in `assets/scss/widgets/<name>.scss`, lazy front-end handlers in `assets/js/frontend/handlers/` registered in `assets/dev/js/frontend/elements-handlers-manager.js`. The three carousels share one handler (`pro-carousel`) on the bundled Swiper. Gallery layouts (grid, masonry, justified) are CSS only; filter tabs and the lightbox use the existing `data-refraction-open-lightbox` mechanism. Lottie ships a locally bundled `lottie-web` (MIT) light SVG player in `assets/lib/lottie/`, loaded only on pages with the widget. Code Highlight uses an own tokenizer (`Code_Tokenizer` in PHP, tested; highlighting is done server side so it works without JS, JS only adds the copy button). Facebook widgets are plain `iframe`s to `facebook.com/plugins/...`, rendered only when the owner entered a URL, `loading="lazy"`, no SDK.

**Tech stack:** PHP 7.4+, SCSS, ES modules/Vite, Playwright on real WordPress (SQLite).

## Global constraints

- Namespace `Refraction\Modules\ProWidgets`, text domain `refraction`, CSS prefix `refraction-`, icons `rficon-`.
- No remote calls except owner-configured embeds (YouTube/Vimeo/Facebook) which load only on interaction/when the widget is on the page; no license/upsell, no Atomic Editor, no telemetry.
- Everything escaped; URLs through `esc_url`; reduced motion respected.
- Social Icons extras (item 9): the existing Social Icons widget already has shape, size, columns, per-item colour, hover animation, custom icons; nothing missing, skipped and documented.

## Review focus

- Empty repeater / no images / no URL: nothing harmful printed, editor-only hint.
- Hostile strings (`<script>`, quotes) in titles, review text, hotspot tooltips, code: escaped.
- Single item in a carousel: no Swiper init error.
- Lottie JSON that is invalid or unreachable: widget stays empty, no console error.
- Video Playlist: no request to YouTube/Vimeo until the visitor clicks.

## Tasks (each: failing test first, implement, green, commit)

1. Shared: `Carousel_Trait` (controls, arrows/dots markup), `pro-carousel` handler, test fixtures/check skeleton.
2. Media Carousel. 3. Testimonial Carousel. 4. Reviews (`Review_Logic` stars). 5. Hotspot. 6. Code Highlight (`Code_Tokenizer`).
7. Lottie. 8. Video Playlist (`Video_Url` parsing). 9. Gallery. 10. Facebook Button/Comments/Embed/Page (`Facebook_Url`).
11. Docs, readme changelog and external-service notes, THIRD_PARTY notes, final verification.
