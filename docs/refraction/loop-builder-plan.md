# Dynamic Content and Loop Builder Implementation Plan

> Written with superpowers:writing-plans. Execution: native, task by task, test first.

**Goal:** Make dynamic tags work for real in Refraction (tag set, editor switcher, loop context) and add the Loop Builder: query controls, `Loop Item` template type, and the Posts, Portfolio, Loop Grid, Loop Carousel, Archive Posts and Taxonomy Filter widgets. Always on, offline, original code.

**Architecture:** Two modules. `modules/dynamic-tags` (existing, empty) gets tags under `tags/`, a `Context` class that answers "which post / term is current" (loop item stack, then global post, then queried object) and pure helpers. `modules/loop-builder` (`Refraction\Modules\LoopBuilder`) holds the pure query layer (`Query_Args`, `Pagination`, `Context_Token`), a WP layer (`Query_Runner`, `Loop_Renderer`, `Rest_Controller`, `Query_Lookup`), the `Loop_Item` document, the `Group_Control_Query` and `refraction_autocomplete` control, and the six widgets. Widgets re-render themselves for pagination, load more and filtering: the REST endpoint loads the saved widget settings from the document (never trusts client settings), so a visitor can only pick page number, filter term and a signed context.

**Tech stack:** PHP 8 / WordPress 6.x, Marionette editor control built by `scripts/vite` (`BASE_ENTRIES`), a standalone frontend script (`loop-builder-frontend`) that attaches handlers through `refractionFrontend.hooks`, Swiper through the existing `CarouselBase`, Playwright for the browser check.

## Findings about the earlier removal of Pro gating

* `modules/dynamic-tags` registered no tags (`get_tag_classes_names()` returns `[]`), so the editor had nothing to offer.
* `control-behavior.js` still ran the "feature is Pro" branch: with no Pro it rendered the switcher as a teaser and its click called `refraction.promotion.showDialog` and `dynamicPromotionURL`, both removed. Fixed to show the switcher only when tags exist for the control, and to remove the promo template code.
* `Controls_Stack::sanitize_settings()` dereferenced a null when a saved tag text was malformed; guarded.
* Controls that support dynamic content already declare categories (text, textarea, wysiwyg, url, media, gallery, number, color, date-time); a widget turns it on with `dynamic => [ active => true ]`.

## Tasks

1. **Pure logic tests then code** (`scripts/test-loop-builder.php`, `scripts/test-dynamic-tags.php`): `Query_Args::build()` (post types, term/author include and exclude, specific posts, orderby/order whitelist, offset, per page, ignore sticky, avoid duplicates, related mode, status always publish, no password posts), `Pagination` (page list with ellipsis, prev/next, clamping), `Context_Token` (sign/verify, tamper, expiry-free), `Contact_Url` (mailto/tel/sms/whatsapp/skype builders and sanitising), `Request_Param` sanitiser.
2. **Dynamic tags**: `Context`, groups, tags (post, site, archive, author, contact, internal url, lightbox, popup stub, custom field, ACF guarded), manager guards, editor JS fix, loop item hook. Browser check: switcher on supported controls, tag renders on single page and in a loop.
3. **Query layer in WordPress**: `Query_Runner` (dedupe registry), `Query_Lookup` ajax (nonce + capability), `refraction_autocomplete` control + editor JS, `Group_Control_Query`.
4. **Loop Item document + Loop_Renderer**: type `loop-item`, preview post setting, template dialog, Theme Builder tab (small filter hook in `Admin_Page`).
5. **Widgets and REST**: Posts (skins), Archive Posts, Portfolio, Loop Grid, Loop Carousel, Taxonomy Filter, `Rest_Controller`, frontend script, SCSS.
6. **Browser check** `scripts/check-loop-builder.mjs`, zip, reinstall, run all existing checks.
7. **Docs**: `docs/refraction/loop-builder.md`, `docs/refraction/dynamic-tags.md`, readme changelog, roadmap status.

## Review focus (inputs the spec implies)

* A private, draft, future or password protected post never appears for an anonymous visitor in any widget or via REST/ajax.
* A Loop Grid whose template contains the same Loop Grid (or a template that includes itself) renders once, not forever.
* Tampered REST input (page 0, huge page, bad widget id, foreign post id, term of a taxonomy the widget does not use) is rejected or clamped.
* A tag whose value is empty falls back to the fallback text; before/after are only added to a non-empty value.
* ACF not installed: no tag references ACF functions, editor and front end work.
* Empty query: widgets print their "nothing found" text instead of a broken layout.
