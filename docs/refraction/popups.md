# Popups

A Popup is a Theme Builder template (module `modules/popups`, namespace `Refraction\Modules\Popups`) that opens on a
trigger and appears only where its display conditions say so. Original code. Plan: [popups-plan.md](popups-plan.md).

## Using it

1. Refraction > Theme Builder > **Popups** > **Add New** (or Saved Templates > Add New > Popup).
2. Design it in the normal editor. The preview shows the real popup: overlay, box and close button. Document settings
   (gear icon) hold everything below.
3. **Display Conditions** (same control and rules as header and footer templates: entire site, pages, post types,
   archives, search, 404, visitor rules...). A popup without an Include rule, or not published, is never printed.
4. **Triggers** and **Advanced Rules**, then **Publish**.

## Settings

| Section | Settings |
|---|---|
| Popup Layout | width, custom height, horizontal and vertical position (per device), distance from the screen edge, padding |
| Overlay | hide, colour, opacity, background blur |
| Popup Box | background (colour or gradient), border, corner radius, shadow |
| Close Button | show, icon (Material Symbols, bundled), corner, offsets (negative = outside), size, colours, hover colours, radius |
| Animation | entrance and exit: none, fade, zoom, slide up / down / left / right, duration in ms; skipped for `prefers-reduced-motion` |
| Behavior | prevent page scroll, close on overlay click, close on Escape, auto close after N seconds |
| Triggers | page load (delay), scroll (percentage or element), scroll back up, click (CSS selector), exit intent, inactivity, after N page views |
| Advanced Rules | frequency, do not show again, visitors (everyone, logged in, logged out, roles), devices, referrer, URL parameter, schedule, priority |

Style settings are written as CSS under `.refraction-popup-{ID}`, so they update live in the editor and are loaded
with the popup's CSS file.

## Triggers

* **Page load**, **scroll**, **scroll back up**, **exit intent**, **inactivity**, **page views** are automatic and obey
  the Advanced Rules; several can be on, the first one that fires wins.
* Exit intent: on a desktop the pointer leaves through the top of the window. On touch screens there is no pointer:
  after the first touch or scroll the page adds one history entry, so the back button opens the popup instead of
  leaving (the next back press leaves normally), and a fast scroll up near the top counts too.
* **After N page views** counts the pages of the browser session on which a popup is loaded (the script is only
  loaded where a popup matches).
* **Click**: any element matching the selector opens the popup. Links, the JavaScript API and the event below open it on
  request and ignore frequency, device, referrer, parameter and schedule rules (the visitor asked for it); the display
  conditions still decide whether the popup exists on the page.
* **Links**: the **Popup** dynamic tag (database icon on any link control) gives `#refraction-popup:open:ID`,
  `#refraction-popup:toggle:ID` or `#refraction-popup:close`. In saved markup the colons are percent-encoded because
  WordPress strips unknown "protocols" from links; the runtime decodes them. Plain links in an HTML widget may use the raw
  form. `:close:ID` also works.
* **JavaScript**: `window.refractionPopup.open(id)`, `.close(id)` (no id = the top popup), `.toggle(id)`,
  `.isOpen(id)`, `.closeAll()`. Events: dispatch `refraction:popup:open|close|toggle` with `detail: { id }` on `document`;
  listen for `refraction:popup:shown` and `refraction:popup:hidden` (`detail: { id, root, reason }`).
* **Forms**: the form actions **Open popup** and **Close popup** (the second one defaults to the popup the form is in)
  are returned with the ajax response and run in the browser. Without JavaScript the form posts normally and they do
  nothing.

## Advanced rules

State lives in the browser: `localStorage` / `sessionStorage`, with a cookie fallback when those are blocked
(`refraction_popup_{ID}`, 400 days). Nothing is sent to the server.

* **Show**: every time, only once (shows again after N days, default 30, 0 = never), every N page visits (shows on visits 1,
  N+1, 2N+1...), once per session, once per day (24 hours).
* **Do not show again**: after a form inside the popup was sent (default on) or when an element with
  `data-refraction-popup-dismiss` inside it is clicked; kept for N days (default 365).
* **Visitors** (everyone, logged in, logged out, optional roles) is decided on the server. The Theme Builder
  Visitor display conditions work too.
* **Devices** use the screen width and your breakpoints: mobile up to the mobile breakpoint, tablet up to the tablet one.
* **Referrer**: a search engine (Google, Bing, DuckDuckGo, Yahoo, Baidu, Yandex, Ecosia, Startpage, Qwant, Ask, Naver,
  Seznam, Brave), this site, another site, or an address containing text. `document.referrer` can be empty because of
  privacy settings.
* **URL parameter**: name and optional exact value.
* **Schedule**: start and end (site time zone), and a daily time window (may cross midnight). The server drops popups
  that ended or have not started yet; the browser checks the daily window. The offset of the site time zone is fixed at
  print time, so a daylight saving change can move the window by an hour on cached pages.
* **Priority** and queue: popups that trigger together open one at a time, highest priority first (then lowest ID); the
  next one opens when the current one closes (frequency is checked again). Popups the visitor opens stack on top of each
  other (nested popups), each with its own Escape step and focus return.

## What the server prints

A popup is printed in the footer only when it is published, a Theme Builder Include rule matches and no Exclude rule
does, the audience and date range allow it, and the request is a normal public page: never in the editor, a preview
(`?preview`), admin, ajax, feeds, embeds, the customizer, or on another template's own page. A page without a match gets
no markup, no script and no style. At most 12 popups per page. Each popup is hidden, with its widgets inside a
`<template>`; they are put on the page (and the widget scripts, forms and carousels initialised) the first time it
opens.

## Accessibility

`role="dialog"` and `aria-modal="true"` on the box, labelled by the first heading of the content (the popup title is the
fallback), focus moves into the dialog on open, Tab and Shift+Tab stay inside, Escape closes the top popup, focus
returns to the element that opened it. The close button has a label. Animations are skipped for reduced motion. The
page scroll is locked with `overflow: hidden` plus the scrollbar width as padding, so the page neither jumps nor shifts.

## Security

Settings are normalised by `Popup_Rules::normalize()` (whitelists, clamped numbers, tags stripped) before they reach the
page as one JSON attribute (escaped); selectors only ever go to `querySelector`. No inline script is printed except the
standard localized settings (`refractionPopups`: the two breakpoints). The runtime makes no network request.

## Code

`classes/popup-rules.php` (pure rules, `scripts/test-popups.php`), `classes/popup-manager.php` (which popups, printing),
`classes/popup-renderer.php` (markup), `documents/popup.php` (settings), `templates/preview.php` (editor canvas),
`assets/js/frontend.js` and `assets/scss/frontend.scss` (runtime and styles). The rule logic exists twice, in PHP
(tested standalone, used for audience and date range) and in `frontend.js` (frequency, device, referrer, parameter,
daily window); keep both in step.

## Tests

`php scripts/test-popups.php` (87 checks) and `node scripts/check-popups.mjs --site DIR --port N` (real classic and block
themes, every trigger with real input, rules, conditions, forms, animations, accessibility, editor). Screenshots go to
`/tmp/popups-shots`.

## Limits

* Frequency state is per browser; there is no server-side counting.
* Popups that need the visitor's page to be cached per URL parameter or referrer work because those rules run in the
  browser; the audience rule is server side, so page caches must vary by login state (usual practice).
* Exit intent on touch screens uses the history trick described above and is a heuristic.
* Nested popup links work only for popups whose display conditions also match the current page.
* A popup that is an popup template imported from another builder is not supported.
