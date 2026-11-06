# Just Refraction theme

A plain WordPress theme for Refraction sites, in `themes/just-refraction` (written from scratch, GPL-3.0-or-later). Built as `dist/just-refraction.zip` by `node scripts/build-theme.mjs` (run by `build-release.mjs`) and attached to every GitHub release next to `refraction.zip`. It is not part of the plugin zip. Added with plugin 0.22.0, theme 1.0.0.

Browser check: `node scripts/check-just-refraction.mjs --site DIR --port N` (installs `dist/just-refraction.zip` on a site that has Refraction).

## What it does and does not do

- **No styles on Refraction pages**: on a page built with Refraction the theme prints only the page skeleton (`wp_head`, `body_class`, `wp_body_open`, a `main#content` landmark, `wp_footer`) and the content. No title (Refraction draws it), no scripts, no CSS except one inline accessibility rule (`.screen-reader-text` and the skip link shown on keyboard focus) and the global fonts below.
- **Global fonts, on every page** (theme 1.1.0, `assets/fonts.css`): the theme follows Refraction > Site Settings > Global Fonts: **Text** for text, **Primary** for headings and the site title, **Secondary** for post details and the footer, **Accent** for the menu and buttons, through the `--e-global-typography-*-font-family` variables Refraction's site settings put on the body. On pages not built with Refraction the theme loads those site settings and their font files itself (`just_refraction_site_settings()`, Refraction's kit CSS). Every rule is in `:where()`, so it has no weight: Site Settings > Typography, widgets' own fonts and custom CSS always win. Without Refraction or global fonts, the system font.
- **Theme Builder**: the theme declares `add_theme_support( 'refraction-theme-builder' )` and calls `refraction_theme_builder_header()` / `refraction_theme_builder_footer()` in `header.php` / `footer.php`, so Refraction's header and footer are printed by the theme in the right place and only once (no automatic takeover, no discarded buffer). Single, archive, search and 404 templates from the Theme Builder replace `index.php` through Refraction's own body template. Refraction's Canvas and Full Width page templates work as usual.
- **Fallback header and footer**: where Refraction has no header or footer for the page, a simple one: the custom logo or site name, the **Header menu**, the **Footer menu** and a copyright line.
- **Basic styles** (`assets/basic.css`): a readable width, spacing and form fields for posts, archives and pages *not* built with Refraction. Every rule is under `body.jr-basic`, a class added only on those pages, so it can never reach Refraction content.
- **Customizer** (Appearance > Customize > Just Refraction): **Show the theme header and footer** and **Basic styles for pages not built with Refraction**, both on by default. With both off the theme adds no visible markup or styles of its own at all.
- Supports: title tag, feed links, featured images, responsive embeds, wide alignment, custom logo, HTML5 markup, WooCommerce, two menus, threaded comments.

## Not yet

- Updates: the plugin's updater updates the plugin only; a new theme version is installed by uploading the new `just-refraction.zip` (Appearance > Themes > Add New > Upload, "Replace current with uploaded").
