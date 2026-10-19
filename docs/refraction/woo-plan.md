# WooCommerce builder (B4) implementation plan

> For agentic workers: use superpowers:executing-plans; steps use checkboxes.

**Goal:** a `woocommerce` module that, only when WooCommerce is active, adds six Theme Builder template types, product conditions, 23 widgets and the Preview Settings for them.

**Architecture:** the module sits beside `modules/theme-builder` and plugs into it through four small extension points (registerable locations in `Location_Scope`/`Locations_Manager`, filters in `Preview_Target`, a lookup filter in `Conditions_Ajax`, a glyph filter in `Admin_Page`). Conditions are one new `woocommerce` condition class that reads a `Woo_Context` interface, so the matching logic is testable without WordPress. Widgets render server side with WooCommerce template functions inside a `Product_Context` that sets `$product`/`$post`. `Module::is_active()` is `class_exists( 'WooCommerce' )`, so nothing is registered otherwise.

**Spec:** the B4 row of `docs/refraction/pro-roadmap.md` and the wave B brief.

## Global constraints
Namespace `Refraction\Modules\Woocommerce`, text domain `refraction`, CSS `refraction-`, icons `rficon-`/Material Symbols helper; no remote calls, no telemetry, no Atomic Editor; all output escaped; ajax we add checks capabilities; only published products are shown to visitors.

## Review focus (each has a test)
1. Rule strings with bad arguments (`woocommerce/product/abc`, `woocommerce/type/`) are rejected by `Rule::parse`. `scripts/test-woocommerce.php`.
2. A product in an excluded category must not get the template (exclude beats include). test-woocommerce.
3. Cart, checkout and order-received are mutually exclusive locations. test-woocommerce.
4. A draft/private product never renders in the Products widget or Related/Upsells. check-woocommerce.
5. With WooCommerce inactive: no Woo tabs, no errors, pages load. check-woocommerce (deactivated phase).

## Tasks
- [ ] 1. Theme Builder extension points + `Woo_Context` + `Conditions\Woocommerce` + `scripts/test-woocommerce.php` (test first, then code). Commit.
- [ ] 2. Module, six documents, locations registration, admin tabs, preview kinds/lookups. Commit.
- [ ] 3. `Product_Context`, `Woo_Assets`, widget base, product widgets (title, images, price, rating, stock, meta, short description, content, data tabs, additional info, upsells, related, add to cart). Commit.
- [ ] 4. Products + Product Categories (query control), Menu Cart (+ JS/SCSS), Cart, Checkout, My Account, Purchase Summary, Order Tracking, Notices, Breadcrumb. Commit.
- [ ] 5. Register JS/SCSS entries, modules-manager line, readme changelog, docs/refraction/woocommerce.md. Commit.
- [ ] 6. `scripts/check-woocommerce.mjs` (classic + block theme, WooCommerce on and off), fix what it finds with systematic debugging. Commit.
- [ ] 7. Final: php -l, full build + zip, fresh install, run all check scripts with and without WooCommerce.
