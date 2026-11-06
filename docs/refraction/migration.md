# Moving a site from Elementor (module `migration`, 0.38.0)

Install and activate Refraction next to Elementor (both run together), convert, check, then deactivate and delete
Elementor, Elementor Pro and its add-ons.

## Where

- **Pages / Posts lists**: "Convert to Refraction" under each item built with Elementor, and the bulk action of the
  same name (all post types with an admin list, landing pages included). Under a converted item, "Back to Elementor"
  (while Elementor is active and its data is there).
- **Refraction > Move from Elementor** (shown only when the site has Elementor data): what is converted and what is
  left, "Convert everything" (15 posts per request, each request redirects to the next batch), the widgets kept as
  HTML per page, and what to do next.

## What a conversion does (`Classes\Importer::convert_post`)

1. The first time (`prepare()`): the **global styles** (`import_kit()`: Elementor's active kit page settings, which hold
   the global colors and fonts, typography, buttons, layout, breakpoints, merged into Refraction's active kit) and
   every **template** (`import_templates()`): each Elementor library post (not the kit) becomes a `refraction_library`
   post with the same title, status and type (`single-post`/`single-page`/`product` → `single`, `product-archive` →
   `archive`, `widget`/`container` → `section`). Ids are given out first and kept in the option
   `refraction_migration_templates` (theirs → ours) so templates showing templates point at the converted ones.
   Header, footer, single, archive, search results, 404 and popup templates keep their display conditions
   (`Conditions_Store::save_rules`); popups keep their page load, scroll (down/up/to an element), inactivity and exit
   triggers as `rp_*` settings. Templates added to Elementor later are picked up by the next conversion.
2. The page's elements and page settings go through `Classes\Converter` and are written as `_refraction_data`,
   `_refraction_page_settings`, `_refraction_edit_mode`, `_refraction_template_type`; `_wp_page_template`
   `elementor_canvas` / `elementor_header_footer` / `elementor_theme` become `refraction_canvas` /
   `refraction_header_footer` / `default`.
3. Elementor's `_elementor_edit_mode` is removed, so Elementor no longer draws the page; its data stays. What undo
   needs is in `_refraction_migrated` (with the widgets kept as HTML). `revert()` puts it back.

## The converter (`Classes\Converter`, pure, tests: `php scripts/test-migration.php`)

- Containers, sections and columns, and every setting, stay (Refraction started from the same format).
- Widget names: a Refraction widget of the same name, else `refraction-<name>` (Pro widgets: animated headline, form,
  nav menu, slides, ...), else `theme-<name>`, else the shop names (`woocommerce-product-price` → `woo-product-price`,
  table `NAMES` for the irregular ones).
- Template widget and global widgets → the **Template** widget (`refraction-template`) showing the converted template;
  `[elementor-template id="5"]` → `[refraction-template id="<new>"]`; `template_id` / `popup_id` settings moved.
- Inside settings: dynamic tags `[elementor-tag ...]` → `[refraction-tag ...]`; popup links
  (`#elementor-action:action=popup:open&settings=<base64>`) → `#refraction-popup%3Aopen%3A<new id>`; the Elementor
  icon font (`eicon-*`, library `eicons`) → `rficon-*` / `rficons`; class names in `custom_css` (`.elementor-…`) →
  `.refraction-…`. Global colors/fonts references (`__globals__`) stay as they are. File paths and plain text are left.
- A widget Refraction has no version of (add-ons such as Essential Addons) or an element kind it lacks becomes an
  **HTML widget** with what it showed, drawn by Elementor during the conversion (scripts removed), keeping its
  advanced settings (spacing, position, CSS classes, plus `rf-imported-widget rf-imported-<name>`). Without Elementor
  active, the HTML widget only names it. The notice and the Move page list these per page.

## Not moved

Custom fonts and custom icon sets uploaded to Elementor (upload them again under Refraction > Custom Fonts / Custom
Icons with the same names), form submissions already received, and Elementor-only settings of add-on widgets.

The Elementor names are assembled from parts in `Classes\Upstream` (and in the check scripts) so that
`scripts/rename-to-refraction.mjs` does not rewrite them.

## Checks

`php scripts/test-migration.php`; `node scripts/check-migration.mjs --site DIR --port N` installs Elementor and
Essential Addons from wordpress.org on the test site, builds pages, a section, a header and a popup with them, then
converts one page from Pages (and checks it, its editor and "Back to"), converts everything from the Move page and
checks the pages with Elementor and the add-on deactivated.

## Also in 0.38.0

The "Full width" page template (`refraction_header_footer`) on block themes renders the header and footer as
template-part blocks, so a Theme Builder header or footer replaces them (it used `block_template_part()`, which the
Theme Builder could not replace).
