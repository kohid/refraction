# Pro widgets batch 1 (A4) - implementation plan

> Execute with superpowers:executing-plans, one widget per commit.

**Goal:** twelve built-in widgets in a new editor category `Advanced` (id `refraction-advanced`).

**Architecture:** one module `modules/pro-widgets/` (`Refraction\Modules\ProWidgets`). Each widget is a class in `widgets/`, extends `Base\Pro_Widget` (category, shared helpers, escaped-output helpers). Pure logic (share URLs, countdown date maths, ToC numbering rules, price/ribbon formatting) lives in `classes/` and is covered by `scripts/test-pro-widgets.php`. Each widget has `assets/scss/widgets/<name>.scss` (auto-compiled by the widgets-css pipeline to `assets/css/widget-<name>.min.css`) and, where needed, a front-end handler `assets/js/frontend/handlers/<name>.js` registered in `assets/dev/js/frontend/elements-handlers-manager.js`. The editor previews by server-side render (no JS templates), so every control change is reflected by the same PHP that renders the front end. Slides reuses `CarouselHandlerBase` / Swiper.

**Tech stack:** PHP 7.4+, SCSS, ES modules through Vite, Playwright against a real WordPress (SQLite).

## Global constraints

- Namespace `Refraction\Modules\ProWidgets`, text domain `refraction`, CSS prefix `refraction-`, icons `rficon-`.
- No remote calls, no third-party scripts, no license/upsell code, no Atomic Editor.
- All output escaped; URLs through `esc_url`; user text through `esc_html`/`wp_kses_post`.
- Reduced motion respected (CSS `prefers-reduced-motion` plus JS check).
- Registered once in `core/modules-manager.php` after `theme-builder`.

## Review focus

- Nav Menu with no menu selected / empty menu: renders nothing harmful, shows an editor-only hint.
- Countdown with an invalid or past date, and evergreen cookie that is blocked: expires cleanly, no JS error.
- ToC on a page with no headings, duplicate heading text, headings without ids: ids are unique, widget hides or shows an empty message.
- Share buttons on a page with a very long title or non-ASCII characters: URLs are percent-encoded.
- Slides with a single slide: no Swiper init error, no arrows.

## Tasks (priority order; each ends with tests green and a commit)

1. Scaffold: module, category, base class, `scripts/test-pro-widgets.php` skeleton, `scripts/check-pro-widgets.mjs` skeleton (site boot, login, open editor, search panel).
2. Nav Menu (+ handler `nav-menu`).
3. Slides (+ handler extends `CarouselHandlerBase`).
4. Price List.
5. Price Table.
6. Flip Box (+ keyboard/touch toggle handler).
7. Call to Action.
8. Animated Headline (+ handler).
9. Countdown (+ handler, `Countdown_Logic`).
10. Share Buttons (+ `Share_Links`, copy/print handler).
11. Blockquote.
12. Progress Tracker (+ handler).
13. Table of Contents (+ handler).
14. Docs `docs/refraction/pro-widgets.md`, readme changelog, final verification (lint, build, zip, reinstall, all check scripts).

Per widget: write the PHP/Playwright assertion first (fails), implement, run, commit.
