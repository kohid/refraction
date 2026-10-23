# WooCommerce builder

The `woocommerce` module adds WooCommerce templates and widgets to the Theme Builder. It loads only when WooCommerce is active (`Module::is_active()` is `class_exists( 'WooCommerce' )`): with WooCommerce off, no template type, tab, condition, widget or script is registered and nothing changes on the site.

Tested with WooCommerce 11.2.1, WordPress 7.1.3, Twenty Twenty-One (classic theme) and Twenty Twenty-Five (block theme). Plan: `docs/refraction/woo-plan.md`. Check: `scripts/check-woocommerce.mjs`; pure-logic test: `php scripts/test-woocommerce.php`.

## Template types

Refraction > Theme Builder gets six tabs when WooCommerce is active. Each template is placed by display conditions and shown between your header and footer, on classic and block themes, like Single and Archive.

| Tab | Shows on | Preview Settings |
| --- | --- | --- |
| Products (Single Product) | a product page | a product |
| Product Archive | the shop, product category, tag and product search pages | the shop, or a product category or tag |
| Cart | the cart page | a page (for the Post Content widget) |
| Checkout | the checkout page (not order received) | a page |
| Purchase Summary | the order received (thank you) page | an order |
| My Account | every My Account page and endpoint | a page |

A Product template wins over a generic Single template on a product page, and the same for the other types (they are tried first). When nothing matches, the theme renders the page.

### Conditions

A new rule group, "WooCommerce", is offered in every template's Display Conditions (include and exclude): all WooCommerce pages, products (all, one product by ID), product in a category (child categories count), product with a tag, product type (simple, variable, grouped, external), products on sale, products in stock, shop page, all product archives, product category archives (any or one), product tag archives, cart, checkout, order received, My Account (all, or one endpoint such as orders, downloads, addresses, account details). The most specific rule wins (ID 100, category/tag/type 60, on sale/in stock 50, everything else 30 or lower); excludes always win; ties go to the most recently modified template. Product search results count as the shop, because WooCommerce does.

Rule strings are `include|exclude/woocommerce/...`, for example `include/woocommerce/product_cat/12`. The conditions engine and storage are the Theme Builder's.

### Block themes and the Cart and Checkout blocks

The templates replace the page with the Theme Builder body. Put the **Cart** or **Checkout** widget in the template: they print WooCommerce's classic shortcodes (`[woocommerce_cart]`, `[woocommerce_checkout]`), which work with every payment gateway that supports the classic checkout. WooCommerce's **Cart and Checkout blocks are a different system**: the widgets do not print them. To keep the blocks, put a Post Content widget in the template instead: it prints the content of the page, which can hold the blocks (or the shortcodes). Use one or the other in a template, not both.

## Widgets

All 23 are in the "WooCommerce" panel category, render on the server with WooCommerce's own template functions inside a `.woocommerce` wrapper (so its stylesheet applies), are never stored in post content, and work in the editor preview with real data. A product widget shows the current product (product page, template preview, or an item of a Loop Grid) or the product whose ID is typed into its Product section.

Products (query control, current archive, sale/featured, order by price/popularity/rating/date, columns, pagination, card parts) - Product Categories - Product Title - Product Images (main image, thumbnails, hover zoom, Refraction lightbox) - Product Price - Product Rating - Product Stock - Product Meta - Product Short Description - Product Content - Product Data Tabs - Additional Information - Upsells - Related Products - Add to Cart (WooCommerce's form for every product type, optional ajax, quantity toggle, button text and style) - Menu Cart (icon, count, total, dropdown or off-canvas mini cart, updates through WooCommerce cart fragments) - Cart - Checkout - My Account - Purchase Summary - Order Tracking - WooCommerce Notices - Woo Breadcrumbs.

Scripts and styles WooCommerce only loads on its own pages are requested by the widget that needs them (`Woo_Assets`). The editor page is an admin request, where WooCommerce does not start the cart; the module starts it for the widgets that need it.

## Security

All widget output is escaped or WooCommerce's own markup; settings go through `Settings` (whitelists and clamps). Visitors only see published, non-password-protected products (`Product_Context::can_show()`); drafts and private products show only to people who may edit them. The Products query always asks for published products, hides "hidden" catalog items and out-of-stock items when the store hides them. Ajax add to cart posts the same form WooCommerce would, so WooCommerce validates it. The only ajax the module adds is the order lookup of Preview Settings, which needs `edit_shop_orders` plus the Theme Builder nonce.

## Limits

- Cart and Checkout **blocks** are not widgets (see above); the Checkout widget is the classic form. Only Cash on Delivery was exercised end to end; other gateways and extensions (subscriptions, bookings, memberships, multi-currency) were not tested, and WooCommerce Payments/Stripe style express buttons are WooCommerce's.
- Product Data Tabs: WooCommerce does not load its classic product page script on block themes, so a small fallback in the module's script runs the tabs; the review form keeps a plain rating dropdown there.
- Product Images is its own gallery (not WooCommerce's FlexSlider/PhotoSwipe markup); the lightbox shows the selected image group of the widget.
- No product structured data (JSON-LD) is printed by the Single Product template; use an SEO plugin.
- The Loop Grid prints every published product of its query, including products WooCommerce hides from the catalog.
- No Variation Swatches, wishlist, compare or product filters; Product Categories has no carousel.
- "Current archive" in Products shows what WooCommerce's main query found (sorting and per-page come from WooCommerce).
- The test site uses SQLite, where WooCommerce's stock reservation SQL fails; the fixtures turn "Hold stock" off. MySQL sites are unaffected.
