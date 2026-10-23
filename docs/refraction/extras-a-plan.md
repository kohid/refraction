# Extras A plan (roadmap B2a)

Goal: Custom CSS, Custom Code, Display Conditions per element and Custom Attributes, original code, always on, offline.

Architecture: four small modules (`custom-css`, `custom-code`, `display-conditions`, `custom-attributes`) registered after `theme-builder`. Each keeps its logic in a pure class that needs no WordPress (`Css_Sanitizer`, `Attribute_Parser`, `Condition_Evaluator`) so `php scripts/test-extras-a.php` can test it. WordPress glue (controls, hooks, CPT) is thin and checked by `scripts/check-extras-a.mjs` in a browser.

Order, one commit each (test first for the pure classes):
1. Custom CSS: `Css_Sanitizer`; Advanced tab control + `refraction/element/parse_css`; page (`refraction/css-file/post/parse` via document setting) and site (kit) CSS; editor live preview by a style tag per element view.
2. Custom Code: CPT `refraction_snippet`, list/edit screens under Refraction > Custom Code, location/priority/type, theme-builder conditions engine for display, output at `wp_head`, `wp_body_open`, `wp_footer`; kill switch constant and `?refraction-safe-mode=1`.
3. Display Conditions: `Condition_Evaluator` (AND/OR, include/exclude), WP context, new core filter `refraction/frontend/should_print_element`, element cache bypass through `refraction/element/is_dynamic_content`, editor badge and toggle.
4. Custom Attributes: `Attribute_Parser` allowlist, applied on `refraction/element/after_add_attributes`.

Verification: `php scripts/test-extras-a.php`, `node scripts/check-extras-a.mjs` on fresh classic and block theme sites, then the older check scripts on fresh sites.
