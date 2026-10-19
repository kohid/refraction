# Pro-style features roadmap

Goal (owner): Refraction contains the whole feature set of the Elementor free plugin and of Elementor Pro, built in, always on, no license, no toggles, no remote services. Everything is written fresh for Refraction; no code is copied from any commercial or license-restricted source.

Status key: DONE = shipped and browser-checked, TODO = not started.

## Already in the free base (inherited, working)

Containers, sections/columns, the core widget set, global colors and fonts (kit), page/post documents, local template library, import/export of kits, role manager, element manager, custom icons via the kit, Floating Elements, Landing Pages, Link in Bio.

## Wave A

| # | Module | Scope | Status |
|---|--------|-------|--------|
| A1 | Theme Builder part 2 | Single (post/page/CPT), Archive, Search Results, 404 templates and the Theme Elements widgets (Site Logo, Site Title, Site Tagline, Page Title, Post Title, Post Content, Post Excerpt, Featured Image, Post Info, Author Box, Post Comments, Post Navigation, Breadcrumbs, Archive Title, Sitemap, Search Form) | TODO |
| A2 | Dynamic content and Loop Builder | Dynamic tags (post, site, user, archive, author, ACF-compatible fields when ACF is present, custom fields), query controls, Posts, Portfolio, Loop Grid, Loop Carousel, Archive Posts, Taxonomy Filter, Loop Item template type | TODO |
| A3 | Forms | Form widget (fields, validation, steps, multi-step), actions (email, redirect, webhook, mailchimp-style HTTP integrations as generic webhooks, collect submissions), form submissions admin (list, view, export CSV, spam protection: honeypot and a local math/time check), Login widget | TODO |
| A4 | Pro widgets batch 1 | Nav Menu, Slides, Price List, Price Table, Flip Box, Call to Action, Animated Headline, Countdown, Share Buttons, Blockquote, Progress Tracker, Table of Contents: DONE (see pro-widgets.md). Still TODO: Media Carousel, Testimonial Carousel, Reviews, Hotspot, Code Highlight, Lottie, Video Playlist, Gallery (multiple/masonry), Social Icons extras, Facebook widgets as plain embeds (no SDK calls unless user-initiated) | PARTIAL |

## Wave B

| # | Module | Scope | Status |
|---|--------|-------|--------|
| B1 | Popups | Popup template type, triggers (page load, scroll, exit intent, click, inactivity, after N views), conditions via the shared engine, entrance/exit animations, close rules, advanced rules (once per session/visit) | TODO |
| B2 | Site-wide extras | Custom CSS (element, page, global), Custom Code snippets (head/body/footer, with conditions), Display Conditions per element, Custom Attributes, Motion Effects (scroll, mouse), Sticky, Custom Fonts and Custom Icons upload, Global Widgets-style reusable templates, Notes | TODO |
| B3 | Mega Menu, Nested Carousel, Off-Canvas, Modal | Interactive nested widgets | TODO |
| B4 | WooCommerce builder | Product, Product Archive, Cart, Checkout, My Account, Purchase Summary templates; Woo widgets (Products, Add to Cart, Title, Images, Price, Rating, Stock, Meta, Short Description, Content, Data Tabs, Additional Info, Upsells, Related, Menu Cart, Cart, Checkout, My Account, Order Tracking, Notices, Categories, Breadcrumb); loads only when WooCommerce is active | TODO |
| B5 | Integrations and polish | Webhook-based form integrations, activity log, dashboard overview, accessibility pass | TODO |

## Rules for every module

- Namespace `Refraction\Modules\<Name>`, text domain `refraction`, CSS prefix `refraction-`, icon prefix `rficon-`.
- Registered in `core/modules-manager.php` (one line per module).
- No remote calls, no license or upsell code, no Atomic Editor, no telemetry.
- Written test-first; a Playwright check script `scripts/check-<module>.mjs` and, where logic is pure, a standalone PHP test `scripts/test-<module>.php`.
- The compiled JS/CSS must be in the release zip (entries in `scripts/vite/shared/entries.mjs`, SCSS in `scripts/vite/plugins/scss-build.mjs`).
- Each module ends with a short `docs/refraction/<module>.md` (what it does, limits).
