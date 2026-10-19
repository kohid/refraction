# Popups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** A `popups` module: a Popup template type (Theme Builder family) with triggers, visitor rules, display conditions, animations and an accessible vanilla JS runtime.

**Architecture:** `Popup` extends `Theme_Document` (location `popup`), so the Display Conditions control and the rules store (`_refraction_conditions`, option bucket `popup`) are reused. A pure class `Popup_Rules` normalises document settings into one public config (server side, sanitised) and holds the rule logic (frequency, schedule, devices, referrer, URL parameter, audience), mirrored in `frontend.js`. `Popup_Manager` picks matching popups (`Conditions_Manager::match`), renders their markup server side inside `<template>` and enqueues the small runtime only when something is printed.

**Tech Stack:** PHP 7.4+, Refraction controls and documents, vanilla JS (Vite entry), SCSS, Playwright check.

**Spec:** roadmap item B1 in `pro-roadmap.md`; user documentation in `popups.md`.

## Global Constraints

- Namespace `Refraction\Modules\Popups`, text domain `refraction`, CSS `refraction-popup`, no remote calls, no telemetry, no jQuery dependency in the runtime.
- Nothing is printed on pages without a match; never printed in the editor, the preview of a normal page, admin, ajax, feeds, or on another template's own view.
- Icons: bundled Material Symbols via `Icons::svg`.

## Review Focus

- Two popups opening on the same load: highest priority first, the next after the first closes.
- Frequency state unreadable (private mode, cookies only): must still work with the cookie fallback.
- Hostile settings (selector, referrer, numbers, markup) never reach the page unescaped.
- Popup opened while another one is open (nested): stacking and focus return.
- Reduced motion: no animation, same behaviour.

---

### Task 1: Rules engine (pure)

**Files:** Create `modules/popups/classes/popup-rules.php`; Test `scripts/test-popups.php`.

**Produces:** `Popup_Rules::normalize(array $settings): array`, `frequency_allows(array $rules, ?array $state, int $now, int $session_shown): bool`, `date_range_allows`, `time_of_day_allows`, `device_allows`, `referrer_allows`, `param_allows`, `audience_allows`.

- [ ] Write `scripts/test-popups.php` first (once, every N, session, day, expiry, dismissed, schedule, devices, referrer, params, roles, sanitising); run: it fails (class missing).
- [ ] Implement the class; run: all pass.
- [ ] Commit.

### Task 2: Document, module, admin tab, manager (server)

**Files:** `modules/popups/module.php`, `documents/popup.php`, `classes/popup-manager.php`, `classes/popup-renderer.php`, `templates/preview.php`, `core/modules-manager.php`.

- [ ] Popup document with all controls (layout, close button, animation, behaviour, triggers, advanced rules); selectors write to `{{WRAPPER}} .refraction-popup__*` with wrapper `.refraction-popup-{ID}`.
- [ ] Manager: candidates (`Conditions_Store::get_candidates('popup')`), match, audience, date range, priority sort, render markup, enqueue runtime only if printed.
- [ ] Preview template: overlay + box on the popup's own URL.
- [ ] Theme Builder tab through `refraction/theme_builder/admin_tabs`.
- [ ] Commit.

### Task 3: Runtime and styles

**Files:** `modules/popups/assets/js/frontend.js`, `assets/scss/frontend.scss`, `scripts/vite/shared/entries.mjs`, `scripts/vite/plugins/scss-build.mjs`.

- [ ] Open/close API, queue and priority, triggers, storage with cookie fallback, focus trap, scroll lock, animations, hash links, events.
- [ ] Commit.

### Task 4: Integrations

- [ ] Dynamic tag Popup returns `#refraction-popup:{open|close|toggle}[:ID]` with a popup select.
- [ ] Forms actions "Open popup" / "Close popup" returned in the response; forms init on popup open.
- [ ] Commit.

### Task 5: Browser check, docs, release verification

- [ ] `scripts/check-popups.mjs` on a fresh site with a classic and a block theme, screenshots in `/tmp/popups-shots`.
- [ ] `popups.md`, changelog under `= 0.4.0 =`.
- [ ] Full build, zip, reinstall, run the listed checks, commit.
