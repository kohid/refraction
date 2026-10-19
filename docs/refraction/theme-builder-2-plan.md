# Theme Builder part 2 Implementation Plan

> Written with superpowers:writing-plans. Execution: native, task by task, test first.

**Goal:** Add Single, Archive, Search Results and Error 404 templates, Preview Settings and the Theme Elements widgets to the Theme Builder module.

**Architecture:** Four new `Theme_Document` types (`single`, `archive`, `search-results`, `error-404`) share the existing rules engine. `Resolver::pick()` gets a location guard (a body template only applies to its own kind of request). A `template_include` filter renders `header + template + footer` through a Refraction canvas (`templates/body.php`), classic and block themes alike; the header/footer still come from the existing logic and fall back to the theme. `Preview_Target` (pure) turns document settings into WP_Query vars; `Preview_Context` switches the global query in the editor's widget render ajax, so widgets show real content. Widgets live in `modules/theme-builder/widgets/`, category `theme-elements`.

**Tech stack:** PHP 8.3 / WordPress 6.x, Marionette control built by `scripts/vite`, SCSS via `scss-build.mjs`, Playwright.

**Spec:** the task brief (roadmap A1 in `docs/refraction/pro-roadmap.md`).

## Global constraints

Namespace `Refraction\Modules\ThemeBuilder`, text domain `refraction`, CSS prefix `refraction-`, icons `rficon-`; no remote calls, no upsell, no Atomic Editor; escape all output.

## Review focus

- A Single template with `include/general` must not show on archives, search or 404 (location guard).
- Search never uses the Archive template and vice versa.
- A template that is draft, trashed or excluded falls back to the theme.
- Post Content inside a template must not recurse infinitely.
- Preview target pointing at a deleted or private post must not fatal.

## Tasks

1. **Pure logic tests first** (`scripts/test-theme-builder-templates.php`): location guard in `Resolver`, `Preview_Target::to_query_vars()`, defaults. Watch fail, implement, pass. Commit.
2. **Documents + locations**: `Single`, `Archive`, `Search_Results`, `Error_404` documents; `Locations_Manager` knows 6 locations (header/footer unchanged); register in `Module`. Commit.
3. **Front end**: `templates/body.php` canvas, `template_include` filter in `Theme_Integration`, CSS enqueue for body templates. Commit.
4. **Admin tabs**: six tabs in `Admin_Page`, glyphs, Add New preselect. Commit.
5. **Preview Settings**: document section, picker control, `Preview_Ajax` (lookup + apply), `Preview_Context` hook into `render_widget`. Commit.
6. **Widgets** (16) with `Theme_Widget_Base`, SCSS `theme-elements.scss`, category registration. Commit per group.
7. **Browser check** `scripts/check-theme-builder-2.mjs` on TT21/Twenty Twenty/TT25: single post/page/CPT, archives, search, 404, fallbacks, include/exclude, header/footer still work, widgets, preview-as, no PHP/JS errors.
8. **Docs + changelog + registration**, full build, zip, reinstall, run all checks.
