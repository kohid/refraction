# Nested widgets (B3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Off-Canvas, Mega Menu and Nested Carousel as always-on container-based widgets (Modal is the Popups module, not built here).

**Architecture:** Three modules (`off-canvas`, `mega-menu`, `nested-carousel`) modelled on `nested-tabs`: a `Widget_Nested_Base` widget, locked child containers, an editor entry (`NestedElementBase` subclass + view), a frontend handler registered in `elements-handlers-manager.js`, and `assets/scss/frontend.scss` (auto-compiled to `widget-<module>.min.css`). Pure option logic lives in `classes/*-logic.php` so it is testable without WordPress.

**Tech Stack:** PHP 7.4, Marionette editor views, Swiper (`refractionFrontend.utils.swiper`, `CarouselBase`), SCSS, Material Symbols via `Core\Utils\Icons`.

**Spec:** `docs/refraction/pro-roadmap.md` row B3.

## Global Constraints

- Namespace `Refraction\Modules\<Name>`, text domain `refraction`, CSS `refraction-`, no remote calls, no telemetry, no Atomic Editor.
- Modules registered after `theme-builder` in `core/modules-manager.php`; SCSS under `modules/<m>/assets/scss/frontend.scss`; editor JS in `scripts/vite/shared/entries.mjs`.
- Do not bump the version; changelog bullets under `= 0.4.0 =`.

## Review Focus

- Panel content hidden from AT and tab order while closed (no focus into a closed off-canvas).
- Focus returns to the trigger on close; ESC and overlay close work; scroll lock released on close and on destroy.
- Mega menu with zero dropdown items, a link-only item, and a dropdown with an empty container.
- Carousel with one slide, with fewer slides than `slides_to_show`, autoplay with reduced motion.
- Same widget twice on a page (ids, hash links, focus traps must not collide).

### Task 1: Off-Canvas
**Files:** `modules/off-canvas/{module.php,classes/off-canvas-logic.php,widgets/off-canvas.php,assets/js/editor/*,assets/js/frontend/handlers/off-canvas.js,assets/scss/frontend.scss}`, `scripts/test-nested.php`
**Interfaces:** `Off_Canvas_Logic::sanitize( array ): array`, `::panel_id( string $widget_id, string $css_id = '' ): string`, `::hash( string $panel_id ): string` (`#refraction-offcanvas:ID`).
- [ ] Failing PHP tests for the logic; implement; pass.
- [ ] Widget + handler + styles; editor shows the panel open.
- [ ] Commit.

### Task 2: Mega Menu
**Interfaces:** `Mega_Menu_Logic::sanitize( array ): array`, `::item_ids( string $widget_id, int $index ): array` (`trigger`, `panel`), `::next_index( int $current, int $count, string $key ): int` (arrow/Home/End).
- [ ] Failing tests; implement; widget (repeater `items`, one locked container per item, only `dropdown` items render theirs); handler (hover delay, click, keyboard, mobile toggle -> accordion or off-canvas); styles; commit.

### Task 3: Nested Carousel
**Interfaces:** `Carousel_Logic::sanitize( array ): array` (effect, pagination, per-view clamps).
- [ ] Failing tests; implement; widget (repeater `slides`, container per slide, `.swiper-slide`); handler on `CarouselBase`; editor re-init on add/remove/duplicate; commit.

### Task 4: Verification
- [ ] `scripts/check-nested.mjs` (classic and block theme), full build + zip, fresh-site reinstall, the existing checks; `docs/refraction/nested.md`; changelog.
